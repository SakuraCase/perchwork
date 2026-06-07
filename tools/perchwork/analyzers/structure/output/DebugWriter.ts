import fs from 'fs/promises';
import path from 'path';
import type { FileAnalysis, UnresolvedEdge } from '../types/index.js';
import type { TypeRegistry } from '../core/TypeRegistry.js';

/**
 * デバッグ情報を出力するクラス
 */
export class DebugWriter {
  constructor(private configPath: string) {}

  /**
   * デバッグ情報を出力
   */
  async write(fileAnalyses: FileAnalysis[], registry: TypeRegistry): Promise<void> {
    console.log('デバッグ情報を出力しています...');

    const configDir = path.dirname(this.configPath);
    const baseDir = path.join(configDir, 'public', 'data', 'structure', 'debug');
    await fs.mkdir(baseDir, { recursive: true });

    // 1. 未解決エッジの集計（テスト関連を除外）
    const allUnresolvedEdges: UnresolvedEdge[] = [];
    for (const analysis of fileAnalyses) {
      allUnresolvedEdges.push(...(analysis.unresolvedEdges || []));
    }
    const filteredUnresolvedEdges = allUnresolvedEdges.filter(
      edge => !edge.from.endsWith('::test')
    );

    // 理由ごとに集計
    const reasonCounts: Record<string, number> = {};
    const methodCounts: Record<string, number> = {};

    for (const edge of filteredUnresolvedEdges) {
      const reasonKey = edge.reason.split(':')[0];
      reasonCounts[reasonKey] = (reasonCounts[reasonKey] || 0) + 1;
      methodCounts[edge.method] = (methodCounts[edge.method] || 0) + 1;
    }

    // 未解決エッジの詳細
    const unresolvedData = {
      generated_at: new Date().toISOString(),
      summary: {
        total: filteredUnresolvedEdges.length,
        by_reason: Object.entries(reasonCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([reason, count]) => ({ reason, count })),
        top_methods: Object.entries(methodCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([method, count]) => ({ method, count })),
      },
      edges: filteredUnresolvedEdges,
    };

    const unresolvedPath = path.join(baseDir, 'unresolved_edges.json');
    await fs.writeFile(unresolvedPath, JSON.stringify(unresolvedData, null, 2));
    console.log(`  未解決エッジ: ${unresolvedPath} (${filteredUnresolvedEdges.length} edges)`);

    // 2. TypeRegistry の内容
    const registryData = {
      generated_at: new Date().toISOString(),
      ...registry.toDebugObject(),
    };

    const registryPath = path.join(baseDir, 'type_registry.json');
    await fs.writeFile(registryPath, JSON.stringify(registryData, null, 2));
    console.log(`  型レジストリ: ${registryPath}`);

    // 3. 解析統計
    const allEdges = fileAnalyses.flatMap(a => a.edges);
    const statsData = {
      generated_at: new Date().toISOString(),
      edges: {
        total: allEdges.length,
        resolved: allEdges.length,
        unresolved: filteredUnresolvedEdges.length,
        resolution_rate: allEdges.length > 0
          ? ((allEdges.length / (allEdges.length + filteredUnresolvedEdges.length)) * 100).toFixed(1) + '%'
          : 'N/A',
      },
      type_registry: {
        struct_fields: Object.keys(registry.toDebugObject().structFields).length,
        return_types: Object.keys(registry.toDebugObject().returnTypes).length,
      },
      unresolved_by_reason: reasonCounts,
    };

    const statsPath = path.join(baseDir, 'stats.json');
    await fs.writeFile(statsPath, JSON.stringify(statsData, null, 2));
    console.log(`  統計情報: ${statsPath}`);
  }
}
