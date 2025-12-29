/**
 * Callers の取得と管理を行うカスタムフック
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ItemId } from '../types/schema';
import type { Caller, CallersTreeNode, CallersIndex } from '../types/callers';
import { getCallersTree } from '../services/callersIndexer';

/**
 * フックのオプション
 */
interface UseCallersOptions {
  /** 最大深度（デフォルト: 10） */
  maxDepth?: number;
}

/**
 * フックの戻り値
 */
interface UseCallersResult {
  /** 直接 Callers の一覧 */
  callers: Caller[];

  /** Callers のツリー構造（階層表示用） */
  callersTree: CallersTreeNode | null;

  /** 読み込み中かどうか */
  isLoading: boolean;

  /** エラーメッセージ */
  error: string | null;

  /** 合計 Callers 数 */
  totalCount: number;

  /** ツリーノードの展開状態をトグルする */
  toggleExpand: (nodeId: ItemId) => void;

  /** 特定の深さまで全て展開する */
  expandToDepth: (depth: number) => void;

  /** 全てを折りたたむ */
  collapseAll: () => void;
}

/**
 * Callers の取得と管理を行うカスタムフック
 *
 * @param targetId 対象アイテムID
 * @param callersIndex Callers インデックス（事前に構築済み）
 * @param options オプション設定
 * @returns Callers情報と操作関数
 */
export function useCallers(
  targetId: ItemId | null,
  callersIndex: CallersIndex | null,
  options: UseCallersOptions = {}
): UseCallersResult {
  const { maxDepth = 10 } = options;

  // 状態管理
  const [callersTree, setCallersTree] = useState<CallersTreeNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Callers の取得と更新
  useEffect(() => {
    if (!targetId || !callersIndex) {
      setCallersTree(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const tree = getCallersTree(callersIndex, targetId, maxDepth);
      setCallersTree(tree);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [targetId, callersIndex, maxDepth]);

  // 直接 Callers（ツリーのルートの子供）
  const callers = useMemo(() => {
    if (!callersTree) return [];
    return callersTree.children.map(node => node.caller);
  }, [callersTree]);

  // 合計 Callers 数（ツリー全体を再帰的にカウント）
  const totalCount = useMemo(() => {
    if (!callersTree) return 0;

    function countNodes(node: CallersTreeNode): number {
      return node.children.reduce((sum, child) => sum + 1 + countNodes(child), 0);
    }

    return countNodes(callersTree);
  }, [callersTree]);

  // ノードの展開トグル
  const toggleExpand = useCallback((nodeId: ItemId) => {
    setCallersTree(prev => {
      if (!prev) return null;

      function updateNode(node: CallersTreeNode): CallersTreeNode {
        if (node.caller.id === nodeId) {
          return { ...node, isExpanded: !node.isExpanded };
        }
        return {
          ...node,
          children: node.children.map(updateNode),
        };
      }

      return updateNode(prev);
    });
  }, []);

  // 特定の深さまで展開
  const expandToDepth = useCallback((depth: number) => {
    setCallersTree(prev => {
      if (!prev) return null;

      function updateNode(node: CallersTreeNode): CallersTreeNode {
        return {
          ...node,
          isExpanded: node.depth < depth,
          children: node.children.map(updateNode),
        };
      }

      return updateNode(prev);
    });
  }, []);

  // 全て折りたたむ
  const collapseAll = useCallback(() => {
    setCallersTree(prev => {
      if (!prev) return null;

      function updateNode(node: CallersTreeNode): CallersTreeNode {
        return {
          ...node,
          isExpanded: node.depth === 0, // ルートのみ展開
          children: node.children.map(updateNode),
        };
      }

      return updateNode(prev);
    });
  }, []);

  return {
    callers,
    callersTree,
    isLoading,
    error,
    totalCount,
    toggleExpand,
    expandToDepth,
    collapseAll,
  };
}
