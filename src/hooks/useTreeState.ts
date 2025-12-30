/**
 * ツリーの展開状態管理を行うカスタムフック
 */

import { useState, useMemo, useCallback } from 'react';
import type { IndexFile, IndexFileEntry } from '../types/schema';
import type { TreeNode } from '../types/ui';

/**
 * ツリーの展開状態を管理するフック
 *
 * index.json のファイル一覧からツリー構造を構築し、展開/折りたたみ状態を管理する
 *
 * @param index - インデックスファイル（nullの場合は空のツリーを返す）
 * @returns nodes - ツリーノードの配列
 * @returns expandedPaths - 展開中のパスのセット
 * @returns toggleExpand - パスの展開/折りたたみを切り替える関数
 */
export function useTreeState(index: IndexFile | null) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  /**
   * index.json のファイル一覧からツリー構造を構築
   */
  const nodes = useMemo(() => {
    if (!index) {
      return [];
    }

    return buildTreeFromFiles(index.files, expandedPaths);
  }, [index, expandedPaths]);

  /**
   * パスの展開/折りたたみを切り替える
   *
   * @param path - 切り替えるパス
   */
  const toggleExpand = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  return {
    nodes,
    expandedPaths,
    toggleExpand,
  };
}

/**
 * ファイルエントリの配列からツリー構造を構築
 *
 * @param files - ファイルエントリの配列
 * @param expandedPaths - 展開中のパスのセット
 * @returns ツリーノードの配列
 */
function buildTreeFromFiles(files: IndexFileEntry[], expandedPaths: Set<string>): TreeNode[] {
  // ルートノードを保持するマップ (path -> TreeNode)
  const nodeMap = new Map<string, TreeNode>();

  for (const fileEntry of files) {
    // パスを正規化（先頭と末尾のスラッシュを除去）
    const normalizedPath = normalizePath(fileEntry.path);

    // パスをセグメントに分割（例: "domain/core/entity/unit.json" -> ["domain", "core", "entity", "unit.json"]）
    const segments = normalizedPath.split('/');

    // 各セグメントのノードを順に構築
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const currentPath = segments.slice(0, i + 1).join('/');
      const isFile = i === segments.length - 1;

      // 既に作成済みのノードならスキップ
      if (nodeMap.has(currentPath)) {
        continue;
      }

      // 新しいノードを作成
      const node: TreeNode = {
        id: currentPath,
        name: segment,
        type: isFile ? 'file' : 'directory',
        path: currentPath,
        children: isFile ? undefined : [],
        itemCount: isFile ? fileEntry.items : undefined,
        isLoaded: false,
        isExpanded: expandedPaths.has(currentPath),
      };

      nodeMap.set(currentPath, node);

      // 親ノードに追加
      if (i > 0) {
        const parentPath = segments.slice(0, i).join('/');
        const parent = nodeMap.get(parentPath);
        if (parent && parent.children) {
          parent.children.push(node);
        }
      }
    }
  }

  // ルートノード（親を持たないノード）を抽出
  const rootNodes: TreeNode[] = [];
  const allPaths = Array.from(nodeMap.keys());

  for (const path of allPaths) {
    const isRoot = !allPaths.some((p) => p !== path && path.startsWith(p + '/'));
    if (isRoot) {
      const node = nodeMap.get(path);
      if (node) {
        rootNodes.push(node);
      }
    }
  }

  // 各ノードの子をソート（ディレクトリが先、その後ファイル、それぞれアルファベット順）
  sortTreeNodes(rootNodes);

  return rootNodes;
}

/**
 * パスを正規化（先頭と末尾のスラッシュを除去）
 *
 * @param path - 正規化するパス
 * @returns 正規化されたパス
 */
function normalizePath(path: string): string {
  return path.replace(/^\/+|\/+$/g, '');
}

/**
 * ツリーノードを再帰的にソート
 *
 * ディレクトリが先、その後ファイル、それぞれアルファベット順にソートする
 *
 * @param nodes - ソートするノードの配列
 */
function sortTreeNodes(nodes: TreeNode[]): void {
  nodes.sort((a, b) => {
    // ディレクトリを優先
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    // 同じタイプの場合はアルファベット順
    return a.name.localeCompare(b.name);
  });

  // 子ノードも再帰的にソート
  for (const node of nodes) {
    if (node.children) {
      sortTreeNodes(node.children);
    }
  }
}
