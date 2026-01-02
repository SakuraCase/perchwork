/**
 * グラフレイアウトとフィルタの状態管理を行うカスタムフック
 */

import { useState, useEffect, useCallback } from 'react';
import type { LayoutOptions, LayoutType, GraphFilter, NodeColorRule } from '../types/graph';

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

  /** 現在の色ルール */
  colorRules: NodeColorRule[];

  /** 色ルールを追加 */
  addColorRule: (rule: NodeColorRule) => void;

  /** 色ルールを更新 */
  updateColorRule: (id: string, updates: Partial<NodeColorRule>) => void;

  /** 色ルールを削除 */
  deleteColorRule: (id: string) => void;

  /** 全色ルールをクリア */
  clearColorRules: () => void;

  /** 色ルール全体を更新 */
  setColorRules: (rules: NodeColorRule[]) => void;
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
  includeIsolated: true,
  focusNodeId: undefined,
  excludeNodeIds: [],
  consolidateEdges: false,
};

/**
 * localStorage のキー
 */
const STORAGE_KEY_LAYOUT = 'perchwork-graph-layout';
const STORAGE_KEY_FILTER = 'perchwork-graph-filter';
const STORAGE_KEY_COLOR_RULES = 'perchwork-graph-color-rules';

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

  // 色ルールの状態
  const [colorRules, setColorRulesState] = useState<NodeColorRule[]>(() => {
    return loadColorRules();
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
   * 色ルールが変更されたら localStorage に保存
   */
  useEffect(() => {
    saveColorRules(colorRules);
  }, [colorRules]);

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

  /**
   * 色ルールを追加
   */
  const addColorRule = useCallback((rule: NodeColorRule) => {
    setColorRulesState((prev) => [...prev, rule]);
  }, []);

  /**
   * 色ルールを更新
   */
  const updateColorRule = useCallback(
    (id: string, updates: Partial<NodeColorRule>) => {
      setColorRulesState((prev) =>
        prev.map((rule) => (rule.id === id ? { ...rule, ...updates } : rule))
      );
    },
    []
  );

  /**
   * 色ルールを削除
   */
  const deleteColorRule = useCallback((id: string) => {
    setColorRulesState((prev) => prev.filter((rule) => rule.id !== id));
  }, []);

  /**
   * 全色ルールをクリア
   */
  const clearColorRules = useCallback(() => {
    setColorRulesState([]);
  }, []);

  /**
   * 色ルール全体を更新
   */
  const setColorRules = useCallback((rules: NodeColorRule[]) => {
    setColorRulesState(rules);
  }, []);

  return {
    layoutOptions,
    setLayoutType,
    filter,
    updateFilter,
    clearFocusNode,
    excludeNode,
    clearExcludedNodes,
    colorRules,
    addColorRule,
    updateColorRule,
    deleteColorRule,
    clearColorRules,
    setColorRules,
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
        // 互換性: 新フィールドが存在しない場合はデフォルト値を補完
        return {
          ...parsed,
          excludeNodeIds: parsed.excludeNodeIds ?? [],
          consolidateEdges: parsed.consolidateEdges ?? false,
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
    typeof obj.includeIsolated === 'boolean'
  );
}

/**
 * localStorage から色ルールを読み込む
 *
 * @returns 読み込まれた色ルール、または読み込み失敗時は空配列
 */
function loadColorRules(): NodeColorRule[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_COLOR_RULES);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && validateColorRules(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Failed to load color rules from localStorage:', error);
  }
  return [];
}

/**
 * localStorage に色ルールを保存
 *
 * @param rules - 保存する色ルール
 */
function saveColorRules(rules: NodeColorRule[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_COLOR_RULES, JSON.stringify(rules));
  } catch (error) {
    console.warn('Failed to save color rules to localStorage:', error);
  }
}

/**
 * 色ルール配列のバリデーション
 *
 * @param rules - バリデーション対象の配列
 * @returns バリデーション成功時は true
 */
function validateColorRules(rules: unknown[]): rules is NodeColorRule[] {
  return rules.every(
    (rule) =>
      typeof rule === 'object' &&
      rule !== null &&
      typeof (rule as NodeColorRule).id === 'string' &&
      typeof (rule as NodeColorRule).prefix === 'string' &&
      typeof (rule as NodeColorRule).color === 'string' &&
      typeof (rule as NodeColorRule).enabled === 'boolean'
  );
}
