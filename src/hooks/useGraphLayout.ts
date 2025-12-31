/**
 * グラフレイアウトとフィルタの状態管理を行うカスタムフック
 */

import { useState, useEffect, useCallback } from 'react';
import type { LayoutOptions, LayoutType, GraphFilter } from '../types/graph';

/**
 * useGraphLayout フックの戻り値型
 */
export interface UseGraphLayoutResult {
  /** 現在のレイアウト設定 */
  layoutOptions: LayoutOptions;

  /** レイアウトタイプ変更 */
  setLayoutType: (type: LayoutType) => void;

  /** 現在のフィルタ設定 */
  filter: GraphFilter;

  /** フィルタ更新 */
  updateFilter: (filter: Partial<GraphFilter>) => void;

  /** フォーカスノードをクリア */
  clearFocusNode: () => void;

  /** ノードを除外リストに追加 */
  excludeNode: (nodeId: string) => void;

  /** 除外リストをクリア */
  clearExcludedNodes: () => void;
}

/**
 * デフォルトのレイアウトオプション
 */
const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  type: 'hierarchical',
  animate: true,
  animationDuration: 500,
  fit: true,
  padding: 50,
};

/**
 * デフォルトのフィルタ設定
 */
const DEFAULT_FILTER: GraphFilter = {
  directories: [],
  types: ['struct', 'fn', 'trait', 'enum', 'type', 'method', 'impl'],
  includeIsolated: true,
  maxDepth: 0, // 0 = 無制限
  focusNodeId: undefined,
  excludeNodeIds: [],
};

/**
 * localStorage のキー
 */
const STORAGE_KEY_LAYOUT = 'perchwork-graph-layout';
const STORAGE_KEY_FILTER = 'perchwork-graph-filter';

/**
 * グラフのレイアウト状態管理とフィルタ状態管理を行うカスタムフック
 *
 * - レイアウト設定の管理
 * - フィルタ設定の管理
 * - デフォルト値の提供
 * - 設定の永続化（localStorage）
 *
 * @returns レイアウトとフィルタの管理インターフェース
 */
export function useGraphLayout(): UseGraphLayoutResult {
  // レイアウトオプションの状態
  const [layoutOptions, setLayoutOptions] = useState<LayoutOptions>(() => {
    return loadLayoutOptions();
  });

  // フィルタの状態
  const [filter, setFilter] = useState<GraphFilter>(() => {
    return loadFilter();
  });

  /**
   * レイアウトオプションが変更されたら localStorage に保存
   */
  useEffect(() => {
    saveLayoutOptions(layoutOptions);
  }, [layoutOptions]);

  /**
   * フィルタが変更されたら localStorage に保存
   */
  useEffect(() => {
    saveFilter(filter);
  }, [filter]);

  /**
   * レイアウトタイプを変更
   *
   * @param type - 新しいレイアウトタイプ
   */
  const setLayoutType = useCallback((type: LayoutType) => {
    setLayoutOptions((prev) => ({
      ...prev,
      type,
    }));
  }, []);

  /**
   * フィルタを部分的に更新
   *
   * @param filterUpdates - 更新するフィルタ設定（一部のみ指定可能）
   */
  const updateFilter = useCallback((filterUpdates: Partial<GraphFilter>) => {
    setFilter((prev) => ({
      ...prev,
      ...filterUpdates,
    }));
  }, []);

  /**
   * フォーカスノードをクリア
   */
  const clearFocusNode = useCallback(() => {
    setFilter((prev) => ({
      ...prev,
      focusNodeId: undefined,
    }));
  }, []);

  /**
   * ノードを除外リストに追加
   *
   * @param nodeId - 除外するノードID
   */
  const excludeNode = useCallback((nodeId: string) => {
    setFilter((prev) => ({
      ...prev,
      excludeNodeIds: [...prev.excludeNodeIds, nodeId],
    }));
  }, []);

  /**
   * 除外リストをクリア
   */
  const clearExcludedNodes = useCallback(() => {
    setFilter((prev) => ({
      ...prev,
      excludeNodeIds: [],
    }));
  }, []);

  return {
    layoutOptions,
    setLayoutType,
    filter,
    updateFilter,
    clearFocusNode,
    excludeNode,
    clearExcludedNodes,
  };
}

/**
 * localStorage からレイアウトオプションを読み込む
 *
 * @returns 読み込まれたレイアウトオプション、または読み込み失敗時はデフォルト値
 */
function loadLayoutOptions(): LayoutOptions {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_LAYOUT);
    if (stored) {
      const parsed = JSON.parse(stored) as LayoutOptions;
      // バリデーション: 必須フィールドが存在するか確認
      if (validateLayoutOptions(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Failed to load layout options from localStorage:', error);
  }
  return DEFAULT_LAYOUT_OPTIONS;
}

/**
 * localStorage にレイアウトオプションを保存
 *
 * @param options - 保存するレイアウトオプション
 */
function saveLayoutOptions(options: LayoutOptions): void {
  try {
    localStorage.setItem(STORAGE_KEY_LAYOUT, JSON.stringify(options));
  } catch (error) {
    console.warn('Failed to save layout options to localStorage:', error);
  }
}

/**
 * localStorage からフィルタを読み込む
 *
 * @returns 読み込まれたフィルタ、または読み込み失敗時はデフォルト値
 */
function loadFilter(): GraphFilter {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_FILTER);
    if (stored) {
      const parsed = JSON.parse(stored) as GraphFilter;
      // バリデーション: 必須フィールドが存在するか確認
      if (validateFilter(parsed)) {
        // 互換性チェック: 新しいタイプ（method, impl）が含まれていない場合はデフォルトにリセット
        if (!parsed.types.includes('method') || !parsed.types.includes('impl')) {
          console.log('[useGraphLayout] Resetting filter to include new types (method, impl)');
          return DEFAULT_FILTER;
        }
        // 互換性: excludeNodeIds が存在しない場合はデフォルト値を補完
        return {
          ...parsed,
          excludeNodeIds: parsed.excludeNodeIds ?? [],
        };
      }
    }
  } catch (error) {
    console.warn('Failed to load filter from localStorage:', error);
  }
  return DEFAULT_FILTER;
}

/**
 * localStorage にフィルタを保存
 *
 * @param filterData - 保存するフィルタ
 */
function saveFilter(filterData: GraphFilter): void {
  try {
    localStorage.setItem(STORAGE_KEY_FILTER, JSON.stringify(filterData));
  } catch (error) {
    console.warn('Failed to save filter to localStorage:', error);
  }
}

/**
 * レイアウトオプションのバリデーション
 *
 * @param options - バリデーション対象のオブジェクト
 * @returns バリデーション成功時は true
 */
function validateLayoutOptions(options: unknown): options is LayoutOptions {
  if (typeof options !== 'object' || options === null) {
    return false;
  }

  const obj = options as Record<string, unknown>;

  return (
    typeof obj.type === 'string' &&
    ['hierarchical', 'force', 'radial', 'grid'].includes(obj.type) &&
    typeof obj.animate === 'boolean' &&
    typeof obj.animationDuration === 'number' &&
    typeof obj.fit === 'boolean' &&
    typeof obj.padding === 'number'
  );
}

/**
 * フィルタのバリデーション
 *
 * @param filterData - バリデーション対象のオブジェクト
 * @returns バリデーション成功時は true
 */
function validateFilter(filterData: unknown): filterData is GraphFilter {
  if (typeof filterData !== 'object' || filterData === null) {
    return false;
  }

  const obj = filterData as Record<string, unknown>;

  return (
    Array.isArray(obj.directories) &&
    obj.directories.every((d) => typeof d === 'string') &&
    Array.isArray(obj.types) &&
    obj.types.every((t) => typeof t === 'string') &&
    typeof obj.includeIsolated === 'boolean' &&
    typeof obj.maxDepth === 'number'
  );
}
