/**
 * call_graph データの読み込みとCytoscape形式への変換
 */

import type {
  CallGraphIndexData,
  CallGraphEdgesData,
  CytoscapeData,
  CytoscapeNode,
  CytoscapeEdge,
} from '../types/graph';
import type { IndexFile, SplitFile, CodeItem } from '../types/schema';
import {
  DataNotFoundError,
  ParseError,
  NetworkError,
} from '../types/errors';
import * as cacheManager from './cacheManager';

/**
 * call_graph/index.json を取得する
 * @returns コールグラフインデックスデータ
 * @throws {DataNotFoundError} ファイルが見つからない場合
 * @throws {ParseError} JSONパースに失敗した場合
 * @throws {NetworkError} ネットワークエラーが発生した場合
 */
export async function loadCallGraphIndex(): Promise<CallGraphIndexData> {
  const cacheKey = 'call_graph_index';
  const cached = cacheManager.get<CallGraphIndexData>(cacheKey);
  if (cached) {
    return cached;
  }

  const data = await fetchJson<CallGraphIndexData>('/data/call_graph/index.json');
  cacheManager.set(cacheKey, data);
  return data;
}

/**
 * call_graph のエッジファイルを取得する
 * @param filename - エッジファイル名（例: "edges.json"）
 * @returns エッジデータ
 * @throws {DataNotFoundError} ファイルが見つからない場合
 * @throws {ParseError} JSONパースに失敗した場合
 * @throws {NetworkError} ネットワークエラーが発生した場合
 */
export async function loadCallGraphEdges(filename: string): Promise<CallGraphEdgesData> {
  const cacheKey = `call_graph_edges_${filename}`;
  const cached = cacheManager.get<CallGraphEdgesData>(cacheKey);
  if (cached) {
    return cached;
  }

  const path = `/data/call_graph/${filename}`;
  const data = await fetchJson<CallGraphEdgesData>(path);
  cacheManager.set(cacheKey, data);
  return data;
}

/**
 * メインインデックスファイルを取得する
 * @returns メインインデックス
 * @throws {DataNotFoundError} ファイルが見つからない場合
 * @throws {ParseError} JSONパースに失敗した場合
 * @throws {NetworkError} ネットワークエラーが発生した場合
 */
async function loadMainIndex(): Promise<IndexFile> {
  const cacheKey = 'main_index';
  const cached = cacheManager.get<IndexFile>(cacheKey);
  if (cached) {
    return cached;
  }

  const data = await fetchJson<IndexFile>('/data/index.json');
  cacheManager.set(cacheKey, data);
  return data;
}

/**
 * 分割ファイルを取得する
 * @param path - ファイルパス（例: "service/battle_loop.json"）
 * @returns 分割ファイルデータ
 * @throws {DataNotFoundError} ファイルが見つからない場合
 * @throws {ParseError} JSONパースに失敗した場合
 * @throws {NetworkError} ネットワークエラーが発生した場合
 */
async function loadSplitFile(path: string): Promise<SplitFile> {
  const cacheKey = `split_file_${path}`;
  const cached = cacheManager.get<SplitFile>(cacheKey);
  if (cached) {
    return cached;
  }

  const fullPath = `/data/${path}`;
  const data = await fetchJson<SplitFile>(fullPath);
  cacheManager.set(cacheKey, data);
  return data;
}

/**
 * 全アイテムのマッピング（id -> CodeItem）を構築する
 * @returns アイテムマップ
 */
async function buildItemMap(): Promise<Map<string, CodeItem>> {
  const index = await loadMainIndex();
  const itemMap = new Map<string, CodeItem>();

  // 全分割ファイルを読み込んでアイテムマップを構築
  for (const filePath of index.files) {
    const splitFile = await loadSplitFile(filePath);

    // SplitFileの構造: { path, language, items: CodeItem[] } の場合
    // または { files: SourceFile[] } の場合
    if ('items' in splitFile && Array.isArray(splitFile.items)) {
      // 直接items配列を持つ形式
      for (const item of splitFile.items) {
        itemMap.set(item.id, item);
      }
    } else if ('files' in splitFile && Array.isArray(splitFile.files)) {
      // files配列を持つ形式
      for (const sourceFile of splitFile.files) {
        for (const item of sourceFile.items) {
          itemMap.set(item.id, item);
        }
      }
    }
  }

  return itemMap;
}

/**
 * 完全なコールグラフをCytoscape形式で取得する
 * @returns Cytoscapeグラフデータ（全ノード・全エッジ）
 * @throws {DataNotFoundError} 必要なファイルが見つからない場合
 * @throws {ParseError} JSONパースに失敗した場合
 * @throws {NetworkError} ネットワークエラーが発生した場合
 */
export async function loadFullGraph(): Promise<CytoscapeData> {
  // コールグラフインデックスを読み込む
  const graphIndex = await loadCallGraphIndex();

  // アイテムマップを構築（ノード詳細情報取得用）
  const itemMap = await buildItemMap();

  // ノード配列を構築
  const nodes: CytoscapeNode[] = [];
  for (const nodeId of graphIndex.nodes) {
    const item = itemMap.get(nodeId);
    if (!item) {
      // アイテム情報が見つからない場合は基本情報のみで構築
      nodes.push({
        data: {
          id: nodeId,
          label: extractLabelFromId(nodeId),
          type: extractTypeFromId(nodeId),
          file: 'unknown',
          line: 0,
        },
      });
      continue;
    }

    nodes.push({
      data: {
        id: item.id,
        label: item.name,
        type: item.type,
        file: extractFilePathFromItem(item),
        line: item.line,
      },
    });
  }

  // エッジ配列を構築
  const edges: CytoscapeEdge[] = [];

  // edges_files が存在する場合はそれらを読み込む
  // 存在しない場合は直接 edges.json を読み込む（実データ対応）
  const edgeFiles = graphIndex.edges_files || ['edges.json'];

  for (const edgeFile of edgeFiles) {
    const edgesData = await loadCallGraphEdges(edgeFile);
    for (const edge of edgesData.edges) {
      edges.push({
        data: {
          id: `${edge.from}->${edge.to}`,
          source: edge.from,
          target: edge.to,
          callSite: {
            file: 'unknown', // エッジデータには含まれていないため不明
            line: 0,
          },
        },
      });
    }
  }

  return { nodes, edges };
}

/**
 * サブグラフを取得する（特定ノードを中心とした深さ制限付き）
 * @param centerIds - 中心となるノードID配列
 * @param depth - 深さ（0で直接の接続のみ、1で1階層先まで）
 * @returns Cytoscapeグラフデータ（部分グラフ）
 * @throws {DataNotFoundError} 必要なファイルが見つからない場合
 * @throws {ParseError} JSONパースに失敗した場合
 * @throws {NetworkError} ネットワークエラーが発生した場合
 */
export async function loadSubgraph(centerIds: string[], depth: number): Promise<CytoscapeData> {
  // 完全なグラフを読み込む
  const fullGraph = await loadFullGraph();

  // エッジマップを構築（効率的な探索のため）
  const outgoingEdges = new Map<string, CytoscapeEdge[]>();
  const incomingEdges = new Map<string, CytoscapeEdge[]>();

  for (const edge of fullGraph.edges) {
    // 出力エッジ
    if (!outgoingEdges.has(edge.data.source)) {
      outgoingEdges.set(edge.data.source, []);
    }
    outgoingEdges.get(edge.data.source)!.push(edge);

    // 入力エッジ
    if (!incomingEdges.has(edge.data.target)) {
      incomingEdges.set(edge.data.target, []);
    }
    incomingEdges.get(edge.data.target)!.push(edge);
  }

  // BFS（幅優先探索）で関連ノードを収集
  const visitedNodes = new Set<string>(centerIds);
  const nodesToExplore = [...centerIds];
  let currentDepth = 0;

  while (currentDepth < depth && nodesToExplore.length > 0) {
    const levelSize = nodesToExplore.length;

    for (let i = 0; i < levelSize; i++) {
      const currentNode = nodesToExplore.shift()!;

      // 出力エッジから接続先を追加
      const outgoing = outgoingEdges.get(currentNode) || [];
      for (const edge of outgoing) {
        if (!visitedNodes.has(edge.data.target)) {
          visitedNodes.add(edge.data.target);
          nodesToExplore.push(edge.data.target);
        }
      }

      // 入力エッジから接続元を追加
      const incoming = incomingEdges.get(currentNode) || [];
      for (const edge of incoming) {
        if (!visitedNodes.has(edge.data.source)) {
          visitedNodes.add(edge.data.source);
          nodesToExplore.push(edge.data.source);
        }
      }
    }

    currentDepth++;
  }

  // 訪問済みノードのみをフィルタ
  const filteredNodes = fullGraph.nodes.filter(node => visitedNodes.has(node.data.id));

  // 両端が訪問済みノードであるエッジのみをフィルタ
  const filteredEdges = fullGraph.edges.filter(
    edge => visitedNodes.has(edge.data.source) && visitedNodes.has(edge.data.target)
  );

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
  };
}

// ============================================
// ヘルパー関数
// ============================================

/**
 * アイテムIDからラベル（表示名）を抽出する
 * 例: "domain::core::battle::BattleLoop::run" -> "run"
 */
function extractLabelFromId(id: string): string {
  const parts = id.split('::');
  return parts[parts.length - 1] || id;
}

/**
 * アイテムIDから型情報を抽出する（簡易的）
 * 実際の型情報はCodeItemから取得すべきだが、フォールバックとして使用
 */
function extractTypeFromId(id: string): 'fn' | 'struct' | 'enum' | 'trait' | 'mod' | 'const' | 'type' | 'method' | 'impl' {
  // IDの最後の部分が大文字で始まる場合は構造体/列挙型と推定
  const label = extractLabelFromId(id);
  if (/^[A-Z]/.test(label)) {
    return 'struct';
  }
  // それ以外は関数と推定
  return 'fn';
}

/**
 * CodeItemからファイルパスを抽出する
 * SplitFileの構造に応じて適切に処理
 */
function extractFilePathFromItem(item: CodeItem): string {
  // CodeItemのIDからファイルパスを推定
  // 例: "domain::core::battle::service::battle_loop::BattleLoop" -> "domain/core/battle/service/battle_loop.rs"
  const parts = item.id.split('::');

  // 最後の1つまたは2つの要素（アイテム名）を除外してパスを構築
  let pathParts: string[];
  if (parts.length > 2 && /^[A-Z]/.test(parts[parts.length - 1])) {
    // 構造体やメソッドの場合（例: "BattleLoop" または "BattleLoop::run"）
    pathParts = parts.slice(0, -2);
  } else {
    // 関数の場合
    pathParts = parts.slice(0, -1);
  }

  const filePath = pathParts.join('/') + '.rs';
  return filePath;
}

/**
 * 汎用JSONフェッチ関数
 * @param url - 取得するJSONファイルのURL
 * @returns パースされたJSONデータ
 * @throws {DataNotFoundError} ファイルが見つからない場合（404）
 * @throws {ParseError} JSONパースに失敗した場合
 * @throws {NetworkError} ネットワークエラーが発生した場合
 */
async function fetchJson<T>(url: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url);
  } catch (error) {
    throw new NetworkError(url, error);
  }

  // 404エラーの場合はDataNotFoundErrorをスロー
  if (response.status === 404) {
    throw new DataNotFoundError(url);
  }

  // その他のHTTPエラーの場合はNetworkErrorをスロー
  if (!response.ok) {
    throw new NetworkError(url, {
      status: response.status,
      statusText: response.statusText,
    });
  }

  // JSONパース
  try {
    return await response.json() as T;
  } catch (error) {
    throw new ParseError(url, error);
  }
}
