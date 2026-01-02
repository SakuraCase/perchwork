/**
 * グラフフィルタリングユーティリティ
 *
 * Cytoscapeグラフデータにフィルタ条件を適用する。
 */

import type { CytoscapeData, CytoscapeNode, CytoscapeEdge, GraphFilter } from '@/types/graph';

/**
 * フィルタ条件に基づいてグラフデータをフィルタリング
 *
 * @param data - 元のグラフデータ
 * @param filter - フィルタ条件
 * @returns フィルタリングされたグラフデータ
 */
export function applyGraphFilter(
  data: CytoscapeData,
  filter: GraphFilter | undefined
): CytoscapeData {
  if (!filter) {
    return data;
  }

  let nodes = data.nodes;
  let edges = data.edges;

  // 除外ノードセット
  const excludeSet = new Set(filter.excludeNodeIds || []);

  // フォーカスノードフィルタ（最初に適用）
  if (filter.focusNodeId) {
    nodes = filterByFocusNode(data, filter.focusNodeId, excludeSet);
  } else {
    // focusNodeIdがない場合は単純に除外ノードを非表示
    nodes = nodes.filter((node) => !excludeSet.has(node.data.id));
  }

  // ディレクトリフィルタ
  if (filter.directories.length > 0) {
    nodes = filterByDirectories(nodes, filter.directories);
  }

  // フィルタリングされたノードのIDセット
  const nodeIds = new Set(nodes.map((node) => node.data.id));

  // エッジをフィルタリング（両端が存在するもののみ）
  edges = filterEdgesByNodes(edges, nodeIds);

  // 同一ノード間の複数エッジを省略
  if (filter.consolidateEdges) {
    edges = consolidateEdges(edges);
  }

  // 孤立ノード除外
  if (!filter.includeIsolated) {
    nodes = removeIsolatedNodes(nodes, edges);
  }

  return { nodes, edges };
}

/**
 * フォーカスノードを中心に関連ノードのみをフィルタリング
 */
function filterByFocusNode(
  data: CytoscapeData,
  focusNodeId: string,
  excludeSet: Set<string>
): CytoscapeNode[] {
  const relatedNodeIds = new Set<string>([focusNodeId]);
  const visited = new Set<string>([focusNodeId]);
  const queue: string[] = [focusNodeId];

  // BFSで関連ノードを収集（両方向、除外ノードを通過しない）
  while (queue.length > 0) {
    const currentId = queue.shift()!;

    // 除外ノードの場合はスキップ（このノード経由の探索を停止）
    // ただしフォーカスノード自体は除外対象外
    if (excludeSet.has(currentId) && currentId !== focusNodeId) {
      continue;
    }

    // downstream（呼び出し先）
    for (const edge of data.edges) {
      if (
        edge.data.source === currentId &&
        !visited.has(edge.data.target) &&
        !excludeSet.has(edge.data.target)
      ) {
        visited.add(edge.data.target);
        relatedNodeIds.add(edge.data.target);
        queue.push(edge.data.target);
      }
    }

    // upstream（呼び出し元）
    for (const edge of data.edges) {
      if (
        edge.data.target === currentId &&
        !visited.has(edge.data.source) &&
        !excludeSet.has(edge.data.source)
      ) {
        visited.add(edge.data.source);
        relatedNodeIds.add(edge.data.source);
        queue.push(edge.data.source);
      }
    }
  }

  return data.nodes.filter((node) => relatedNodeIds.has(node.data.id));
}

/**
 * ディレクトリでフィルタリング
 */
function filterByDirectories(nodes: CytoscapeNode[], directories: string[]): CytoscapeNode[] {
  return nodes.filter((node) =>
    directories.some((dir) => node.data.file.startsWith(dir))
  );
}

/**
 * ノードIDセットに基づいてエッジをフィルタリング
 */
function filterEdgesByNodes(edges: CytoscapeEdge[], nodeIds: Set<string>): CytoscapeEdge[] {
  return edges.filter(
    (edge) => nodeIds.has(edge.data.source) && nodeIds.has(edge.data.target)
  );
}

/**
 * 孤立ノード（エッジを持たないノード）を除外
 */
function removeIsolatedNodes(nodes: CytoscapeNode[], edges: CytoscapeEdge[]): CytoscapeNode[] {
  const connectedNodeIds = new Set<string>();
  edges.forEach((edge) => {
    connectedNodeIds.add(edge.data.source);
    connectedNodeIds.add(edge.data.target);
  });
  return nodes.filter((node) => connectedNodeIds.has(node.data.id));
}

/**
 * 同一ノード間の複数エッジを1本に省略
 *
 * source→target のペアごとに最初のエッジのみを保持する
 */
function consolidateEdges(edges: CytoscapeEdge[]): CytoscapeEdge[] {
  const seenPairs = new Set<string>();
  return edges.filter((edge) => {
    const pairKey = `${edge.data.source}->${edge.data.target}`;
    if (seenPairs.has(pairKey)) {
      return false;
    }
    seenPairs.add(pairKey);
    return true;
  });
}
