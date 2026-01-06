#!/usr/bin/env node
/**
 * Perchwork Complexity Analyzer
 *
 * rust-code-analysis-cli を使ってコードの複雑度メトリクスを解析し、
 * 構造化JSONを生成する
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { Config, FileMetrics, ComplexityIndex, RcaOutput } from './types.js';
import { transformRcaOutput, calculateStats } from './transformer.js';

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
class ComplexityAnalyzer {
  private config!: Config;
  private configPath!: string;
  private targetDir!: string;
  private language = 'rust';
  private outputDir!: string;

  /**
   * 設定ファイルを読み込む
   */
  private async loadConfig(configPath: string): Promise<void> {
    console.log(`設定ファイルを読み込んでいます: ${configPath}`);
    this.configPath = path.resolve(configPath);

    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      this.config = JSON.parse(configContent) as Config;

      // 相対パスを絶対パスに変換（設定ファイルの場所を基準とする）
      const configDir = path.dirname(path.resolve(configPath));
      this.targetDir = path.resolve(configDir, this.config.target_dir);

      // 出力先を設定
      this.outputDir = path.resolve(configDir, 'public/data/complexity');

      console.log(`対象ディレクトリ: ${this.targetDir}`);
      console.log(`出力先: ${this.outputDir}`);
    } catch (error) {
      throw new Error(`設定ファイルの読み込みに失敗しました: ${configPath} - ${error}`);
    }
  }

  /**
   * rust-code-analysis-cli がインストールされているか確認
   */
  private async checkRcaInstalled(): Promise<void> {
    try {
      await execAsync('rust-code-analysis-cli --version');
    } catch {
      throw new Error(
        'rust-code-analysis-cli がインストールされていません。\n' +
          '以下のコマンドでインストールしてください:\n' +
          '  cargo install rust-code-analysis-cli'
      );
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

        // 除外パターンのチェック
        const relativePath = path.relative(this.targetDir, fullPath);
        if (this.shouldExclude(relativePath)) {
          continue;
        }

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
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
    // デフォルトの除外パターン
    const defaultExcludes = ['node_modules', 'target', 'dist', '.git', 'vendor'];

    for (const pattern of defaultExcludes) {
      if (relativePath.includes(pattern)) {
        return true;
      }
    }

    // 設定の除外パターン
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
   * ファイルを解析
   */
  private async analyzeFile(filePath: string): Promise<FileMetrics | null> {
    try {
      // rust-code-analysis-cli を実行
      const { stdout } = await execAsync(
        `rust-code-analysis-cli -p "${filePath}" -O json --metrics`,
        { maxBuffer: 50 * 1024 * 1024 } // 50MB
      );

      // 出力をパース
      const rcaOutput: RcaOutput = JSON.parse(stdout);

      // 相対パスを計算
      const relativePath = path.relative(this.targetDir, filePath);

      // 変換
      return transformRcaOutput(rcaOutput, filePath, relativePath, this.language);
    } catch (error) {
      console.error(`  解析エラー: ${filePath} - ${error}`);
      return null;
    }
  }

  /**
   * 出力ディレクトリを準備
   */
  private async prepareOutputDir(): Promise<void> {
    // 既存のディレクトリを削除
    try {
      await fs.rm(this.outputDir, { recursive: true });
    } catch {
      // ディレクトリが存在しない場合は無視
    }

    // ディレクトリを作成
    await fs.mkdir(this.outputDir, { recursive: true });
  }

  /**
   * 結果を書き出す
   */
  private async writeResults(files: FileMetrics[]): Promise<void> {
    console.log('結果を書き出しています...');

    // 各ファイルのメトリクスを書き出す（階層構造）
    for (const file of files) {
      const jsonPath = file.relative_path.replace(/\.[^.]+$/, '.json');
      const outputPath = path.join(this.outputDir, jsonPath);
      // サブディレクトリを作成
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, JSON.stringify(file, null, 2));
    }

    // インデックスファイルを作成
    const stats = calculateStats(files);

    const index: ComplexityIndex = {
      version: '1.0.0',
      generated_at: new Date().toISOString(),
      target_dir: this.targetDir,
      language: this.language,
      stats,
      files: files.map((f) => ({
        path: f.path,
        relative_path: f.relative_path,
        cc_avg: f.cc_avg,
        cognitive_avg: f.cognitive_avg,
        function_count: f.functions.length,
        loc: f.loc.total,
        mi: f.mi,
      })),
    };

    await fs.writeFile(path.join(this.outputDir, 'index.json'), JSON.stringify(index, null, 2));

    console.log(`  ファイル数: ${files.length}`);
    console.log(`  関数数: ${stats.total_functions}`);
    console.log(`  総行数: ${stats.total_loc}`);
    console.log(`  平均CC: ${stats.avg_cc.toFixed(2)}`);
    console.log(`  平均Cognitive: ${stats.avg_cognitive.toFixed(2)}`);

    if (stats.warnings.high_cc > 0) {
      console.log(`  警告: CC > 10 の関数: ${stats.warnings.high_cc}`);
    }
    if (stats.warnings.high_cognitive > 0) {
      console.log(`  警告: Cognitive > 15 の関数: ${stats.warnings.high_cognitive}`);
    }
  }

  /**
   * 解析を実行
   */
  async analyze(configPath: string, options: { all?: boolean; target?: string; lang?: string; files?: string[] }): Promise<void> {
    console.log('=== Perchwork Complexity Analyzer 開始 ===');

    try {
      // rust-code-analysis-cli のチェック
      await this.checkRcaInstalled();

      // 設定読み込み
      await this.loadConfig(configPath);

      // オプションで上書き
      if (options.target) {
        this.targetDir = path.resolve(options.target);
      }
      if (options.lang) {
        this.language = options.lang;
      }

      if (options.all) {
        console.log('全実行モード');
        await this.analyzeAll();
      } else {
        console.log('差分実行モード');
        await this.analyzeIncremental(options.files ?? []);
      }

      console.log('=== Perchwork Complexity Analyzer 完了 ===');
    } catch (error) {
      console.error('エラーが発生しました:', error);
      throw error;
    }
  }

  /**
   * 全ファイル解析（従来の動作）
   */
  private async analyzeAll(): Promise<void> {
    // 対象ファイル収集
    console.log('対象ファイルを収集しています...');
    const files = await this.collectFiles();
    console.log(`  ${files.length} ファイルを検出`);

    if (files.length === 0) {
      console.warn('対象ファイルが見つかりませんでした');
      return;
    }

    // 出力ディレクトリ準備（全削除して再作成）
    await this.prepareOutputDir();

    // 各ファイルを解析
    console.log('ファイルを解析しています...');
    const results: FileMetrics[] = [];
    let processed = 0;

    for (const file of files) {
      const metrics = await this.analyzeFile(file);
      if (metrics) {
        results.push(metrics);
      }
      processed++;

      // 進捗表示（10ファイルごと）
      if (processed % 10 === 0 || processed === files.length) {
        console.log(`  進捗: ${processed}/${files.length}`);
      }
    }

    // 結果を書き出す
    await this.writeResults(results);
  }

  /**
   * 差分解析（指定ファイルのみ解析）
   */
  private async analyzeIncremental(changedFiles: string[]): Promise<void> {
    // 出力ディレクトリが存在しない場合は作成
    await fs.mkdir(this.outputDir, { recursive: true });

    // 変更ファイルを解析
    if (changedFiles.length > 0) {
      console.log(`変更ファイル: ${changedFiles.length} 件`);
      let processed = 0;

      for (const changedFile of changedFiles) {
        const absolutePath = path.resolve(this.targetDir, changedFile);
        const metrics = await this.analyzeFile(absolutePath);
        if (metrics) {
          // 個別ファイルを書き出す（階層構造）
          const jsonPath = metrics.relative_path.replace(/\.[^.]+$/, '.json');
          const outputPath = path.join(this.outputDir, jsonPath);
          // サブディレクトリを作成
          await fs.mkdir(path.dirname(outputPath), { recursive: true });
          await fs.writeFile(outputPath, JSON.stringify(metrics, null, 2));
        }
        processed++;

        if (processed % 10 === 0 || processed === changedFiles.length) {
          console.log(`  進捗: ${processed}/${changedFiles.length}`);
        }
      }
    }

    // 全ファイルから index.json を再生成
    await this.regenerateIndex();
  }

  /**
   * 既存の結果ファイルから index.json を再生成
   */
  private async regenerateIndex(): Promise<void> {
    console.log('index.json を再生成しています...');

    const allFiles: FileMetrics[] = [];

    // ディレクトリを再帰的に走査してJSONファイルを収集
    const walkDir = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await walkDir(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.json') && entry.name !== 'index.json') {
            const content = await fs.readFile(fullPath, 'utf-8');
            allFiles.push(JSON.parse(content) as FileMetrics);
          }
        }
      } catch {
        // ディレクトリが存在しない場合は無視
      }
    };

    await walkDir(this.outputDir);

    // 結果を書き出す（index.json のみ更新）
    await this.writeIndexOnly(allFiles);
  }

  /**
   * index.json のみを書き出す
   */
  private async writeIndexOnly(files: FileMetrics[]): Promise<void> {
    const stats = calculateStats(files);

    const index: ComplexityIndex = {
      version: '1.0.0',
      generated_at: new Date().toISOString(),
      target_dir: this.targetDir,
      language: this.language,
      stats,
      files: files.map((f) => ({
        path: f.path,
        relative_path: f.relative_path,
        cc_avg: f.cc_avg,
        cognitive_avg: f.cognitive_avg,
        function_count: f.functions.length,
        loc: f.loc.total,
        mi: f.mi,
      })),
    };

    await fs.writeFile(path.join(this.outputDir, 'index.json'), JSON.stringify(index, null, 2));

    console.log(`  ファイル数: ${files.length}`);
    console.log(`  関数数: ${stats.total_functions}`);
    console.log(`  総行数: ${stats.total_loc}`);
  }
}

/**
 * コマンドライン引数をパース
 */
function parseArgs(): { configPath: string; all: boolean; target?: string; lang?: string; files?: string[] } {
  const args = process.argv.slice(2);

  let configPath: string | null = null;
  let all = false;
  let target: string | undefined;
  let lang: string | undefined;
  let files: string[] | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config' && i + 1 < args.length) {
      configPath = args[i + 1];
      i++;
    } else if (args[i] === '--all') {
      all = true;
    } else if (args[i] === '--target' && i + 1 < args.length) {
      target = args[i + 1];
      i++;
    } else if (args[i] === '--lang' && i + 1 < args.length) {
      lang = args[i + 1];
      i++;
    } else if (args[i] === '--files' && i + 1 < args.length) {
      files = args[i + 1].split(',').map((f) => f.trim()).filter((f) => f.length > 0);
      i++;
    }
  }

  if (!configPath) {
    console.error('使い方: node analyze.js --config <config.json> --all | --files <file1,file2> [--target <path>] [--lang <rust|typescript>]');
    process.exit(1);
  }

  if (!all && !files) {
    console.error('エラー: --all または --files を指定してください');
    console.error('使い方: node analyze.js --config <config.json> --all | --files <file1,file2> [--target <path>] [--lang <rust|typescript>]');
    process.exit(1);
  }

  return { configPath, all, target, lang, files };
}

/**
 * エントリーポイント
 */
async function main() {
  const { configPath, all, target, lang, files } = parseArgs();
  const analyzer = new ComplexityAnalyzer();
  await analyzer.analyze(configPath, { all, target, lang, files });
}

main().catch((error) => {
  console.error('致命的なエラー:', error);
  process.exit(1);
});
