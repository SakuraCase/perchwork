/**
 * Callers インデックス構築と検索サービス
 *
 * コールグラフから逆引きインデックスを構築し、
 * 特定の関数/構造体を呼び出している箇所（Callers）を
 * 効率的に検索できるようにする。
 */

import type { ItemId, GraphNode } from '../types/schema';
import type { Caller, CallersTreeNode, CallersIndex } from '../types/callers';
import type { CallGraphChunk } from '../types/schema';

/**
 * コールグラフチャンクから Callers インデックスを構築する
 *
 * @param chunks コールグラフチャンクの配列
 * @returns Callers インデックス
 */
export function buildIndex(chunks: CallGraphChunk[]): CallersIndex {
  const calledBy = new Map<ItemId, Caller[]>();
  let edgeCount = 0;

  // ノードIDからノード情報へのマップを構築（効率化のため）
  const nodeMap = new Map<ItemId, GraphNode>();
  for (const chunk of chunks) {
    for (const node of chunk.nodes) {
      nodeMap.set(node.id, node);
    }
  }

  // 各エッジを処理して逆引きインデックスを構築
  for (const chunk of chunks) {
    for (const edge of chunk.edges) {
      const callerNode = nodeMap.get(edge.from);
      if (!callerNode) {
        continue; // ノード情報が見つからない場合はスキップ
      }

      const caller: Caller = {
        id: edge.from,
        name: extractNameFromId(edge.from),
        file: callerNode.file,
        line: callerNode.line,
        callSite: {
          file: edge.call_site.file,
          line: edge.call_site.line,
        },
      };

      // 呼び出し先（to）をキーとして、呼び出し元（from）を登録
      if (!calledBy.has(edge.to)) {
        calledBy.set(edge.to, []);
      }
      calledBy.get(edge.to)!.push(caller);
      edgeCount++;
    }
  }

  return {
    calledBy,
    builtAt: new Date().toISOString(),
    nodeCount: nodeMap.size,
    edgeCount,
  };
}

/**
 * ItemId から名前部分を抽出する
 *
 * @param id ItemId (例: "path/to/file.rs::FunctionName::fn")
 * @returns 名前部分 (例: "FunctionName")
 */
function extractNameFromId(id: ItemId): string {
  const parts = id.split('::');
  if (parts.length >= 2) {
    return parts[parts.length - 2]; // 型名の直前の部分
  }
  return id;
}

/**
 * 特定のアイテムを直接呼び出している Callers を取得する
 *
 * @param index Callers インデックス
 * @param targetId 対象アイテムID
 * @returns Callers の配列
 */
export function getCallers(index: CallersIndex, targetId: ItemId): Caller[] {
  return index.calledBy.get(targetId) || [];
}

/**
 * Callers のツリー構造を構築する（再帰的に呼び出し元をたどる）
 *
 * @param index Callers インデックス
 * @param targetId 対象アイテムID
 * @param maxDepth 最大深度（デフォルト: 10）
 * @returns Callers のツリー構造
 */
export function getCallersTree(
  index: CallersIndex,
  targetId: ItemId,
  maxDepth: number = 10
): CallersTreeNode {
  const visited = new Set<ItemId>();

  // ルートノードを作成（仮想的なルート）
  const rootCaller: Caller = {
    id: targetId,
    name: extractNameFromId(targetId),
    file: '',
    line: 0,
    callSite: { file: '', line: 0 },
  };

  const rootNode: CallersTreeNode = {
    caller: rootCaller,
    depth: 0,
    children: [],
    isExpanded: true,
  };

  // 直接の Callers を子ノードとして追加
  const directCallers = getCallers(index, targetId);
  for (const caller of directCallers) {
    const childNode = buildTreeNode(index, caller, 1, maxDepth, visited);
    rootNode.children.push(childNode);
  }

  return rootNode;
}

/**
 * ツリーノードを再帰的に構築する（内部ヘルパー関数）
 *
 * @param index Callers インデックス
 * @param caller 現在の Caller
 * @param depth 現在の深さ
 * @param maxDepth 最大深度
 * @param visited 訪問済みノード（循環参照の検出用）
 * @returns ツリーノード
 */
function buildTreeNode(
  index: CallersIndex,
  caller: Caller,
  depth: number,
  maxDepth: number,
  visited: Set<ItemId>
): CallersTreeNode {
  const node: CallersTreeNode = {
    caller,
    depth,
    children: [],
    isExpanded: depth < 2, // デフォルトで深さ2まで展開
  };

  // 最大深度に達したか、既に訪問済みの場合は終了（循環参照対策）
  if (depth >= maxDepth || visited.has(caller.id)) {
    return node;
  }

  // 訪問済みマークを追加
  visited.add(caller.id);

  // 再帰的に Callers の Callers を探索
  const nextCallers = getCallers(index, caller.id);
  for (const nextCaller of nextCallers) {
    const childNode = buildTreeNode(index, nextCaller, depth + 1, maxDepth, visited);
    node.children.push(childNode);
  }

  // バックトラック（他の経路で同じノードを訪問できるように）
  visited.delete(caller.id);

  return node;
}
