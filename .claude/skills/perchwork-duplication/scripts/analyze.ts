#!/usr/bin/env node
/**
 * Perchwork Duplication Analyzer
 *
 * jscpd を使ってコードの重複を検出し、構造化JSONを生成する
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import type {
  Config,
  JscpdOutput,
  DuplicationPair,
  DuplicationGroup,
  DuplicationIndex,
} from './types.js';
import {
  transformJscpdOutput,
  groupDuplicates,
  mergeSimilarGroups,
  generateRefactoringSuggestion,
  calculateStats,
} from './transformer.js';

const execAsync = promisify(exec);

/** 言語ごとのファイル拡張子 */
const LANGUAGE_EXTENSIONS: Record<string, string[]> = {
  rust: ['.rs'],
  typescript: ['.ts', '.tsx'],
  javascript: ['.js', '.jsx'],
};

/**
 * メイン処理クラス
 */
class DuplicationAnalyzer {
  private config!: Config;
  private configPath!: string;
  private targetDir!: string;
  private language = 'rust';
  private outputDir!: string;
  private rawOutputDir!: string;
  private minLines = 5;
  private minTokens = 50;
  private minLocations = 3;
  private similarityThreshold = 0.85;

  /**
   * 設定ファイルを読み込む
   */
  private async loadConfig(configPath: string): Promise<void> {
    console.log(`設定ファイルを読み込んでいます: ${configPath}`);
    this.configPath = path.resolve(configPath);

    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      this.config = JSON.parse(configContent) as Config;

      const configDir = path.dirname(path.resolve(configPath));
      this.targetDir = path.resolve(configDir, this.config.target_dir);
      this.outputDir = path.resolve(configDir, 'public/data/duplication');
      this.rawOutputDir = path.join(this.outputDir, 'raw');

      if (this.config.language) {
        this.language = this.config.language;
      }

      console.log(`対象ディレクトリ: ${this.targetDir}`);
      console.log(`出力先: ${this.outputDir}`);
      console.log(`Phase 1出力先: ${this.rawOutputDir}`);
    } catch (error) {
      throw new Error(
        `設定ファイルの読み込みに失敗しました: ${configPath} - ${error}`
      );
    }
  }

  /**
   * jscpd がインストールされているか確認
   */
  private async checkJscpdInstalled(): Promise<string> {
    // ローカルの node_modules を優先
    const localPath = path.join(
      path.dirname(this.configPath),
      '.claude/skills/perchwork-duplication/scripts/node_modules/.bin/jscpd'
    );

    try {
      await fs.access(localPath);
      return localPath;
    } catch {
      // グローバルインストールを確認
      try {
        await execAsync('jscpd --version');
        return 'jscpd';
      } catch {
        throw new Error(
          'jscpd がインストールされていません。\n' +
            '以下のコマンドでインストールしてください:\n' +
            '  npm install -g jscpd\n' +
            'または:\n' +
            '  cd .claude/skills/perchwork-duplication/scripts && npm install'
        );
      }
    }
  }

  /**
   * 対象ファイルを収集
   */
  private async collectFiles(): Promise<string[]> {
    const extensions = LANGUAGE_EXTENSIONS[this.language] ?? ['.rs'];
    const files: string[] = [];

    const walk = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(this.targetDir, fullPath);

        if (this.shouldExclude(relativePath)) {
          continue;
        }

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (
          entry.isFile() &&
          extensions.some((ext) => entry.name.endsWith(ext))
        ) {
          files.push(fullPath);
        }
      }
    };

    await walk(this.targetDir);
    return files.sort();
  }

  /**
   * パスを除外すべきか判定
   */
  private shouldExclude(relativePath: string): boolean {
    const defaultExcludes = [
      'node_modules',
      'target',
      'dist',
      '.git',
      'vendor',
    ];

    for (const pattern of defaultExcludes) {
      if (relativePath.includes(pattern)) {
        return true;
      }
    }

    if (this.config.exclude) {
      for (const pattern of this.config.exclude) {
        if (relativePath.includes(pattern)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * ファイルの総行数をカウント
   */
  private async countTotalLines(files: string[]): Promise<number> {
    let total = 0;
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        total += content.split('\n').length;
      } catch {
        // ファイル読み込みエラーは無視
      }
    }
    return total;
  }

  /**
   * jscpd を実行して重複を検出
   */
  private async runJscpd(jscpdPath: string): Promise<JscpdOutput> {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jscpd-'));

    try {
      // jscpd 実行
      const formatMap: Record<string, string> = {
        rust: 'rust',
        typescript: 'typescript',
        javascript: 'javascript',
      };
      const format = formatMap[this.language] ?? 'rust';

      const ignorePatterns = [
        '**/node_modules/**',
        '**/target/**',
        '**/dist/**',
        '**/.git/**',
        ...(this.config.exclude ?? []),
      ];

      const ignoreArgs = ignorePatterns
        .map((p) => `--ignore "${p}"`)
        .join(' ');

      const cmd = `"${jscpdPath}" "${this.targetDir}" ` +
        `--reporters json ` +
        `--output "${tmpDir}" ` +
        `--format "${format}" ` +
        `--min-lines ${this.minLines} ` +
        `--min-tokens ${this.minTokens} ` +
        ignoreArgs;

      console.log('jscpd を実行しています...');

      try {
        await execAsync(cmd, { maxBuffer: 50 * 1024 * 1024 });
      } catch (error: unknown) {
        // jscpd は重複発見時に非ゼロ終了することがある
        // エラーでも出力ファイルが生成されていれば続行
        const execError = error as { code?: number };
        if (execError.code !== undefined && execError.code > 0) {
          // 終了コードが 0 以外でも続行を試みる
        } else {
          throw error;
        }
      }

      // 結果ファイルを読み込む
      const resultPath = path.join(tmpDir, 'jscpd-report.json');
      try {
        const resultContent = await fs.readFile(resultPath, 'utf-8');
        return JSON.parse(resultContent) as JscpdOutput;
      } catch {
        // 結果ファイルが存在しない場合は空の結果を返す
        console.log('重複は検出されませんでした');
        return {
          duplicates: [],
          statistics: {
            detectionDate: new Date().toISOString(),
            formats: {},
            total: {
              lines: 0,
              sources: 0,
              clones: 0,
              duplicatedLines: 0,
              percentage: 0,
            },
          },
        };
      }
    } finally {
      // 一時ディレクトリを削除
      await fs.rm(tmpDir, { recursive: true }).catch(() => {});
    }
  }

  /**
   * 出力ディレクトリを準備
   */
  private async prepareOutputDir(): Promise<void> {
    try {
      await fs.rm(this.outputDir, { recursive: true });
    } catch {
      // ディレクトリが存在しない場合は無視
    }
    // Phase 2/3 出力先
    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.mkdir(path.join(this.outputDir, 'duplicates'), { recursive: true });
    // Phase 1 出力先
    await fs.mkdir(this.rawOutputDir, { recursive: true });
    await fs.mkdir(path.join(this.rawOutputDir, 'pairs'), { recursive: true });
  }

  /**
   * Phase 1: 生ペアデータを書き出す
   */
  private async writeRawPairs(
    pairs: DuplicationPair[],
    jscpdOutput: JscpdOutput,
    totalFiles: number
  ): Promise<void> {
    console.log('Phase 1: 生データを書き出しています...');

    // 各ペアを個別ファイルに書き出す
    for (const pair of pairs) {
      const outputPath = path.join(this.rawOutputDir, 'pairs', `${pair.id}.json`);
      await fs.writeFile(outputPath, JSON.stringify(pair, null, 2));
    }

    // Phase 1 インデックスファイル
    const rawIndex = {
      version: '1.0.0',
      phase: 1,
      generated_at: new Date().toISOString(),
      target_dir: this.targetDir,
      config: {
        min_lines: this.minLines,
        min_tokens: this.minTokens,
      },
      stats: {
        total_files: totalFiles,
        total_pairs: pairs.length,
        total_duplicated_lines: jscpdOutput.statistics.total.duplicatedLines,
        duplication_percentage: jscpdOutput.statistics.total.percentage,
      },
      pairs: pairs.map((p) => ({
        id: p.id,
        lines: p.lines,
        tokens: p.tokens,
        fileA: p.fileA.path,
        fileB: p.fileB.path,
      })),
    };

    await fs.writeFile(
      path.join(this.rawOutputDir, 'index.json'),
      JSON.stringify(rawIndex, null, 2)
    );

    console.log(`  ペア数: ${pairs.length}`);
  }

  /**
   * Phase 2: グループ化結果を書き出す
   */
  private async writeResults(
    groups: DuplicationGroup[],
    totalFiles: number,
    totalLines: number
  ): Promise<void> {
    console.log('Phase 2: グループ化結果を書き出しています...');

    // 各重複グループにリファクタリング提案を追加して書き出す
    for (const group of groups) {
      group.refactoring_suggestion = generateRefactoringSuggestion(
        group,
        this.language
      );

      const outputPath = path.join(
        this.outputDir,
        'duplicates',
        `${group.id}.json`
      );
      await fs.writeFile(outputPath, JSON.stringify(group, null, 2));
    }

    // 統計計算
    const stats = calculateStats(groups, totalFiles, totalLines);

    // インデックスファイルを作成
    const index: DuplicationIndex = {
      version: '2.0.0',
      phase: 2,
      generated_at: new Date().toISOString(),
      target_dir: this.targetDir,
      config: {
        min_lines: this.minLines,
        min_tokens: this.minTokens,
        min_locations: this.minLocations,
        similarity_threshold: this.similarityThreshold,
      },
      stats,
      duplicates: groups.map((g) => ({
        id: g.id,
        lines: g.lines,
        location_count: g.locations.length,
        files: [...new Set(g.locations.map((loc) => loc.path))],
      })),
    };

    await fs.writeFile(
      path.join(this.outputDir, 'index.json'),
      JSON.stringify(index, null, 2)
    );

    console.log(`  重複グループ数: ${stats.total_duplicates}`);
    console.log(`  重複行数: ${stats.total_duplicated_lines}`);
    console.log(`  重複率: ${stats.duplication_percentage}%`);
  }

  /**
   * 解析を実行（常に全ファイル解析）
   */
  async analyze(
    configPath: string,
    options: {
      minLines?: number;
      minTokens?: number;
      minLocations?: number;
      similarityThreshold?: number;
    }
  ): Promise<void> {
    console.log('=== Perchwork Duplication Analyzer 開始 ===');

    try {
      // 設定読み込み
      await this.loadConfig(configPath);

      // オプションで上書き
      if (options.minLines) {
        this.minLines = options.minLines;
      }
      if (options.minTokens) {
        this.minTokens = options.minTokens;
      }
      if (options.minLocations) {
        this.minLocations = options.minLocations;
      }
      if (options.similarityThreshold !== undefined) {
        this.similarityThreshold = options.similarityThreshold;
      }

      console.log(`最小重複箇所数: ${this.minLocations}`);
      console.log(`類似度閾値: ${(this.similarityThreshold * 100).toFixed(0)}%`);

      // jscpd のチェック
      const jscpdPath = await this.checkJscpdInstalled();

      // 全ファイル解析を実行
      await this.analyzeAll(jscpdPath);

      console.log('=== Perchwork Duplication Analyzer 完了 ===');
    } catch (error) {
      console.error('エラーが発生しました:', error);
      throw error;
    }
  }

  /**
   * 全ファイル解析
   */
  private async analyzeAll(jscpdPath: string): Promise<void> {
    // 対象ファイル収集
    console.log('対象ファイルを収集しています...');
    const files = await this.collectFiles();
    console.log(`  ${files.length} ファイルを検出`);

    if (files.length === 0) {
      console.warn('対象ファイルが見つかりませんでした');
      return;
    }

    // 総行数をカウント
    const totalLines = await this.countTotalLines(files);

    // 出力ディレクトリ準備
    await this.prepareOutputDir();

    // Phase 1: jscpd 実行
    const jscpdOutput = await this.runJscpd(jscpdPath);

    // ペアに変換
    const pairs = transformJscpdOutput(jscpdOutput, this.targetDir);
    console.log(`  jscpd で ${pairs.length} ペアを検出`);

    // Phase 1: 生データを書き出す
    await this.writeRawPairs(pairs, jscpdOutput, files.length);

    // Phase 2: まずminLocations=1でグループ化（すべてのグループを取得）
    const allGroups = groupDuplicates(pairs, 1);
    console.log(`  全グループ数: ${allGroups.length}`);

    // 類似グループをマージ（similarityThreshold以上の類似度）
    const mergedGroups = mergeSimilarGroups(allGroups, this.similarityThreshold, this.language);
    if (mergedGroups.length !== allGroups.length) {
      console.log(`  類似グループをマージ: ${allGroups.length} → ${mergedGroups.length} グループ`);
    }

    // minLocations以上の箇所があるグループのみをフィルタリング
    const filteredGroups = mergedGroups.filter(g => g.locations.length >= this.minLocations);
    console.log(`  ${this.minLocations}箇所以上の重複: ${filteredGroups.length} グループ`);

    // 結果を書き出す
    await this.writeResults(filteredGroups, files.length, totalLines);
  }
}

/**
 * コマンドライン引数をパース
 */
function parseArgs(): {
  configPath: string;
  minLines?: number;
  minTokens?: number;
  minLocations?: number;
  similarityThreshold?: number;
} {
  const args = process.argv.slice(2);

  let configPath: string | null = null;
  let minLines: number | undefined;
  let minTokens: number | undefined;
  let minLocations: number | undefined;
  let similarityThreshold: number | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config' && i + 1 < args.length) {
      configPath = args[i + 1];
      i++;
    } else if (args[i] === '--min-lines' && i + 1 < args.length) {
      minLines = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--min-tokens' && i + 1 < args.length) {
      minTokens = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--min-locations' && i + 1 < args.length) {
      minLocations = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--similarity-threshold' && i + 1 < args.length) {
      similarityThreshold = parseFloat(args[i + 1]);
      i++;
    }
  }

  if (!configPath) {
    console.error(
      '使い方: node analyze.js --config <config.json> [--min-lines <n>] [--min-tokens <n>] [--min-locations <n>] [--similarity-threshold <0.0-1.0>]'
    );
    process.exit(1);
  }

  return { configPath, minLines, minTokens, minLocations, similarityThreshold };
}

/**
 * エントリーポイント
 */
async function main() {
  const { configPath, minLines, minTokens, minLocations, similarityThreshold } = parseArgs();
  const analyzer = new DuplicationAnalyzer();
  await analyzer.analyze(configPath, { minLines, minTokens, minLocations, similarityThreshold });
}

main().catch((error) => {
  console.error('致命的なエラー:', error);
  process.exit(1);
});
