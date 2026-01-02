import fs from 'fs/promises';
import path from 'path';
import type { CallEdge } from '../types/index.js';

/**
 * コールグラフを出力するクラス
 */
export class CallGraphWriter {
  /**
   * コールグラフを出力する
   */
  async write(baseDir: string, edges: CallEdge[]): Promise<void> {
    const callGraphDir = path.join(baseDir, 'call_graph');
    await fs.mkdir(callGraphDir, { recursive: true });

    const callGraphData = {
      generated_at: new Date().toISOString(),
      total_edges: edges.length,
      edges: edges,
    };

    const edgesPath = path.join(callGraphDir, 'edges.json');
    await fs.writeFile(edgesPath, JSON.stringify(callGraphData, null, 2));

    console.log(`  コールグラフ出力: ${edgesPath} (${edges.length} edges)`);
  }
}
