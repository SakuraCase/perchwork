import fs from 'fs/promises';
import path from 'path';
import type { CallEdge } from '../types/index.js';

const CHUNK_SIZE = 2000;

/**
 * コールグラフを出力するクラス
 */
export class CallGraphWriter {
  /**
   * コールグラフを出力する
   */
  async write(baseDir: string, edges: CallEdge[]): Promise<void> {
    const callGraphDir = path.join(baseDir, 'call_graph');
    const chunksDir = path.join(callGraphDir, 'chunks');
    await fs.mkdir(callGraphDir, { recursive: true });
    await fs.mkdir(chunksDir, { recursive: true });

    const generatedAt = new Date().toISOString();
    const chunkEntries: Array<{
      path: string;
      source_files: string[];
      node_count: number;
      edge_count: number;
    }> = [];

    for (let i = 0; i < edges.length; i += CHUNK_SIZE) {
      const chunkEdges = edges.slice(i, i + CHUNK_SIZE);
      const chunkIndex = Math.floor(i / CHUNK_SIZE);
      const fileName = `edges_${String(chunkIndex).padStart(4, '0')}.json`;
      const relativePath = `call_graph/chunks/${fileName}`;
      const outputPath = path.join(chunksDir, fileName);
      const nodeIds = new Set<string>();
      const sourceFiles = new Set<string>();

      for (const edge of chunkEdges) {
        nodeIds.add(edge.from);
        nodeIds.add(edge.to);
        sourceFiles.add(edge.file);
      }

      await fs.writeFile(
        outputPath,
        JSON.stringify({
          generated_at: generatedAt,
          total_edges: chunkEdges.length,
          edges: chunkEdges,
        })
      );

      chunkEntries.push({
        path: relativePath,
        source_files: [...sourceFiles].sort(),
        node_count: nodeIds.size,
        edge_count: chunkEdges.length,
      });
    }

    const indexPath = path.join(callGraphDir, 'index.json');
    await fs.writeFile(
      indexPath,
      JSON.stringify(
        {
          schema_version: '1.0.0',
          generated_at: generatedAt,
          chunks: chunkEntries,
          statistics: {
            total_edges: edges.length,
            chunk_count: chunkEntries.length,
          },
        },
        null,
        2
      )
    );

    const callGraphData = {
      generated_at: generatedAt,
      total_edges: edges.length,
      edges: edges,
    };

    const edgesPath = path.join(callGraphDir, 'edges.json');
    await fs.writeFile(edgesPath, JSON.stringify(callGraphData, null, 2));

    console.log(`  コールグラフ出力: ${edgesPath} (${edges.length} edges)`);
    console.log(`  コールグラフチャンク出力: ${indexPath} (${chunkEntries.length} chunks)`);
  }
}
