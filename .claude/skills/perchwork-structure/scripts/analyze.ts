#!/usr/bin/env node
/**
 * Perchwork Analyzer - Rust コード解析スクリプト
 *
 * tree-sitter のネイティブバインディングを使って Rust コードを解析し、構造化JSONを生成する
 */

import fs from 'fs/promises';
import path from 'path';
import type { Config, FileAnalysis, CallEdge } from './types/index.js';
import { TypeRegistry, FileCollector, EdgeResolver } from './core/index.js';
import { StructureWriter, DebugWriter } from './output/index.js';
import { createLanguageAnalyzer } from './languages/index.js';

/**
 * 解析オプション
 */
interface AnalyzeOptions {
  all?: boolean;
  files?: string[];
}

/**
 * メイン処理クラス
 */
class PerchworkAnalyzer {
  private config!: Config;
  private configPath!: string;
  private registry = new TypeRegistry();
  private baseDir!: string;

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
      this.config.target_dir = path.resolve(configDir, this.config.target_dir);
      this.baseDir = path.join(configDir, 'public', 'data', 'structure');

      console.log(`対象ディレクトリ: ${this.config.target_dir}`);
    } catch (error) {
      throw new Error(`設定ファイルの読み込みに失敗しました: ${configPath} - ${error}`);
    }
  }

  /**
   * 解析を実行する（2パス解析）
   */
  async analyze(configPath: string, options: AnalyzeOptions = {}): Promise<void> {
    console.log('=== Perchwork Analyzer 開始 ===');

    try {
      // 設定ファイル読み込み
      await this.loadConfig(configPath);

      if (options.all) {
        console.log('全実行モード');
        await this.analyzeAll();
      } else {
        console.log('差分実行モード');
        await this.analyzeIncremental(options.files ?? []);
      }

      console.log('=== Perchwork Analyzer 完了 ===');
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
    const fileCollector = new FileCollector(this.config);
    const targetFiles = await fileCollector.collectTargetFiles();

    if (targetFiles.length === 0) {
      console.warn('対象ファイルが見つかりませんでした');
      return;
    }

    // 解析実行
    const { fileAnalyses, resolvedEdges } = await this.runAnalysis(targetFiles);

    // 構造化JSON出力
    const structureWriter = new StructureWriter(this.configPath, this.config.target_dir);
    await structureWriter.write(fileAnalyses, resolvedEdges);

    // デバッグ出力
    const debugWriter = new DebugWriter(this.configPath);
    await debugWriter.write(fileAnalyses, this.registry);
  }

  /**
   * 差分解析（指定ファイルのみ解析）
   */
  private async analyzeIncremental(changedFiles: string[]): Promise<void> {
    // 既存のJSONファイルを読み込み（変更ファイルを除く）
    const existingAnalyses = await this.loadExistingAnalyses(changedFiles.map(f => f.replace(/\.rs$/, '.json')));

    // 変更ファイルを解析
    let changedAnalyses: FileAnalysis[] = [];
    if (changedFiles.length > 0) {
      console.log(`変更ファイル: ${changedFiles.length} 件`);
      const absolutePaths = changedFiles.map(f => path.resolve(this.config.target_dir, f));
      const result = await this.runAnalysis(absolutePaths);
      changedAnalyses = result.fileAnalyses;
    }

    // 既存と変更を結合
    const allAnalyses = [...existingAnalyses, ...changedAnalyses];

    if (allAnalyses.length === 0) {
      console.warn('解析対象ファイルが見つかりませんでした');
      return;
    }

    // 型情報を再収集
    console.log('型情報を収集しています...');
    this.registry = new TypeRegistry();
    const analyzer = createLanguageAnalyzer('rust');
    analyzer.initialize();
    for (const analysis of allAnalyses) {
      analyzer.collectTypeInfo(analysis.items, this.registry);
    }

    // エッジを再解決（変更ファイルのみエッジ再抽出が必要な場合）
    console.log('パス2: エッジを抽出しています...');
    for (const analysis of changedAnalyses) {
      try {
        const fileContent = await fs.readFile(analysis.path, 'utf-8');
        const { edges, unresolvedEdges } = analyzer.findEdges(
          fileContent,
          analysis.path,
          analysis.items,
          this.registry
        );
        analysis.edges = edges;
        analysis.unresolvedEdges = unresolvedEdges;
      } catch (error) {
        console.error(`  エッジの抽出に失敗しました: ${analysis.path} - ${error}`);
      }
    }

    // 全エッジを解決
    const edgeResolver = new EdgeResolver();
    const nameToId = edgeResolver.buildNameToIdMap(allAnalyses);
    const allEdges = allAnalyses.flatMap((a) => a.edges);
    const resolvedEdges = edgeResolver.resolveEdges(allEdges, nameToId);
    console.log(`  エッジ解決: ${allEdges.length} → ${resolvedEdges.length}`);

    // 構造化JSON出力
    const structureWriter = new StructureWriter(this.configPath, this.config.target_dir);
    await structureWriter.write(allAnalyses, resolvedEdges);

    // デバッグ出力
    const debugWriter = new DebugWriter(this.configPath);
    await debugWriter.write(allAnalyses, this.registry);
  }

  /**
   * 既存のJSONファイルを読み込む
   */
  private async loadExistingAnalyses(excludePaths: string[]): Promise<FileAnalysis[]> {
    console.log('既存のJSONファイルを読み込んでいます...');
    const analyses: FileAnalysis[] = [];

    const excludeSet = new Set(excludePaths);

    const walkDir = async (dir: string, basePath: string = ''): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = basePath ? path.join(basePath, entry.name) : entry.name;

          if (entry.isDirectory()) {
            // call_graph ディレクトリはスキップ
            if (entry.name === 'call_graph') continue;
            await walkDir(fullPath, relativePath);
          } else if (entry.isFile() && entry.name.endsWith('.json') && entry.name !== 'index.json') {
            // 除外リストに含まれている場合はスキップ
            if (excludeSet.has(relativePath)) {
              console.log(`  スキップ（変更対象）: ${relativePath}`);
              continue;
            }

            try {
              const content = await fs.readFile(fullPath, 'utf-8');
              const data = JSON.parse(content) as { path: string; items: unknown[]; tests: unknown[] };
              const absolutePath = path.resolve(this.config.target_dir, data.path);
              analyses.push({
                path: absolutePath,
                items: data.items as FileAnalysis['items'],
                tests: data.tests as FileAnalysis['tests'],
                edges: [],
                unresolvedEdges: [],
              });
            } catch (error) {
              console.error(`  読み込みエラー: ${fullPath} - ${error}`);
            }
          }
        }
      } catch {
        // ディレクトリが存在しない場合は無視
      }
    };

    await walkDir(this.baseDir);
    console.log(`  既存ファイル: ${analyses.length} 件`);
    return analyses;
  }

  /**
   * 解析を実行（パス1のみ）
   */
  private async runAnalysis(targetFiles: string[]): Promise<{ fileAnalyses: FileAnalysis[]; resolvedEdges: CallEdge[] }> {
    // 言語解析器を作成
    const analyzer = createLanguageAnalyzer('rust');
    analyzer.initialize();

    // パス1: アイテム抽出（エッジはスキップ）
    console.log('パス1: アイテムを抽出しています...');
    const fileAnalyses: FileAnalysis[] = [];

    for (const filePath of targetFiles) {
      try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const { items, tests } = analyzer.extractItems(fileContent, filePath);
        fileAnalyses.push({
          path: filePath,
          items,
          tests,
          edges: [],
          unresolvedEdges: [],
        });
      } catch (error) {
        console.error(`  ファイルの解析に失敗しました: ${filePath} - ${error}`);
      }
    }

    // 型情報を収集
    console.log('型情報を収集しています...');
    this.registry = new TypeRegistry();
    for (const analysis of fileAnalyses) {
      analyzer.collectTypeInfo(analysis.items, this.registry);
    }

    // パス2: エッジ抽出（registryを使用）
    console.log('パス2: エッジを抽出しています...');
    for (const analysis of fileAnalyses) {
      try {
        const fileContent = await fs.readFile(analysis.path, 'utf-8');
        const { edges, unresolvedEdges } = analyzer.findEdges(
          fileContent,
          analysis.path,
          analysis.items,
          this.registry
        );
        analysis.edges = edges;
        analysis.unresolvedEdges = unresolvedEdges;
      } catch (error) {
        console.error(`  エッジの抽出に失敗しました: ${analysis.path} - ${error}`);
      }
    }

    // エッジを解決
    const edgeResolver = new EdgeResolver();
    const nameToId = edgeResolver.buildNameToIdMap(fileAnalyses);
    const allEdges = fileAnalyses.flatMap((a) => a.edges);
    const resolvedEdges = edgeResolver.resolveEdges(allEdges, nameToId);
    console.log(`  エッジ解決: ${allEdges.length} → ${resolvedEdges.length}`);

    return { fileAnalyses, resolvedEdges };
  }
}

/**
 * コマンドライン引数の型定義
 */
interface ParsedArgs {
  configPath: string;
  all: boolean;
  files?: string[];
}

/**
 * コマンドライン引数をパースする
 */
function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);

  let configPath: string | null = null;
  let all = false;
  let files: string[] | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config' && i + 1 < args.length) {
      configPath = args[i + 1];
      i++;
    } else if (args[i] === '--all') {
      all = true;
    } else if (args[i] === '--files' && i + 1 < args.length) {
      files = args[i + 1].split(',').map((f) => f.trim()).filter((f) => f.length > 0);
      i++;
    }
  }

  if (!configPath) {
    console.error('使い方: node analyze.js --config <config.json> --all | --files <file1,file2>');
    process.exit(1);
  }

  if (!all && !files) {
    console.error('エラー: --all または --files を指定してください');
    console.error('使い方: node analyze.js --config <config.json> --all | --files <file1,file2>');
    process.exit(1);
  }

  return { configPath, all, files };
}

/**
 * エントリーポイント
 */
async function main() {
  const { configPath, all, files } = parseArgs();
  const analyzer = new PerchworkAnalyzer();
  await analyzer.analyze(configPath, { all, files });
}

main().catch((error) => {
  console.error('致命的なエラー:', error);
  process.exit(1);
});
