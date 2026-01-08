/**
 * Perchwork Duplication - jscpd出力変換
 */

import crypto from 'crypto';
import path from 'path';
import type {
  JscpdOutput,
  JscpdDuplicate,
  DuplicationPair,
  DuplicationGroup,
  FileLocation,
  RefactoringSuggestion,
  RefactoringStrategy,
  DuplicationStats,
} from './types.js';

/**
 * jscpd出力をperchwork形式のペアに変換（内部用）
 */
export function transformJscpdOutput(
  jscpdOutput: JscpdOutput,
  targetDir: string
): DuplicationPair[] {
  return jscpdOutput.duplicates.map((dup) => {
    const id = generateDuplicateId(dup);
    const fileAPath = normalizeFilePath(dup.firstFile.name, targetDir);
    const fileBPath = normalizeFilePath(dup.secondFile.name, targetDir);
    const fragmentHash = generateFragmentHash(dup.fragment);

    return {
      id,
      lines: dup.lines,
      tokens: dup.tokens,
      fileA: {
        path: fileAPath,
        startLine: dup.firstFile.startLoc.line,
        endLine: dup.firstFile.endLoc.line,
      },
      fileB: {
        path: fileBPath,
        startLine: dup.secondFile.startLoc.line,
        endLine: dup.secondFile.endLoc.line,
      },
      fragment: dup.fragment,
      fragment_hash: fragmentHash,
    };
  });
}

/**
 * ペアをグループ化し、minLocations以上の箇所がある重複のみを返す
 */
export function groupDuplicates(
  pairs: DuplicationPair[],
  minLocations: number = 3
): DuplicationGroup[] {
  // fragment_hash でグループ化
  const groupMap = new Map<string, {
    pairs: DuplicationPair[];
    locations: Map<string, FileLocation>;
    fragment?: string;
    lines: number;
    tokens: number;
  }>();

  for (const pair of pairs) {
    const hash = pair.fragment_hash ?? generateFragmentHash(pair.fragment);

    if (!groupMap.has(hash)) {
      groupMap.set(hash, {
        pairs: [],
        locations: new Map(),
        fragment: pair.fragment,
        lines: pair.lines,
        tokens: pair.tokens,
      });
    }

    const group = groupMap.get(hash)!;
    group.pairs.push(pair);

    // ユニークな場所を収集（ファイル+行範囲でキー化）
    const locAKey = `${pair.fileA.path}:${pair.fileA.startLine}-${pair.fileA.endLine}`;
    const locBKey = `${pair.fileB.path}:${pair.fileB.startLine}-${pair.fileB.endLine}`;

    if (!group.locations.has(locAKey)) {
      group.locations.set(locAKey, pair.fileA);
    }
    if (!group.locations.has(locBKey)) {
      group.locations.set(locBKey, pair.fileB);
    }
  }

  // minLocations以上の箇所があるグループのみをフィルタリング
  const groups: DuplicationGroup[] = [];

  for (const [hash, group] of groupMap.entries()) {
    const locations = Array.from(group.locations.values());

    if (locations.length >= minLocations) {
      // 場所をファイルパス・行番号でソート
      locations.sort((a, b) => {
        const pathCompare = a.path.localeCompare(b.path);
        if (pathCompare !== 0) return pathCompare;
        return a.startLine - b.startLine;
      });

      groups.push({
        id: `grp_${hash.substring(0, 8)}`,
        fragment_hash: hash,
        lines: group.lines,
        tokens: group.tokens,
        locations,
        fragment: group.fragment,
      });
    }
  }

  // 場所数が多い順、次に行数が多い順でソート
  groups.sort((a, b) => {
    const locDiff = b.locations.length - a.locations.length;
    if (locDiff !== 0) return locDiff;
    return b.lines - a.lines;
  });

  return groups;
}

// ============================================================================
// 類似度計算・正規化
// ============================================================================

/**
 * コードを正規化（変数名・リテラルを統一）
 * 構造的な類似性を比較しやすくする
 */
export function normalizeCode(code: string, language: string = 'rust'): string {
  let normalized = code;

  // 1. コメントを除去
  normalized = normalized
    .replace(/\/\/.*$/gm, '')           // 行コメント
    .replace(/\/\*[\s\S]*?\*\//g, '');  // ブロックコメント

  // 2. 文字列リテラルを統一
  normalized = normalized.replace(/"[^"]*"/g, '"$STR"');
  normalized = normalized.replace(/'[^']*'/g, "'$CHAR'");

  // 3. 数値リテラルを統一
  normalized = normalized.replace(/\b\d+(\.\d+)?\b/g, '$NUM');

  // 4. 識別子を正規化（言語別）
  if (language === 'rust') {
    // Rust: snake_case の変数名を統一
    // ただし、キーワードや型名は保持
    const rustKeywords = new Set([
      'fn', 'let', 'mut', 'const', 'if', 'else', 'match', 'for', 'while', 'loop',
      'return', 'break', 'continue', 'struct', 'enum', 'impl', 'trait', 'pub',
      'use', 'mod', 'self', 'Self', 'super', 'crate', 'where', 'async', 'await',
      'move', 'ref', 'type', 'static', 'unsafe', 'extern', 'dyn', 'as', 'in',
      // 一般的な型
      'i8', 'i16', 'i32', 'i64', 'i128', 'isize',
      'u8', 'u16', 'u32', 'u64', 'u128', 'usize',
      'f32', 'f64', 'bool', 'char', 'str', 'String',
      'Vec', 'Option', 'Result', 'Some', 'None', 'Ok', 'Err',
      'Box', 'Rc', 'Arc', 'Cell', 'RefCell', 'HashMap', 'HashSet',
      'true', 'false',
    ]);

    // 識別子を$VARに置換（キーワード・型は除く）
    normalized = normalized.replace(/\b([a-z_][a-z0-9_]*)\b/gi, (match) => {
      if (rustKeywords.has(match)) return match;
      // PascalCase（型名）は保持
      if (/^[A-Z]/.test(match)) return match;
      return '$VAR';
    });
  } else if (language === 'typescript' || language === 'javascript') {
    const jsKeywords = new Set([
      'function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'do',
      'switch', 'case', 'break', 'continue', 'return', 'throw', 'try', 'catch',
      'finally', 'class', 'extends', 'new', 'this', 'super', 'import', 'export',
      'default', 'from', 'as', 'async', 'await', 'yield', 'typeof', 'instanceof',
      'void', 'null', 'undefined', 'true', 'false', 'in', 'of', 'delete',
      // TypeScript
      'interface', 'type', 'enum', 'namespace', 'module', 'declare', 'readonly',
      'private', 'public', 'protected', 'static', 'abstract', 'implements',
      // 型
      'string', 'number', 'boolean', 'object', 'any', 'unknown', 'never',
      'Array', 'Object', 'Function', 'Promise', 'Map', 'Set',
    ]);

    normalized = normalized.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g, (match) => {
      if (jsKeywords.has(match)) return match;
      return '$VAR';
    });
  }

  // 5. 空白を正規化
  normalized = normalized
    .replace(/\s+/g, ' ')
    .trim();

  return normalized;
}

/**
 * 正規化されたコードからトークンを抽出
 */
function tokenize(normalizedCode: string): string[] {
  // 空白とシンボルで分割
  return normalizedCode
    .split(/[\s{}()[\];,.<>:=+\-*/%&|^!~?@#]+/)
    .filter(t => t.length > 0);
}

/**
 * Jaccard類似度を計算
 * 2つのトークン集合の類似度（0.0〜1.0）
 */
export function calculateJaccardSimilarity(tokens1: string[], tokens2: string[]): number {
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * トークン列の順序を考慮した類似度（LCS比率）
 */
export function calculateSequenceSimilarity(tokens1: string[], tokens2: string[]): number {
  const m = tokens1.length;
  const n = tokens2.length;

  if (m === 0 || n === 0) return 0;

  // LCS（最長共通部分列）の長さを計算
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (tokens1[i - 1] === tokens2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const lcsLength = dp[m][n];
  // 平均長で割って正規化
  return (2 * lcsLength) / (m + n);
}

/**
 * 2つのフラグメント間の総合類似度を計算
 */
export function calculateFragmentSimilarity(
  fragment1: string | undefined,
  fragment2: string | undefined,
  language: string = 'rust'
): number {
  if (!fragment1 || !fragment2) return 0;

  const norm1 = normalizeCode(fragment1, language);
  const norm2 = normalizeCode(fragment2, language);

  const tokens1 = tokenize(norm1);
  const tokens2 = tokenize(norm2);

  // Jaccard類似度と順序類似度の加重平均
  const jaccard = calculateJaccardSimilarity(tokens1, tokens2);
  const sequence = calculateSequenceSimilarity(tokens1, tokens2);

  // 順序を重視（構造的な類似性が重要）
  return 0.3 * jaccard + 0.7 * sequence;
}

/**
 * 類似グループをマージ
 * similarityThreshold以上の類似度を持つグループを統合
 */
export function mergeSimilarGroups(
  groups: DuplicationGroup[],
  similarityThreshold: number = 0.85,
  language: string = 'rust'
): DuplicationGroup[] {
  if (groups.length === 0) return [];

  // 類似度行列を計算
  const n = groups.length;
  const similarities: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const sim = calculateFragmentSimilarity(
        groups[i].fragment,
        groups[j].fragment,
        language
      );
      similarities[i][j] = sim;
      similarities[j][i] = sim;
    }
  }

  // Union-Find でグループをマージ
  const parent = Array.from({ length: n }, (_, i) => i);

  function find(x: number): number {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }

  function union(x: number, y: number): void {
    const px = find(x);
    const py = find(y);
    if (px !== py) parent[px] = py;
  }

  // 類似度が閾値以上のペアを統合
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (similarities[i][j] >= similarityThreshold) {
        union(i, j);
      }
    }
  }

  // マージされたグループを構築
  const mergedMap = new Map<number, DuplicationGroup>();

  for (let i = 0; i < n; i++) {
    const root = find(i);
    const group = groups[i];

    if (!mergedMap.has(root)) {
      // 新しいマージグループを作成
      mergedMap.set(root, {
        id: group.id,
        fragment_hash: group.fragment_hash,
        lines: group.lines,
        tokens: group.tokens,
        locations: [...group.locations],
        fragment: group.fragment,
      });
    } else {
      // 既存グループにマージ
      const merged = mergedMap.get(root)!;

      // 場所を追加（重複除去）
      const existingKeys = new Set(
        merged.locations.map(loc => `${loc.path}:${loc.startLine}-${loc.endLine}`)
      );

      for (const loc of group.locations) {
        const key = `${loc.path}:${loc.startLine}-${loc.endLine}`;
        if (!existingKeys.has(key)) {
          merged.locations.push(loc);
          existingKeys.add(key);
        }
      }

      // 行数・トークン数は最大値を取る
      merged.lines = Math.max(merged.lines, group.lines);
      merged.tokens = Math.max(merged.tokens, group.tokens);

      // fragmentは長い方を採用
      if (group.fragment && (!merged.fragment || group.fragment.length > merged.fragment.length)) {
        merged.fragment = group.fragment;
      }
    }
  }

  // 結果を配列に変換
  const result = Array.from(mergedMap.values());

  // IDを再生成（マージされた場合）
  for (const group of result) {
    const hash = crypto
      .createHash('md5')
      .update(group.locations.map(l => `${l.path}:${l.startLine}`).join('|'))
      .digest('hex')
      .substring(0, 8);
    group.id = `grp_${hash}`;
    group.fragment_hash = hash;
  }

  // 場所数でソート
  result.sort((a, b) => {
    const locDiff = b.locations.length - a.locations.length;
    if (locDiff !== 0) return locDiff;
    return b.lines - a.lines;
  });

  return result;
}

// ============================================================================
// 既存の関数
// ============================================================================

/**
 * fragmentのハッシュを生成
 */
function generateFragmentHash(fragment: string | undefined): string {
  if (!fragment) return 'empty';

  // 空白を正規化してからハッシュ化（微妙な空白の違いを吸収）
  const normalized = fragment
    .replace(/\s+/g, ' ')
    .trim();

  return crypto
    .createHash('md5')
    .update(normalized)
    .digest('hex');
}

/**
 * 重複IDを生成
 */
function generateDuplicateId(dup: JscpdDuplicate): string {
  const hash = crypto
    .createHash('md5')
    .update(
      `${dup.firstFile.name}:${dup.firstFile.startLoc.line}-${dup.secondFile.name}:${dup.secondFile.startLoc.line}`
    )
    .digest('hex')
    .substring(0, 8);
  return `dup_${hash}`;
}

/**
 * ファイルパスを正規化（targetDirからの相対パスに変換）
 */
function normalizeFilePath(filePath: string, targetDir: string): string {
  // 絶対パスに正規化
  const absoluteFilePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(filePath);
  const absoluteTargetDir = path.resolve(targetDir).replace(/\/+$/, '');

  // targetDir からの相対パスを計算
  if (absoluteFilePath.startsWith(absoluteTargetDir + '/')) {
    return absoluteFilePath.substring(absoluteTargetDir.length + 1);
  }

  // フォールバック: path.relative を使用
  return path.relative(absoluteTargetDir, absoluteFilePath);
}

/**
 * リファクタリング提案を生成（グループ用）
 */
export function generateRefactoringSuggestion(
  group: DuplicationGroup,
  language: string
): RefactoringSuggestion {
  let strategy: RefactoringStrategy;
  let description: string;
  const locationCount = group.locations.length;

  if (group.lines < 10) {
    strategy = 'extract_function';
    description = `${group.lines}行の重複コード（${locationCount}箇所）を共通関数に抽出`;
  } else if (group.lines < 30) {
    strategy = 'parameterize';
    description = `類似ロジック（${group.lines}行、${locationCount}箇所）をパラメータ化して統一`;
  } else {
    strategy = language === 'rust' ? 'extract_trait' : 'extract_function';
    description =
      language === 'rust'
        ? `大きな重複ブロック（${group.lines}行、${locationCount}箇所）をトレイトで抽象化`
        : `大きな重複ブロック（${group.lines}行、${locationCount}箇所）をモジュール化`;
  }

  const prompt = generateRefactoringPrompt(group, strategy, language);

  return { strategy, description, prompt };
}

/**
 * リファクタリングプロンプトを生成（グループ用）
 */
function generateRefactoringPrompt(
  group: DuplicationGroup,
  strategy: RefactoringStrategy,
  language: string
): string {
  const locationList = group.locations
    .map((loc) => `- ${loc.path}:${loc.startLine}-${loc.endLine}`)
    .join('\n');

  const strategyDescriptions: Record<RefactoringStrategy, string> = {
    extract_function: '共通関数を抽出し、すべての箇所から呼び出すようにリファクタリング',
    extract_trait: 'トレイトを定義し、共通のロジックをデフォルト実装として提供',
    use_macro: 'マクロを使って重複コードを抽象化',
    parameterize: '差分をパラメータとして受け取り、共通ロジックを統一',
  };

  return `以下の${group.lines}行の類似コード（${group.locations.length}箇所）をリファクタリングしてください。

## 類似箇所（${group.locations.length}箇所）
${locationList}

## 推奨戦略: ${strategy}
${strategyDescriptions[strategy]}

## タスク
1. すべての箇所を読み込んで類似部分を確認
2. 変数名やリテラルの差異を分析し、パラメータ化できる箇所を特定
3. 共通ロジックを抽出し、適切な場所（${language === 'rust' ? 'utilモジュールやトレイト' : 'utilモジュール'}）に配置
4. すべての箇所からの呼び出しを統一
5. テストが通ることを確認（cargo test または npm run test）

## 注意点
- 変数名の差異はパラメータ化で吸収
- 抽出先の命名は元のコードの意図を反映させる
- 必要に応じて型パラメータやジェネリクスを活用
- ${group.locations.length}箇所すべてを修正すること
- 変更後は lint と型チェックを実行`;
}

/**
 * 統計情報を計算（グループ用）
 */
export function calculateStats(
  groups: DuplicationGroup[],
  totalFiles: number,
  totalLines: number
): DuplicationStats {
  // 各グループの重複行数 × 場所数で計算
  const totalDuplicatedLines = groups.reduce(
    (sum, g) => sum + g.lines * g.locations.length,
    0
  );
  const duplicationPercentage =
    totalLines > 0 ? (totalDuplicatedLines / totalLines) * 100 : 0;

  return {
    total_files: totalFiles,
    total_duplicates: groups.length,
    total_duplicated_lines: totalDuplicatedLines,
    duplication_percentage: Math.round(duplicationPercentage * 100) / 100,
  };
}
