/**
 * call_graph データの読み込みとCytoscape形式への変換
 */

import type {
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
 * call_graph/edges.json を取得する
 * @returns エッジデータ
 * @throws {DataNotFoundError} ファイルが見つからない場合
 * @throws {ParseError} JSONパースに失敗した場合
 * @throws {NetworkError} ネットワークエラーが発生した場合
 */
export async function loadCallGraphEdges(): Promise<CallGraphEdgesData> {
  const cacheKey = 'call_graph_edges';
  const cached = cacheManager.get<CallGraphEdgesData>(cacheKey);
  if (cached) {
    return cached;
  }

  const data = await fetchJson<CallGraphEdgesData>('/data/call_graph/edges.json');
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
  console.log('[buildItemMap] Loading', index.files.length, 'files');

  // 全分割ファイルを読み込んでアイテムマップを構築
  for (const fileEntry of index.files) {
    const splitFile = await loadSplitFile(fileEntry.path);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawFile = splitFile as any;

    // SplitFileの構造: { path, language, items: CodeItem[] } の場合
    // または { files: SourceFile[] } の場合
    if ('items' in rawFile && Array.isArray(rawFile.items)) {
      // 直接items配列を持つ形式
      for (const item of rawFile.items) {
        itemMap.set(item.id, item);
      }
    } else if ('files' in rawFile && Array.isArray(rawFile.files)) {
      // files配列を持つ形式
      for (const sourceFile of rawFile.files) {
        for (const item of sourceFile.items) {
          itemMap.set(item.id, item);
        }
      }
    }
  }

  console.log('[buildItemMap] Total items loaded:', itemMap.size);
  return itemMap;
}

/**
 * テスト関数のIDかどうかを判定
 */
function isTestId(id: string): boolean {
  return id.endsWith('::test') || id.includes('::test_');
}

/**
 * 完全なコールグラフをCytoscape形式で取得する
 * @returns Cytoscapeグラフデータ（全ノード・全エッジ）
 * @throws {DataNotFoundError} 必要なファイルが見つからない場合
 * @throws {ParseError} JSONパースに失敗した場合
 * @throws {NetworkError} ネットワークエラーが発生した場合
 */
export async function loadFullGraph(): Promise<CytoscapeData> {
  // エッジデータを読み込む
  const edgesData = await loadCallGraphEdges();
  console.log('[graphLoader] Loaded edges:', edgesData.edges.length);

  // アイテムマップを構築（ノード詳細情報取得用）
  const itemMap = await buildItemMap();
  console.log('[graphLoader] Built itemMap:', itemMap.size);

  // テストを除外したエッジをフィルタ
  const filteredEdges = edgesData.edges.filter(edge => !isTestId(edge.from));
  console.log('[graphLoader] Filtered edges (non-test):', filteredEdges.length);

  // エッジからノードIDを収集
  const nodeIds = new Set<string>();
  for (const edge of filteredEdges) {
    nodeIds.add(edge.from);
    // toはメソッド名だけの場合があるのでノードとしては追加しない
  }

  // ノード配列を構築
  const nodes: CytoscapeNode[] = [];
  for (const nodeId of nodeIds) {
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
        line: item.line_start,
      },
    });
  }

  // ノード名からIDへのマッピングを構築（内部呼び出しの解決用）
  // 例: "BattleState::new" -> "battle_state.rs::BattleState::new::method"
  const nameToIdMap = new Map<string, string>();
  for (const nodeId of nodeIds) {
    // IDからメソッド/関数名を抽出（例: "battle_state.rs::BattleState::new::method" -> "BattleState::new"）
    const parts = nodeId.split('::');
    if (parts.length >= 3) {
      // 型名::メソッド名 の形式でマッピング
      const typeName = parts[parts.length - 3]; // 型名
      const methodName = parts[parts.length - 2]; // メソッド/関数名
      const key = `${typeName}::${methodName}`;
      nameToIdMap.set(key, nodeId);
      // メソッド名のみでもマッピング
      nameToIdMap.set(methodName, nodeId);
    }
  }

  // エッジ配列を構築（ターゲットが解決できるもののみ）
  const edges: CytoscapeEdge[] = [];
  for (const edge of filteredEdges) {
    // ターゲットを解決
    let targetId = edge.to;

    // 完全なIDとしてマッチするか
    if (!nodeIds.has(targetId)) {
      // 名前でマッチを試みる
      const resolved = nameToIdMap.get(edge.to);
      if (resolved) {
        targetId = resolved;
      } else {
        // 解決できない場合はスキップ（外部呼び出し）
        continue;
      }
    }

    edges.push({
      data: {
        id: `${edge.from}->${targetId}@${edge.line}`,
        source: edge.from,
        target: targetId,
        callSite: {
          file: edge.file,
          line: edge.line,
        },
      },
    });
  }

  console.log('[graphLoader] Final result - nodes:', nodes.length, 'edges:', edges.length, '(filtered from', filteredEdges.length, 'edges)');
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
