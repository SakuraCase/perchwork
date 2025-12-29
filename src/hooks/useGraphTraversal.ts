/**
 * グラフ探索機能を提供するカスタムフック
 *
 * BFS（幅優先探索）によるノード探索を提供し、深さ制限付きで
 * 呼び出し元（upstream）、呼び出し先（downstream）、または両方向の探索を可能にする
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  CytoscapeData,
  CytoscapeNode,
  CytoscapeEdge,
} from '../types/graph';
import { loadFullGraph } from '../services/graphLoader';

/**
 * グラフ探索の方向
 */
export type TraversalDirection = 'downstream' | 'upstream' | 'both';

/**
 * useGraphTraversal の戻り値型
 */
export interface UseGraphTraversalResult {
  /** 呼び出し先を取得（downstream） */
  getDownstream: (nodeId: string, depth?: number) => CytoscapeNode[];

  /** 呼び出し元を取得（upstream） */
  getUpstream: (nodeId: string, depth?: number) => CytoscapeNode[];

  /** 部分グラフを取得 */
  getSubgraph: (
    nodeId: string,
    depth?: number,
    direction?: TraversalDirection
  ) => CytoscapeData;

  /** 循環参照を検出 */
  detectCycles: () => string[][];

  /** グラフデータ */
  graphData: CytoscapeData | null;

  /** ローディング状態 */
  isLoading: boolean;

  /** エラー状態 */
  error: Error | null;
}

/**
 * グラフ探索機能を提供するフック
 *
 * @param initialData - 初期グラフデータ（省略時はloadFullGraphで取得）
 * @returns グラフ探索API
 */
export function useGraphTraversal(
  initialData?: CytoscapeData
): UseGraphTraversalResult {
  const [graphData, setGraphData] = useState<CytoscapeData | null>(
    initialData || null
  );
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<Error | null>(null);

  // グラフデータの初期読み込み（initialDataがない場合のみ）
  useEffect(() => {
    if (initialData) {
      setGraphData(initialData);
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await loadFullGraph();
        setGraphData(data);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Failed to load graph data')
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [initialData]);

  // エッジマップをメモ化（効率的な探索のため）
  const { outgoingEdges, incomingEdges, nodeMap } = useMemo(() => {
    if (!graphData) {
      return {
        outgoingEdges: new Map<string, CytoscapeEdge[]>(),
        incomingEdges: new Map<string, CytoscapeEdge[]>(),
        nodeMap: new Map<string, CytoscapeNode>(),
      };
    }

    const outgoing = new Map<string, CytoscapeEdge[]>();
    const incoming = new Map<string, CytoscapeEdge[]>();
    const nodes = new Map<string, CytoscapeNode>();

    // ノードマップを構築
    for (const node of graphData.nodes) {
      nodes.set(node.data.id, node);
    }

    // エッジマップを構築
    for (const edge of graphData.edges) {
      // 出力エッジ（呼び出し先）
      if (!outgoing.has(edge.data.source)) {
        outgoing.set(edge.data.source, []);
      }
      outgoing.get(edge.data.source)!.push(edge);

      // 入力エッジ（呼び出し元）
      if (!incoming.has(edge.data.target)) {
        incoming.set(edge.data.target, []);
      }
      incoming.get(edge.data.target)!.push(edge);
    }

    return {
      outgoingEdges: outgoing,
      incomingEdges: incoming,
      nodeMap: nodes,
    };
  }, [graphData]);

  /**
   * BFS（幅優先探索）で指定方向のノードを収集
   *
   * @param startId - 開始ノードID
   * @param maxDepth - 最大深度（0で直接の接続のみ）
   * @param direction - 探索方向
   * @returns 訪問したノードIDのSet
   */
  const bfsTraverse = useCallback(
    (
      startId: string,
      maxDepth: number,
      direction: TraversalDirection
    ): Set<string> => {
      const visited = new Set<string>([startId]);
      const queue: Array<{ id: string; depth: number }> = [
        { id: startId, depth: 0 },
      ];

      while (queue.length > 0) {
        const current = queue.shift()!;

        // 深さ制限に達した場合はスキップ
        if (current.depth >= maxDepth) {
          continue;
        }

        const nextDepth = current.depth + 1;

        // downstream（呼び出し先）を探索
        if (direction === 'downstream' || direction === 'both') {
          const outgoing = outgoingEdges.get(current.id) || [];
          for (const edge of outgoing) {
            if (!visited.has(edge.data.target)) {
              visited.add(edge.data.target);
              queue.push({ id: edge.data.target, depth: nextDepth });
            }
          }
        }

        // upstream（呼び出し元）を探索
        if (direction === 'upstream' || direction === 'both') {
          const incoming = incomingEdges.get(current.id) || [];
          for (const edge of incoming) {
            if (!visited.has(edge.data.source)) {
              visited.add(edge.data.source);
              queue.push({ id: edge.data.source, depth: nextDepth });
            }
          }
        }
      }

      return visited;
    },
    [outgoingEdges, incomingEdges]
  );

  /**
   * 呼び出し先ノードを取得（downstream）
   *
   * @param nodeId - 起点ノードID
   * @param depth - 探索深度（デフォルト: 1）
   * @returns 呼び出し先ノード配列
   */
  const getDownstream = useCallback(
    (nodeId: string, depth: number = 1): CytoscapeNode[] => {
      if (!graphData) {
        return [];
      }

      const visited = bfsTraverse(nodeId, depth, 'downstream');

      // 起点ノード自身を除外
      visited.delete(nodeId);

      return Array.from(visited)
        .map((id) => nodeMap.get(id))
        .filter((node): node is CytoscapeNode => node !== undefined);
    },
    [graphData, bfsTraverse, nodeMap]
  );

  /**
   * 呼び出し元ノードを取得（upstream）
   *
   * @param nodeId - 起点ノードID
   * @param depth - 探索深度（デフォルト: 1）
   * @returns 呼び出し元ノード配列
   */
  const getUpstream = useCallback(
    (nodeId: string, depth: number = 1): CytoscapeNode[] => {
      if (!graphData) {
        return [];
      }

      const visited = bfsTraverse(nodeId, depth, 'upstream');

      // 起点ノード自身を除外
      visited.delete(nodeId);

      return Array.from(visited)
        .map((id) => nodeMap.get(id))
        .filter((node): node is CytoscapeNode => node !== undefined);
    },
    [graphData, bfsTraverse, nodeMap]
  );

  /**
   * 部分グラフを取得
   *
   * @param nodeId - 起点ノードID
   * @param depth - 探索深度（デフォルト: 1）
   * @param direction - 探索方向（デフォルト: 'both'）
   * @returns 部分グラフ
   */
  const getSubgraph = useCallback(
    (
      nodeId: string,
      depth: number = 1,
      direction: TraversalDirection = 'both'
    ): CytoscapeData => {
      if (!graphData) {
        return { nodes: [], edges: [] };
      }

      const visited = bfsTraverse(nodeId, depth, direction);

      // 訪問済みノードのみをフィルタ
      const filteredNodes = graphData.nodes.filter((node) =>
        visited.has(node.data.id)
      );

      // 両端が訪問済みノードであるエッジのみをフィルタ
      const filteredEdges = graphData.edges.filter(
        (edge) =>
          visited.has(edge.data.source) && visited.has(edge.data.target)
      );

      return {
        nodes: filteredNodes,
        edges: filteredEdges,
      };
    },
    [graphData, bfsTraverse]
  );

  /**
   * 循環参照を検出（DFSベース）
   *
   * @returns 循環パスの配列（各要素はノードIDの配列）
   */
  const detectCycles = useCallback((): string[][] => {
    if (!graphData) {
      return [];
    }

    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    /**
     * DFS（深さ優先探索）で循環を検出
     */
    const dfs = (nodeId: string): void => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const outgoing = outgoingEdges.get(nodeId) || [];

      for (const edge of outgoing) {
        const targetId = edge.data.target;

        if (!visited.has(targetId)) {
          // 未訪問ノードを探索
          dfs(targetId);
        } else if (recursionStack.has(targetId)) {
          // 循環を検出
          const cycleStartIndex = path.indexOf(targetId);
          const cycle = path.slice(cycleStartIndex);
          cycles.push([...cycle, targetId]); // 始点を末尾にも追加
        }
      }

      // バックトラック
      path.pop();
      recursionStack.delete(nodeId);
    };

    // 全ノードからDFSを開始（非連結グラフに対応）
    for (const node of graphData.nodes) {
      if (!visited.has(node.data.id)) {
        dfs(node.data.id);
      }
    }

    return cycles;
  }, [graphData, outgoingEdges]);

  return {
    getDownstream,
    getUpstream,
    getSubgraph,
    detectCycles,
    graphData,
    isLoading,
    error,
  };
}
