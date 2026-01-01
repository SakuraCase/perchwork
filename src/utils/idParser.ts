/**
 * ID解析ユーティリティ
 *
 * ItemId（例: "path/to/file.rs::StructName::method_name::method"）から
 * 各種情報を抽出するための関数群。
 *
 * 注: 内部実装は文字列操作のため、ItemId型と互換性のあるstring型を受け入れる
 */

/**
 * IDの構成要素
 * 例: "domain/core/battle.rs::BattleLoop::run::method"
 * - file: "domain/core/battle.rs"
 * - segments: ["BattleLoop", "run", "method"]
 */
export interface IdParts {
  file: string;
  segments: string[];
}

/**
 * IDをファイル部分とセグメント部分に分割
 */
export function parseId(id: string): IdParts {
  const firstSplit = id.indexOf('::');
  if (firstSplit === -1) {
    return { file: id, segments: [] };
  }
  const file = id.substring(0, firstSplit);
  const rest = id.substring(firstSplit + 2);
  const segments = rest.split('::').filter(Boolean);
  return { file, segments };
}

/**
 * IDから最後のセグメント（型/ラベル）を抽出
 * 例: "domain::core::BattleLoop::run::method" -> "method"
 */
export function getIdLabel(id: string): string {
  const parts = id.split('::');
  return parts[parts.length - 1] || id;
}

/**
 * IDから名前部分（最後から2番目のセグメント）を抽出
 * 例: "domain::core::BattleLoop::run::method" -> "run"
 * 例: "file.rs::test_function::test" -> "test_function"
 */
export function getIdName(id: string): string {
  const parts = id.split('::');
  if (parts.length >= 2) {
    return parts[parts.length - 2];
  }
  return id;
}

/**
 * IDからファイルパスを抽出
 * 例: "domain/core/battle.rs::BattleLoop::run::method" -> "domain/core/battle.rs"
 */
export function getIdFile(id: string): string {
  const firstSplit = id.indexOf('::');
  if (firstSplit === -1) {
    return id;
  }
  return id.substring(0, firstSplit);
}

/**
 * IDから型情報を推測（フォールバック用）
 * 大文字で始まる場合はstruct、それ以外はfn
 */
export function inferTypeFromId(
  id: string
): 'fn' | 'struct' | 'enum' | 'trait' | 'mod' | 'const' | 'type' | 'method' | 'impl' {
  const label = getIdLabel(id);
  // 明示的な型情報があればそれを使用
  if (label === 'fn') return 'fn';
  if (label === 'struct') return 'struct';
  if (label === 'enum') return 'enum';
  if (label === 'trait') return 'trait';
  if (label === 'method') return 'method';
  if (label === 'impl') return 'impl';
  if (label === 'mod') return 'mod';
  if (label === 'const') return 'const';
  if (label === 'type') return 'type';

  // 名前から推測
  const name = getIdName(id);
  if (/^[A-Z]/.test(name)) {
    return 'struct';
  }
  return 'fn';
}

/**
 * テストIDかどうかを判定
 */
export function isTestId(id: string): boolean {
  return id.endsWith('::test') || id.includes('::test_');
}
