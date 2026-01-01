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
    nodes = filterByFocusNode(data, filter.focusNodeId, excludeSet, filter.maxDepth);
  } else {
    // focusNodeIdがない場合は単純に除外ノードを非表示
    nodes = nodes.filter((node) => !excludeSet.has(node.data.id));
  }

  // ディレクトリフィルタ
  if (filter.directories.length > 0) {
    nodes = filterByDirectories(nodes, filter.directories);
  }

  // タイプフィルタ
  if (filter.types.length > 0) {
    nodes = filterByTypes(nodes, filter.types);
  }

  // フィルタリングされたノードのIDセット
  const nodeIds = new Set(nodes.map((node) => node.data.id));

  // エッジをフィルタリング（両端が存在するもののみ）
  edges = filterEdgesByNodes(edges, nodeIds);

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
  excludeSet: Set<string>,
  maxDepthOption: number
): CytoscapeNode[] {
  const relatedNodeIds = new Set<string>([focusNodeId]);
  const visited = new Map<string, number>();
  visited.set(focusNodeId, 0);

  // 探索深度：maxDepthが0の場合は無制限（全探索）
  const maxDepth = maxDepthOption > 0 ? maxDepthOption : Infinity;
  const queue: Array<{ id: string; depth: number }> = [{ id: focusNodeId, depth: 0 }];

  // BFSで関連ノードを収集（両方向、除外ノードを通過しない）
  while (queue.length > 0) {
    const current = queue.shift()!;

    // 除外ノードの場合はスキップ（このノード経由の探索を停止）
    // ただしフォーカスノード自体は除外対象外
    if (excludeSet.has(current.id) && current.id !== focusNodeId) {
      continue;
    }

    if (current.depth >= maxDepth) continue;

    const nextDepth = current.depth + 1;

    // downstream（呼び出し先）
    for (const edge of data.edges) {
      if (
        edge.data.source === current.id &&
        !visited.has(edge.data.target) &&
        !excludeSet.has(edge.data.target)
      ) {
        visited.set(edge.data.target, nextDepth);
        relatedNodeIds.add(edge.data.target);
        queue.push({ id: edge.data.target, depth: nextDepth });
      }
    }

    // upstream（呼び出し元）
    for (const edge of data.edges) {
      if (
        edge.data.target === current.id &&
        !visited.has(edge.data.source) &&
        !excludeSet.has(edge.data.source)
      ) {
        visited.set(edge.data.source, nextDepth);
        relatedNodeIds.add(edge.data.source);
        queue.push({ id: edge.data.source, depth: nextDepth });
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
 * タイプでフィルタリング
 */
function filterByTypes(nodes: CytoscapeNode[], types: string[]): CytoscapeNode[] {
  return nodes.filter((node) => types.includes(node.data.type));
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
