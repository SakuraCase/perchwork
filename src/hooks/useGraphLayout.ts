/**
 * グラフレイアウトとフィルタの状態管理を行うカスタムフック
 *
 * useGraphSettingsと連携して設定を管理する
 */

import { useCallback } from 'react';

import type { LayoutOptions, LayoutType, GraphFilter, NodeColorRule, GraphSettings } from '../types/graph';

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
 * useGraphLayoutフックのパラメータ
 */
export interface UseGraphLayoutParams {
  /** 現在のグラフ設定 */
  settings: GraphSettings;
  /** 設定更新関数 */
  updateSettings: (updates: Partial<GraphSettings>) => void;
}

/**
 * グラフのレイアウト状態管理とフィルタ状態管理を行うカスタムフック
 *
 * - レイアウト設定の管理
 * - フィルタ設定の管理
 * - useGraphSettingsと連携して永続化
 *
 * @param params - useGraphSettingsから渡される設定とアップデート関数
 * @returns レイアウトとフィルタの管理インターフェース
 */
export function useGraphLayout({
  settings,
  updateSettings,
}: UseGraphLayoutParams): UseGraphLayoutResult {
  const { layout: layoutOptions, filter, colorRules } = settings;

  /**
   * レイアウトタイプを変更
   */
  const setLayoutType = useCallback(
    (type: LayoutType) => {
      updateSettings({
        layout: { ...settings.layout, type },
      });
    },
    [settings.layout, updateSettings]
  );

  /**
   * フィルタを部分的に更新
   */
  const updateFilter = useCallback(
    (filterUpdates: Partial<GraphFilter>) => {
      updateSettings({
        filter: { ...settings.filter, ...filterUpdates },
      });
    },
    [settings.filter, updateSettings]
  );

  /**
   * フォーカスノードをクリア
   */
  const clearFocusNode = useCallback(() => {
    updateSettings({
      filter: { ...settings.filter, focusNodeId: undefined },
    });
  }, [settings.filter, updateSettings]);

  /**
   * ノードを除外リストに追加
   */
  const excludeNode = useCallback(
    (nodeId: string) => {
      updateSettings({
        filter: {
          ...settings.filter,
          excludeNodeIds: [...settings.filter.excludeNodeIds, nodeId],
        },
      });
    },
    [settings.filter, updateSettings]
  );

  /**
   * 除外リストをクリア
   */
  const clearExcludedNodes = useCallback(() => {
    updateSettings({
      filter: { ...settings.filter, excludeNodeIds: [] },
    });
  }, [settings.filter, updateSettings]);

  /**
   * 色ルールを追加
   */
  const addColorRule = useCallback(
    (rule: NodeColorRule) => {
      updateSettings({
        colorRules: [...settings.colorRules, rule],
      });
    },
    [settings.colorRules, updateSettings]
  );

  /**
   * 色ルールを更新
   */
  const updateColorRule = useCallback(
    (id: string, updates: Partial<NodeColorRule>) => {
      updateSettings({
        colorRules: settings.colorRules.map((rule) =>
          rule.id === id ? { ...rule, ...updates } : rule
        ),
      });
    },
    [settings.colorRules, updateSettings]
  );

  /**
   * 色ルールを削除
   */
  const deleteColorRule = useCallback(
    (id: string) => {
      updateSettings({
        colorRules: settings.colorRules.filter((rule) => rule.id !== id),
      });
    },
    [settings.colorRules, updateSettings]
  );

  /**
   * 全色ルールをクリア
   */
  const clearColorRules = useCallback(() => {
    updateSettings({
      colorRules: [],
    });
  }, [updateSettings]);

  /**
   * 色ルール全体を更新
   */
  const setColorRules = useCallback(
    (rules: NodeColorRule[]) => {
      updateSettings({
        colorRules: rules,
      });
    },
    [updateSettings]
  );

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
