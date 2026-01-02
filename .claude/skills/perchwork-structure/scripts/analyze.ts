#!/usr/bin/env node
/**
 * Perchwork Analyzer - Rust コード解析スクリプト
 *
 * tree-sitter のネイティブバインディングを使って Rust コードを解析し、構造化JSONを生成する
 */

import fs from 'fs/promises';
import path from 'path';
import type { Config, FileAnalysis } from './types/index.js';
import { TypeRegistry, FileCollector, EdgeResolver } from './core/index.js';
import { StructureWriter, DebugWriter } from './output/index.js';
import { createLanguageAnalyzer } from './languages/index.js';

/**
 * メイン処理クラス
 */
class PerchworkAnalyzer {
  private config!: Config;
  private configPath!: string;
  private registry = new TypeRegistry();

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

      console.log(`対象ディレクトリ: ${this.config.target_dir}`);
    } catch (error) {
      throw new Error(`設定ファイルの読み込みに失敗しました: ${configPath} - ${error}`);
    }
  }

  /**
   * 解析を実行する（2パス解析）
   */
  async analyze(configPath: string): Promise<void> {
    console.log('=== Perchwork Analyzer 開始 ===');

    try {
      // 設定ファイル読み込み
      await this.loadConfig(configPath);

      // 対象ファイル収集
      const fileCollector = new FileCollector(this.config);
      const targetFiles = await fileCollector.collectTargetFiles();

      if (targetFiles.length === 0) {
        console.warn('対象ファイルが見つかりませんでした');
        return;
      }

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

      // 構造化JSON出力
      const structureWriter = new StructureWriter(this.configPath, this.config.target_dir);
      await structureWriter.write(fileAnalyses, resolvedEdges);

      // デバッグ出力
      const debugWriter = new DebugWriter(this.configPath);
      await debugWriter.write(fileAnalyses, this.registry);

      console.log('=== Perchwork Analyzer 完了 ===');
    } catch (error) {
      console.error('エラーが発生しました:', error);
      throw error;
    }
  }
}

/**
 * コマンドライン引数をパースする
 */
function parseArgs(): string {
  const args = process.argv.slice(2);

  let configPath: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config' && i + 1 < args.length) {
      configPath = args[i + 1];
      break;
    }
  }

  if (!configPath) {
    console.error('使い方: node analyze.js --config <config.json>');
    process.exit(1);
  }

  return configPath;
}

/**
 * エントリーポイント
 */
async function main() {
  const configPath = parseArgs();
  const analyzer = new PerchworkAnalyzer();
  await analyzer.analyze(configPath);
}

main().catch((error) => {
  console.error('致命的なエラー:', error);
  process.exit(1);
});
