import fs from 'fs/promises';
import path from 'path';
import type { FileAnalysis, CallEdge } from '../types/index.js';
import { CallGraphWriter } from './CallGraphWriter.js';

/**
 * 構造化JSONを出力するクラス
 */
export class StructureWriter {
  private callGraphWriter = new CallGraphWriter();

  constructor(
    private configPath: string,
    private targetDir: string
  ) {}

  /**
   * 構造化JSONを出力する（ファイル分割版）
   */
  async write(fileAnalyses: FileAnalysis[], resolvedEdges: CallEdge[]): Promise<void> {
    console.log('構造化JSONを出力しています...');

    const configDir = path.dirname(this.configPath);
    const baseDir = path.join(configDir, 'public', 'data', 'structure');

    try {
      await fs.mkdir(baseDir, { recursive: true });
    } catch (error) {
      console.error(`出力ディレクトリの作成に失敗しました: ${error}`);
      throw error;
    }

    const fileEntries: Array<{ path: string; items: number; tests: number }> = [];

    // 各ファイルの解析結果を個別JSONとして出力
    for (const analysis of fileAnalyses) {
      const relativePath = path.relative(this.targetDir, analysis.path);
      const jsonPath = relativePath.replace(/\.rs$/, '.json');
      const outputPath = path.join(baseDir, jsonPath);

      // サブディレクトリを作成
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      // 個別ファイルJSON出力（edgesは別ファイルに出力するため含めない）
      const fileData = {
        path: relativePath,
        items: analysis.items,
        tests: analysis.tests,
      };
      await fs.writeFile(outputPath, JSON.stringify(fileData, null, 2));

      fileEntries.push({
        path: jsonPath,
        items: analysis.items.length,
        tests: analysis.tests.length,
      });

      console.log(`  出力: ${outputPath}`);
    }

    // call_graph/edges.json の生成
    await this.callGraphWriter.write(baseDir, resolvedEdges);

    // index.json の生成
    const allEdges = fileAnalyses.flatMap(a => a.edges);
    const totalItems = fileEntries.reduce((sum, f) => sum + f.items, 0);
    const totalTests = fileEntries.reduce((sum, f) => sum + f.tests, 0);

    const index = {
      version: '2.0',
      generated_at: new Date().toISOString(),
      target_dir: this.targetDir,
      stats: {
        total_files: fileEntries.length,
        total_items: totalItems,
        total_tests: totalTests,
        total_edges: allEdges.length,
      },
      files: fileEntries,
    };

    const indexPath = path.join(baseDir, 'index.json');
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));

    console.log(`構造化JSONを出力しました:`);
    console.log(`  - index: ${indexPath}`);
    console.log(`  - ファイル数: ${fileEntries.length}`);
    console.log(`  - アイテム数: ${totalItems}`);
    console.log(`  - テスト数: ${totalTests}`);
    console.log(`  - エッジ数: ${allEdges.length}`);
  }
}
