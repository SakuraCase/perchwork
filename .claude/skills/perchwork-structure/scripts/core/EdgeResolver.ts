import type { FileAnalysis, CallEdge } from '../types/index.js';

/**
 * エッジのターゲットを解決するクラス
 */
export class EdgeResolver {
  /**
   * 名前→IDマップを構築
   * エッジのtoを解決するために使用
   */
  buildNameToIdMap(fileAnalyses: FileAnalysis[]): Map<string, string> {
    const nameToId = new Map<string, string>();

    for (const analysis of fileAnalyses) {
      for (const item of analysis.items) {
        // メソッド/関数名でマッピング（同名があれば上書き）
        nameToId.set(item.name, item.id);

        // TypeName::methodName形式でもマッピング（メソッドの場合）
        if (item.impl_for) {
          nameToId.set(`${item.impl_for}::${item.name}`, item.id);
        }
      }

      // テスト関数もマッピング
      for (const test of analysis.tests) {
        nameToId.set(test.name, test.id);
      }
    }

    return nameToId;
  }

  /**
   * エッジのtoを解決
   * コードベース内の呼び出しのみを返す
   */
  resolveEdges(edges: CallEdge[], nameToId: Map<string, string>): CallEdge[] {
    const resolved: CallEdge[] = [];

    for (const edge of edges) {
      const resolvedTo = this.resolveEdgeTarget(edge.to, nameToId);
      if (resolvedTo) {
        resolved.push({
          ...edge,
          to: resolvedTo,
        });
      }
    }

    return resolved;
  }

  /**
   * エッジのターゲットを解決
   */
  private resolveEdgeTarget(to: string, nameToId: Map<string, string>): string | null {
    // 1. 完全一致
    if (nameToId.has(to)) {
      return nameToId.get(to)!;
    }

    // 2. TypeName::methodName 形式で試行
    const parts = to.split('::');
    if (parts.length >= 2) {
      const key = `${parts[parts.length - 2]}::${parts[parts.length - 1]}`;
      if (nameToId.has(key)) {
        return nameToId.get(key)!;
      }
    }

    // 解決できない（外部呼び出し）
    return null;
  }
}
