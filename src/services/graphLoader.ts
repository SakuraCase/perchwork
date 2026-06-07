/**
 * call_graph データの読み込みとCytoscape形式への変換
 */

import type {
  CallGraphEdgesData,
  CallGraphEdgeData,
  CytoscapeData,
  CytoscapeNode,
  CytoscapeEdge,
} from '../types/graph';
import type { CallGraphIndex, IndexFile, SplitFile, CodeItem } from '../types/schema';
import * as cacheManager from './cacheManager';
import { fetchJson, fetchJsonOrNull } from './httpClient';
import { getIdFile, getIdLabel, isTestId, inferTypeFromId } from '@/utils/idParser';

const INITIAL_GRAPH_EDGE_LIMIT = 2500;
const INITIAL_GRAPH_SPLIT_FILE_LIMIT = 80;

interface LoadedCallGraphEdgesData extends CallGraphEdgesData {
  isPartial: boolean;
  loadedEdges: number;
  source: 'chunked' | 'legacy';
}

interface LoadCallGraphEdgesOptions {
  edgeLimit?: number;
}

interface LoadGraphOptions {
  edgeLimit?: number;
  splitFileLimit?: number;
}

interface ItemMapResult {
  itemMap: Map<string, CodeItemWithFile>;
  loadedFiles: number;
  totalFiles: number;
  isPartial: boolean;
}

/**
 * call_graph/edges.json を取得する
 * @returns エッジデータ
 * @throws {DataNotFoundError} ファイルが見つからない場合
 * @throws {ParseError} JSONパースに失敗した場合
 * @throws {NetworkError} ネットワークエラーが発生した場合
 */
export async function loadCallGraphEdges(
  options: LoadCallGraphEdgesOptions = {}
): Promise<LoadedCallGraphEdgesData> {
  if (options.edgeLimit !== undefined) {
    try {
      const chunkedData = await loadChunkedCallGraphEdges(options.edgeLimit);
      if (chunkedData) {
        return chunkedData;
      }
    } catch (error) {
      console.warn('Failed to load chunked call graph. Falling back to edges.json:', error);
    }
  }

  const cacheKey = 'call_graph_edges';
  const cached = cacheManager.get<CallGraphEdgesData>(cacheKey);
  const data = cached ?? (await fetchJson<CallGraphEdgesData>('/data/structure/call_graph/edges.json'));
  if (!cached) {
    cacheManager.set(cacheKey, data);
  }

  if (options.edgeLimit !== undefined && data.edges.length > options.edgeLimit) {
    const edges = data.edges.slice(0, options.edgeLimit);
    return {
      ...data,
      edges,
      loadedEdges: edges.length,
      isPartial: true,
      source: 'legacy',
    };
  }

  return {
    ...data,
    loadedEdges: data.edges.length,
    isPartial: false,
    source: 'legacy',
  };
}

async function loadChunkedCallGraphEdges(edgeLimit: number): Promise<LoadedCallGraphEdgesData | null> {
  const cacheKey = `call_graph_edges_chunked_${edgeLimit}`;
  const cached = cacheManager.get<LoadedCallGraphEdgesData>(cacheKey);
  if (cached) {
    return cached;
  }

  const index = await fetchJsonOrNull<CallGraphIndex>('/data/structure/call_graph/index.json');
  if (!index || index.chunks.length === 0) {
    return null;
  }

  const edges: CallGraphEdgeData[] = [];
  for (const chunk of index.chunks) {
    if (edges.length >= edgeLimit) {
      break;
    }

    const chunkData = await loadCallGraphChunkEdges(chunk.path);
    edges.push(...chunkData.edges);
  }

  const limitedEdges = edges.slice(0, edgeLimit);
  const data: LoadedCallGraphEdgesData = {
    generated_at: index.generated_at,
    total_edges: index.statistics.total_edges,
    edges: limitedEdges,
    loadedEdges: limitedEdges.length,
    isPartial: index.statistics.total_edges > limitedEdges.length,
    source: 'chunked',
  };

  cacheManager.set(cacheKey, data);
  return data;
}

async function loadCallGraphChunkEdges(path: string): Promise<CallGraphEdgesData> {
  const normalizedPath = normalizeCallGraphChunkPath(path);
  const cacheKey = `call_graph_chunk_${normalizedPath}`;
  const cached = cacheManager.get<CallGraphEdgesData>(cacheKey);
  if (cached) {
    return cached;
  }

  const data = await fetchJson<CallGraphEdgesData>(`/data/structure/${normalizedPath}`);
  cacheManager.set(cacheKey, data);
  return data;
}

function normalizeCallGraphChunkPath(path: string): string {
  if (path.startsWith('/data/structure/')) {
    return path.slice('/data/structure/'.length);
  }
  if (path.startsWith('call_graph/')) {
    return path;
  }
  return `call_graph/${path}`;
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
async function buildItemMap(
  nodeIds?: Set<string>,
  sourceFiles?: Set<string>,
  splitFileLimit?: number
): Promise<ItemMapResult> {
  const index = await loadMainIndex();
  const itemMap = new Map<string, CodeItemWithFile>();
  const candidatePaths = buildCandidateSplitFileSet(index, nodeIds, sourceFiles);
  const targetFiles = candidatePaths
    ? index.files.filter((fileEntry) => candidatePaths.has(fileEntry.path))
    : index.files;
  const limitedFiles = splitFileLimit === undefined
    ? targetFiles
    : targetFiles.slice(0, splitFileLimit);

  for (const fileEntry of limitedFiles) {
    const splitFile = await loadSplitFile(fileEntry.path);
    for (const item of extractItemsWithFile(splitFile, fileEntry.path)) {
      itemMap.set(item.id, item);
    }
  }

  return {
    itemMap,
    loadedFiles: limitedFiles.length,
    totalFiles: index.files.length,
    isPartial: limitedFiles.length < targetFiles.length,
  };
}

function buildCandidateSplitFileSet(
  index: IndexFile,
  nodeIds?: Set<string>,
  sourceFiles?: Set<string>
): Set<string> | null {
  if ((!nodeIds || nodeIds.size === 0) && (!sourceFiles || sourceFiles.size === 0)) {
    return null;
  }

  const exactPaths = new Set(index.files.map((fileEntry) => fileEntry.path));
  const basenameToPaths = new Map<string, string[]>();
  for (const fileEntry of index.files) {
    const basename = getPathBasename(fileEntry.path);
    const paths = basenameToPaths.get(basename) ?? [];
    paths.push(fileEntry.path);
    basenameToPaths.set(basename, paths);
  }

  const candidateKeys = new Set<string>();
  for (const nodeId of nodeIds ?? []) {
    for (const key of getJsonPathCandidates(getIdFile(nodeId))) {
      candidateKeys.add(key);
    }
  }
  for (const sourceFile of sourceFiles ?? []) {
    for (const key of getJsonPathCandidates(sourceFile)) {
      candidateKeys.add(key);
    }
  }

  const result = new Set<string>();
  for (const key of candidateKeys) {
    if (exactPaths.has(key)) {
      result.add(key);
    }

    const basename = getPathBasename(key);
    for (const path of basenameToPaths.get(basename) ?? []) {
      result.add(path);
    }
  }

  return result;
}

function getJsonPathCandidates(pathOrIdFile: string): string[] {
  if (!pathOrIdFile || pathOrIdFile === 'unknown') {
    return [];
  }

  const normalized = pathOrIdFile.replace(/\\/g, '/');
  const withoutQuery = normalized.split('?')[0];
  const withoutExtension = withoutQuery.endsWith('.rs')
    ? withoutQuery.slice(0, -'.rs'.length)
    : withoutQuery.endsWith('.json')
      ? withoutQuery.slice(0, -'.json'.length)
      : withoutQuery;
  const jsonPath = `${withoutExtension}.json`;
  return [jsonPath, getPathBasename(jsonPath)];
}

function getPathBasename(value: string): string {
  const normalized = value.replace(/\\/g, '/');
  return normalized.split('/').pop() || normalized;
}

function extractItemsWithFile(splitFile: SplitFile, fallbackFilePath: string): CodeItemWithFile[] {
  const items: CodeItemWithFile[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawFile = splitFile as any;

  if ('items' in rawFile && Array.isArray(rawFile.items)) {
    for (const item of rawFile.items as CodeItem[]) {
      items.push({ ...item, _filePath: fallbackFilePath });
    }
  } else if ('files' in rawFile && Array.isArray(rawFile.files)) {
    for (const sourceFile of rawFile.files) {
      for (const item of sourceFile.items as CodeItem[]) {
        items.push({ ...item, _filePath: fallbackFilePath });
      }
    }
  }

  return items;
}

export async function loadGraphNodeFromFile(
  nodeId: string,
  filePath: string
): Promise<CytoscapeNode | null> {
  const index = await loadMainIndex();
  const candidatePaths = buildCandidateSplitFileSet(
    index,
    new Set([nodeId]),
    new Set([filePath])
  );
  const paths = candidatePaths ? [...candidatePaths] : [filePath];

  for (const path of paths) {
    try {
      const splitFile = await loadSplitFile(path);
      const item = extractItemsWithFile(splitFile, path).find((candidate) => candidate.id === nodeId);
      if (item) {
        return createNode(item.id, item);
      }
    } catch {
      // 候補パスの一部が存在しない場合は次の候補を試す
    }
  }

  return null;
}

/**
 * 初期表示向けの軽量なコールグラフをCytoscape形式で取得する
 * @returns Cytoscapeグラフデータ（上限付き）
 */
export async function loadInitialGraph(): Promise<CytoscapeData> {
  return loadGraph({
    edgeLimit: INITIAL_GRAPH_EDGE_LIMIT,
    splitFileLimit: INITIAL_GRAPH_SPLIT_FILE_LIMIT,
  });
}

/**
 * 完全なコールグラフをCytoscape形式で取得する
 * @returns Cytoscapeグラフデータ（全ノード・全エッジ）
 * @throws {DataNotFoundError} 必要なファイルが見つからない場合
 * @throws {ParseError} JSONパースに失敗した場合
 * @throws {NetworkError} ネットワークエラーが発生した場合
 */
export async function loadFullGraph(options: LoadGraphOptions = {}): Promise<CytoscapeData> {
  return loadGraph(options);
}

async function loadGraph(options: LoadGraphOptions): Promise<CytoscapeData> {
  // エッジデータを読み込む
  const edgesData = await loadCallGraphEdges({ edgeLimit: options.edgeLimit });

  // テストを除外したエッジをフィルタ
  const filteredEdges = edgesData.edges.filter(edge => !isTestId(edge.from));

  // エッジからノードIDを収集
  const nodeIds = new Set<string>();
  const sourceFiles = new Set<string>();
  for (const edge of filteredEdges) {
    nodeIds.add(edge.from);
    nodeIds.add(edge.to);  // 解決済みの完全なIDなので追加
    sourceFiles.add(edge.file);
  }

  // 表示対象ノードに関係する分割ファイルだけ読み込む
  const itemMapResult = await buildItemMap(nodeIds, sourceFiles, options.splitFileLimit);
  const itemMap = itemMapResult.itemMap;

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

    nodes.push(createNode(item.id, item));
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

  return {
    nodes,
    edges,
    meta: {
      isPartial: edgesData.isPartial || itemMapResult.isPartial,
      totalEdges: edgesData.total_edges,
      loadedEdges: filteredEdges.length,
      totalFiles: itemMapResult.totalFiles,
      loadedFiles: itemMapResult.loadedFiles,
      loadedNodes: nodes.length,
      source: edgesData.source,
    },
  };
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

function createNode(nodeId: string, item: CodeItemWithFile): CytoscapeNode {
  return {
    data: {
      id: nodeId,
      label: generateNodeLabel(item),
      type: item.type,
      file: item._filePath,
      line: item.line_start,
      implFor: item.impl_for,
    },
  };
}
