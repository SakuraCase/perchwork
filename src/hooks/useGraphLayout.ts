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

  /** レイアウトオプション更新 */
  updateLayoutOptions: (options: Partial<LayoutOptions>) => void;

  /** 現在のフィルタ設定 */
  filter: GraphFilter;

  /** フィルタ更新 */
  updateFilter: (filter: Partial<GraphFilter>) => void;

  /** フィルタリセット */
  resetFilter: () => void;

  /** 設定をリセット（レイアウト＋フィルタ） */
  resetAll: () => void;
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
  types: ['struct', 'fn', 'trait', 'enum', 'type'],
  includeIsolated: true,
  maxDepth: 0, // 0 = 無制限
};

/**
 * localStorage のキー
 */
const STORAGE_KEY_LAYOUT = 'tracelight-graph-layout';
const STORAGE_KEY_FILTER = 'tracelight-graph-filter';

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
   * レイアウトオプションを部分的に更新
   *
   * @param options - 更新するオプション（一部のみ指定可能）
   */
  const updateLayoutOptions = useCallback((options: Partial<LayoutOptions>) => {
    setLayoutOptions((prev) => ({
      ...prev,
      ...options,
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
   * フィルタをデフォルト値にリセット
   */
  const resetFilter = useCallback(() => {
    setFilter(DEFAULT_FILTER);
  }, []);

  /**
   * レイアウトとフィルタをすべてデフォルト値にリセット
   */
  const resetAll = useCallback(() => {
    setLayoutOptions(DEFAULT_LAYOUT_OPTIONS);
    setFilter(DEFAULT_FILTER);
  }, []);

  return {
    layoutOptions,
    setLayoutType,
    updateLayoutOptions,
    filter,
    updateFilter,
    resetFilter,
    resetAll,
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
        return parsed;
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
