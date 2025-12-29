/**
 * グラフ分析サービス
 *
 * コールグラフの分析機能を提供する
 * - 中心性計算（重要度の高いノードの特定）
 * - クリティカルパスの検出
 * - ディレクトリベースのクラスタリング
 * - 統計情報の計算
 */

import type { CytoscapeData, ClusterData, GraphMetrics } from '../types/graph';

/**
 * 次数中心性（Degree Centrality）を計算する
 *
 * 各ノードの重要度を次数（接続数）に基づいて計算する。
 * 次数中心性が高いノードは、多くの他ノードと接続しているため、
 * グラフ内で重要な役割を果たしている可能性が高い。
 *
 * @param graph - Cytoscapeグラフデータ
 * @returns ノードIDと中心性スコアのマップ（0.0〜1.0の正規化された値）
 */
export function calculateCentrality(graph: CytoscapeData): Map<string, number> {
  const centrality = new Map<string, number>();

  // 全ノードの次数を計算（入次数 + 出次数）
  const degreeMap = new Map<string, number>();

  // 初期化：全ノードの次数を0に設定
  for (const node of graph.nodes) {
    degreeMap.set(node.data.id, 0);
  }

  // エッジから次数を計算
  for (const edge of graph.edges) {
    const sourceDegree = degreeMap.get(edge.data.source) || 0;
    const targetDegree = degreeMap.get(edge.data.target) || 0;

    degreeMap.set(edge.data.source, sourceDegree + 1);
    degreeMap.set(edge.data.target, targetDegree + 1);
  }

  // 最大次数を取得（正規化用）
  const maxDegree = Math.max(...Array.from(degreeMap.values()), 1);

  // 正規化（0.0〜1.0の範囲に変換）
  for (const [nodeId, degree] of degreeMap.entries()) {
    centrality.set(nodeId, degree / maxDegree);
  }

  return centrality;
}

/**
 * クリティカルパス（重要な呼び出し経路）を検出する
 *
 * グラフ内の重要なパスを検出する。現在の実装では、
 * 高い中心性を持つノードを通る長いパスを優先的に抽出する。
 *
 * @param graph - Cytoscapeグラフデータ
 * @returns 重要なパスの配列（各パスはノードIDの配列）
 */
export function findCriticalPaths(graph: CytoscapeData): string[][] {
  // 中心性を計算
  const centrality = calculateCentrality(graph);

  // エッジマップを構築（効率的な探索のため）
  const adjacencyMap = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (!adjacencyMap.has(edge.data.source)) {
      adjacencyMap.set(edge.data.source, []);
    }
    adjacencyMap.get(edge.data.source)!.push(edge.data.target);
  }

  // 中心性の高いノード（上位20%）を開始点として選択
  const centralNodes = Array.from(centrality.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.max(1, Math.ceil(graph.nodes.length * 0.2)))
    .map(([nodeId]) => nodeId);

  const criticalPaths: string[][] = [];

  // 各中心ノードから深さ優先探索でパスを抽出
  for (const startNode of centralNodes) {
    const visited = new Set<string>();
    const currentPath: string[] = [];

    dfsForPaths(startNode, adjacencyMap, visited, currentPath, criticalPaths, 5);
  }

  // パスの長さと中心性の総和でソート（重要度順）
  criticalPaths.sort((a, b) => {
    const scoreA = a.length + a.reduce((sum, nodeId) => sum + (centrality.get(nodeId) || 0), 0);
    const scoreB = b.length + b.reduce((sum, nodeId) => sum + (centrality.get(nodeId) || 0), 0);
    return scoreB - scoreA;
  });

  // 上位10パスを返す
  return criticalPaths.slice(0, 10);
}

/**
 * 深さ優先探索でパスを探索する（内部ヘルパー関数）
 *
 * @param node - 現在のノードID
 * @param adjacencyMap - 隣接リストマップ
 * @param visited - 訪問済みノード集合
 * @param currentPath - 現在のパス
 * @param allPaths - 結果のパス配列
 * @param maxDepth - 最大探索深度
 */
function dfsForPaths(
  node: string,
  adjacencyMap: Map<string, string[]>,
  visited: Set<string>,
  currentPath: string[],
  allPaths: string[][],
  maxDepth: number
): void {
  // 訪問済みまたは最大深度に到達したら終了
  if (visited.has(node) || currentPath.length >= maxDepth) {
    if (currentPath.length >= 2) {
      allPaths.push([...currentPath]);
    }
    return;
  }

  visited.add(node);
  currentPath.push(node);

  const neighbors = adjacencyMap.get(node) || [];

  if (neighbors.length === 0 && currentPath.length >= 2) {
    // リーフノードに到達した場合、パスを保存
    allPaths.push([...currentPath]);
  } else {
    // 隣接ノードを探索
    for (const neighbor of neighbors) {
      dfsForPaths(neighbor, adjacencyMap, visited, currentPath, allPaths, maxDepth);
    }
  }

  // バックトラック
  currentPath.pop();
  visited.delete(node);
}

/**
 * ディレクトリベースでノードをクラスタリングする
 *
 * ノードのファイルパスを解析し、ディレクトリ構造に基づいて
 * クラスタに分類する。これにより、モジュール単位での
 * グラフの可視化や分析が可能になる。
 *
 * @param graph - Cytoscapeグラフデータ
 * @returns クラスタデータ
 */
export function clusterByDirectory(graph: CytoscapeData): ClusterData {
  // ディレクトリごとにノードをグループ化
  const directoryMap = new Map<string, string[]>();

  for (const node of graph.nodes) {
    const filePath = node.data.file;
    const directory = extractDirectory(filePath);

    if (!directoryMap.has(directory)) {
      directoryMap.set(directory, []);
    }
    directoryMap.get(directory)!.push(node.data.id);
  }

  // ClusterData形式に変換
  const clusters = Array.from(directoryMap.entries()).map(([dir, nodes]) => ({
    id: dir,
    label: dir || 'root',
    nodes,
  }));

  return { clusters };
}

/**
 * ファイルパスからディレクトリパスを抽出する
 *
 * @param filePath - ファイルパス
 * @returns ディレクトリパス
 */
function extractDirectory(filePath: string): string {
  const parts = filePath.split('/');

  // ファイル名を除外してディレクトリパスを構築
  if (parts.length <= 1) {
    return 'root';
  }

  return parts.slice(0, -1).join('/');
}

/**
 * グラフの統計情報を計算する
 *
 * ノード数、エッジ数、平均次数、最大次数、孤立ノード、
 * 循環参照などの統計メトリクスを計算する。
 *
 * @param graph - Cytoscapeグラフデータ
 * @returns グラフ統計情報
 */
export function calculateMetrics(graph: CytoscapeData): GraphMetrics {
  const nodeCount = graph.nodes.length;
  const edgeCount = graph.edges.length;

  // 入次数・出次数の計算
  const inDegreeMap = new Map<string, number>();
  const outDegreeMap = new Map<string, number>();

  // 初期化
  for (const node of graph.nodes) {
    inDegreeMap.set(node.data.id, 0);
    outDegreeMap.set(node.data.id, 0);
  }

  // エッジから次数を計算
  for (const edge of graph.edges) {
    const inDegree = inDegreeMap.get(edge.data.target) || 0;
    const outDegree = outDegreeMap.get(edge.data.source) || 0;

    inDegreeMap.set(edge.data.target, inDegree + 1);
    outDegreeMap.set(edge.data.source, outDegree + 1);
  }

  // 平均次数を計算（入次数 + 出次数の合計 / ノード数）
  const totalDegree = Array.from(inDegreeMap.values()).reduce((sum, deg) => sum + deg, 0) +
                      Array.from(outDegreeMap.values()).reduce((sum, deg) => sum + deg, 0);
  const avgDegree = nodeCount > 0 ? totalDegree / nodeCount : 0;

  // 最大入次数を持つノードを特定
  let maxInDegreeNodeId = '';
  let maxInDegreeCount = 0;
  for (const [nodeId, degree] of inDegreeMap.entries()) {
    if (degree > maxInDegreeCount) {
      maxInDegreeCount = degree;
      maxInDegreeNodeId = nodeId;
    }
  }

  // 最大出次数を持つノードを特定
  let maxOutDegreeNodeId = '';
  let maxOutDegreeCount = 0;
  for (const [nodeId, degree] of outDegreeMap.entries()) {
    if (degree > maxOutDegreeCount) {
      maxOutDegreeCount = degree;
      maxOutDegreeNodeId = nodeId;
    }
  }

  // 孤立ノード（エッジを持たないノード）を検出
  const isolatedNodes: string[] = [];
  for (const node of graph.nodes) {
    const inDegree = inDegreeMap.get(node.data.id) || 0;
    const outDegree = outDegreeMap.get(node.data.id) || 0;

    if (inDegree === 0 && outDegree === 0) {
      isolatedNodes.push(node.data.id);
    }
  }

  // 循環参照の検出（簡易版：強連結成分の数を数える）
  const cycleCount = detectCycles(graph);

  return {
    nodeCount,
    edgeCount,
    avgDegree,
    maxInDegree: {
      nodeId: maxInDegreeNodeId,
      count: maxInDegreeCount,
    },
    maxOutDegree: {
      nodeId: maxOutDegreeNodeId,
      count: maxOutDegreeCount,
    },
    isolatedNodes,
    cycleCount,
  };
}

/**
 * グラフ内の循環参照を検出する
 *
 * DFS（深さ優先探索）を使用して、グラフ内の循環の数を概算する。
 * 完全な強連結成分分解ではなく、簡易的な検出を行う。
 *
 * @param graph - Cytoscapeグラフデータ
 * @returns 検出された循環の数
 */
function detectCycles(graph: CytoscapeData): number {
  const adjacencyMap = new Map<string, string[]>();

  // 隣接リストを構築
  for (const edge of graph.edges) {
    if (!adjacencyMap.has(edge.data.source)) {
      adjacencyMap.set(edge.data.source, []);
    }
    adjacencyMap.get(edge.data.source)!.push(edge.data.target);
  }

  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  let cycleCount = 0;

  // 各ノードからDFSを実行
  for (const node of graph.nodes) {
    if (!visited.has(node.data.id)) {
      if (dfsCycleDetection(node.data.id, adjacencyMap, visited, recursionStack)) {
        cycleCount++;
      }
    }
  }

  return cycleCount;
}

/**
 * DFSによる循環検出（内部ヘルパー関数）
 *
 * @param node - 現在のノードID
 * @param adjacencyMap - 隣接リストマップ
 * @param visited - 訪問済みノード集合
 * @param recursionStack - 再帰スタック（現在の探索パスに含まれるノード）
 * @returns 循環が検出された場合true
 */
function dfsCycleDetection(
  node: string,
  adjacencyMap: Map<string, string[]>,
  visited: Set<string>,
  recursionStack: Set<string>
): boolean {
  visited.add(node);
  recursionStack.add(node);

  const neighbors = adjacencyMap.get(node) || [];

  for (const neighbor of neighbors) {
    if (!visited.has(neighbor)) {
      if (dfsCycleDetection(neighbor, adjacencyMap, visited, recursionStack)) {
        return true;
      }
    } else if (recursionStack.has(neighbor)) {
      // 再帰スタックに含まれている場合、循環が検出された
      return true;
    }
  }

  // バックトラック
  recursionStack.delete(node);
  return false;
}
