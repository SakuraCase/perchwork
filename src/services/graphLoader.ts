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
import * as cacheManager from './cacheManager';
import { fetchJson } from './httpClient';
import { getIdLabel, isTestId, inferTypeFromId } from '@/utils/idParser';

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

  const data = await fetchJson<CallGraphEdgesData>('/data/structure/call_graph/edges.json');
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

  const data = await fetchJson<IndexFile>('/data/structure/index.json');
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

  const fullPath = `/data/structure/${path}`;
  const data = await fetchJson<SplitFile>(fullPath);
  cacheManager.set(cacheKey, data);
  return data;
}

/**
 * ファイルパス情報付きのCodeItem
 */
interface CodeItemWithFile extends CodeItem {
  _filePath: string; // index.jsonのファイルパス形式（例: "service/battle_loop.json"）
}

/**
 * 全アイテムのマッピング（id -> CodeItem）を構築する
 * @returns アイテムマップ（各アイテムにファイルパス情報を付加）
 */
async function buildItemMap(): Promise<Map<string, CodeItemWithFile>> {
  const index = await loadMainIndex();
  const itemMap = new Map<string, CodeItemWithFile>();
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
        itemMap.set(item.id, { ...item, _filePath: fileEntry.path });
      }
    } else if ('files' in rawFile && Array.isArray(rawFile.files)) {
      // files配列を持つ形式
      for (const sourceFile of rawFile.files) {
        for (const item of sourceFile.items) {
          itemMap.set(item.id, { ...item, _filePath: fileEntry.path });
        }
      }
    }
  }

  console.log('[buildItemMap] Total items loaded:', itemMap.size);
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
    nodeIds.add(edge.to);  // 解決済みの完全なIDなので追加
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
          label: getIdLabel(nodeId),
          type: inferTypeFromId(nodeId),
          file: 'unknown',
          line: 0,
        },
      });
      continue;
    }

    nodes.push({
      data: {
        id: item.id,
        label: generateNodeLabel(item),
        type: item.type,
        file: item._filePath,
        line: item.line_start,
        implFor: item.impl_for,
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
        context: edge.context,
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
 * ノードの表示ラベルを生成する
 * メソッドの場合は "StructName::method_name" 形式
 * それ以外は名前のみ
 */
function generateNodeLabel(item: CodeItemWithFile): string {
  if (item.type === 'method' && item.impl_for) {
    return `${item.impl_for}::${item.name}`;
  }
  return item.name;
}
