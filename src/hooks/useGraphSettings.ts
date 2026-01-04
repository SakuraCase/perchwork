/**
 * グラフ設定の状態管理と永続化を行うカスタムフック
 *
 * - localStorageに現在のグラフ設定を自動保存
 * - 名前付き保存・開く機能の提供
 */

import { useState, useCallback, useEffect } from 'react';

import type {
  LayoutOptions,
  GraphFilter,
  GraphSettings,
  SavedGraphSettings,
} from '../types/graph';

// ============================================
// 定数
// ============================================

/** 現在の設定を保存するキー */
const STORAGE_KEY_CURRENT = 'perchwork-graph-settings';

/** 名前付き保存を保存するキー */
const STORAGE_KEY_SAVED = 'perchwork-saved-graph';

// ============================================
// デフォルト値
// ============================================

/** デフォルトのレイアウト設定 */
const DEFAULT_LAYOUT: LayoutOptions = {
  type: 'hierarchical',
  animate: true,
  animationDuration: 300,
  fit: true,
  padding: 50,
};

/** デフォルトのフィルタ設定 */
const DEFAULT_FILTER: GraphFilter = {
  directories: [],
  includeIsolated: true,
  focusNodeId: undefined,
  excludeNodeIds: [],
  consolidateEdges: false,
};

/** デフォルトのグラフ設定 */
const DEFAULT_SETTINGS: GraphSettings = {
  layout: DEFAULT_LAYOUT,
  filter: DEFAULT_FILTER,
  colorRules: [],
};

// ============================================
// ユーティリティ関数
// ============================================

/**
 * localStorageから現在のグラフ設定を読み込む
 */
function loadCurrentSettings(): GraphSettings {
  try {
    const json = localStorage.getItem(STORAGE_KEY_CURRENT);
    if (!json) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(json) as GraphSettings;
    return {
      layout: { ...DEFAULT_LAYOUT, ...parsed.layout },
      filter: { ...DEFAULT_FILTER, ...parsed.filter },
      colorRules: parsed.colorRules ?? [],
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * localStorageに現在のグラフ設定を保存
 */
function saveCurrentSettings(settings: GraphSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(settings));
  } catch {
    // localStorage書き込みエラーは無視
  }
}

/**
 * localStorageから保存済みグラフ設定を読み込む
 */
function loadSavedSettings(): SavedGraphSettings[] {
  try {
    const json = localStorage.getItem(STORAGE_KEY_SAVED);
    if (!json) return [];
    return JSON.parse(json) as SavedGraphSettings[];
  } catch {
    return [];
  }
}

/**
 * localStorageに保存済みグラフ設定を保存
 */
function saveSavedSettings(saved: SavedGraphSettings[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(saved));
  } catch {
    // localStorage書き込みエラーは無視
  }
}

// ============================================
// フック定義
// ============================================

/**
 * useGraphSettings フックの戻り値型
 */
export interface UseGraphSettingsResult {
  /** 現在のグラフ設定 */
  settings: GraphSettings;

  /** 設定を部分更新 */
  updateSettings: (updates: Partial<GraphSettings>) => void;

  /** 保存済みグラフ設定一覧 */
  savedSettings: SavedGraphSettings[];

  /** 名前付きで保存（existingIdがあれば上書き） */
  saveSettings: (name: string, existingId?: string) => void;

  /** 保存済み設定を開く */
  openSettings: (saved: SavedGraphSettings) => void;

  /** 保存済み設定を削除 */
  deleteSettings: (id: string) => void;
}

/**
 * グラフ設定の状態管理と永続化を行うカスタムフック
 */
export function useGraphSettings(): UseGraphSettingsResult {
  const [settings, setSettings] = useState<GraphSettings>(loadCurrentSettings);
  const [savedSettings, setSavedSettings] = useState<SavedGraphSettings[]>(loadSavedSettings);

  // 設定変更時にlocalStorageへ自動保存
  useEffect(() => {
    saveCurrentSettings(settings);
  }, [settings]);

  // 保存済み設定変更時にlocalStorageへ自動保存
  useEffect(() => {
    saveSavedSettings(savedSettings);
  }, [savedSettings]);

  /**
   * 設定を部分更新
   */
  const updateSettings = useCallback((updates: Partial<GraphSettings>) => {
    setSettings((prev) => ({
      ...prev,
      ...updates,
      // layoutとfilterはマージする
      layout: updates.layout ? { ...prev.layout, ...updates.layout } : prev.layout,
      filter: updates.filter ? { ...prev.filter, ...updates.filter } : prev.filter,
    }));
  }, []);

  /**
   * 名前付きで保存
   */
  const saveSettings = useCallback(
    (name: string, existingId?: string) => {
      const now = new Date().toISOString();

      if (existingId) {
        // 上書き保存
        setSavedSettings((prev) =>
          prev.map((s) =>
            s.id === existingId
              ? { ...s, name, settings: { ...settings }, updatedAt: now }
              : s
          )
        );
      } else {
        // 新規保存
        const newSaved: SavedGraphSettings = {
          id: `graph_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          name,
          settings: { ...settings },
          createdAt: now,
          updatedAt: now,
        };
        setSavedSettings((prev) => [...prev, newSaved]);
      }
    },
    [settings]
  );

  /**
   * 保存済み設定を開く
   */
  const openSettings = useCallback((saved: SavedGraphSettings) => {
    setSettings({
      layout: { ...DEFAULT_LAYOUT, ...saved.settings.layout },
      filter: { ...DEFAULT_FILTER, ...saved.settings.filter },
      colorRules: saved.settings.colorRules ?? [],
    });
  }, []);

  /**
   * 保存済み設定を削除
   */
  const deleteSettings = useCallback((id: string) => {
    setSavedSettings((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return {
    settings,
    updateSettings,
    savedSettings,
    saveSettings,
    openSettings,
    deleteSettings,
  };
}
