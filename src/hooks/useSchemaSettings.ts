/**
 * スキーマ設定の状態管理と永続化を行うカスタムフック
 *
 * - localStorageに現在のスキーマ設定を自動保存
 * - 名前付き保存・開く機能の提供
 */

import { useState, useCallback, useEffect } from 'react';

import type {
  SchemaFilter,
  SchemaLayoutType,
  SchemaSettings,
  SavedSchemaSettings,
} from '../types/schemaGraph';
import { DEFAULT_SCHEMA_FILTER } from '../types/schemaGraph';

// ============================================
// 定数
// ============================================

/** 現在の設定を保存するキー */
const STORAGE_KEY_CURRENT = 'perchwork-schema-settings';

/** 名前付き保存を保存するキー */
const STORAGE_KEY_SAVED = 'perchwork-saved-schema';

// ============================================
// デフォルト値
// ============================================

/** デフォルトのレイアウトタイプ */
const DEFAULT_LAYOUT_TYPE: SchemaLayoutType = 'hierarchy';

/** デフォルトのスキーマ設定 */
const DEFAULT_SETTINGS: SchemaSettings = {
  layoutType: DEFAULT_LAYOUT_TYPE,
  filter: DEFAULT_SCHEMA_FILTER,
};

// ============================================
// ユーティリティ関数
// ============================================

/**
 * localStorageから現在のスキーマ設定を読み込む
 */
function loadCurrentSettings(): SchemaSettings {
  try {
    const json = localStorage.getItem(STORAGE_KEY_CURRENT);
    if (!json) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(json) as SchemaSettings;
    return {
      layoutType: parsed.layoutType ?? DEFAULT_LAYOUT_TYPE,
      filter: { ...DEFAULT_SCHEMA_FILTER, ...parsed.filter },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * localStorageに現在のスキーマ設定を保存
 */
function saveCurrentSettings(settings: SchemaSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(settings));
  } catch {
    // localStorage書き込みエラーは無視
  }
}

/**
 * localStorageから保存済みスキーマ設定を読み込む
 */
function loadSavedSettings(): SavedSchemaSettings[] {
  try {
    const json = localStorage.getItem(STORAGE_KEY_SAVED);
    if (!json) return [];
    return JSON.parse(json) as SavedSchemaSettings[];
  } catch {
    return [];
  }
}

/**
 * localStorageに保存済みスキーマ設定を保存
 */
function saveSavedSettings(saved: SavedSchemaSettings[]): void {
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
 * useSchemaSettings フックの戻り値型
 */
export interface UseSchemaSettingsResult {
  /** 現在のスキーマ設定 */
  settings: SchemaSettings;

  /** レイアウトタイプを更新 */
  updateLayoutType: (layoutType: SchemaLayoutType) => void;

  /** フィルタを更新 */
  updateFilter: (filter: SchemaFilter) => void;

  /** 保存済みスキーマ設定一覧 */
  savedSettings: SavedSchemaSettings[];

  /** 名前付きで保存（existingIdがあれば上書き） */
  saveSettings: (name: string, existingId?: string) => void;

  /** 保存済み設定を開く */
  openSettings: (saved: SavedSchemaSettings) => void;

  /** 保存済み設定を削除 */
  deleteSettings: (id: string) => void;
}

/**
 * スキーマ設定の状態管理と永続化を行うカスタムフック
 */
export function useSchemaSettings(): UseSchemaSettingsResult {
  const [settings, setSettings] = useState<SchemaSettings>(loadCurrentSettings);
  const [savedSettings, setSavedSettings] = useState<SavedSchemaSettings[]>(loadSavedSettings);

  // 設定変更時にlocalStorageへ自動保存
  useEffect(() => {
    saveCurrentSettings(settings);
  }, [settings]);

  // 保存済み設定変更時にlocalStorageへ自動保存
  useEffect(() => {
    saveSavedSettings(savedSettings);
  }, [savedSettings]);

  /**
   * レイアウトタイプを更新
   */
  const updateLayoutType = useCallback((layoutType: SchemaLayoutType) => {
    setSettings((prev) => ({
      ...prev,
      layoutType,
    }));
  }, []);

  /**
   * フィルタを更新
   */
  const updateFilter = useCallback((filter: SchemaFilter) => {
    setSettings((prev) => ({
      ...prev,
      filter,
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
        const newSaved: SavedSchemaSettings = {
          id: `schema_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
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
  const openSettings = useCallback((saved: SavedSchemaSettings) => {
    setSettings({
      layoutType: saved.settings.layoutType ?? DEFAULT_LAYOUT_TYPE,
      filter: { ...DEFAULT_SCHEMA_FILTER, ...saved.settings.filter },
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
    updateLayoutType,
    updateFilter,
    savedSettings,
    saveSettings,
    openSettings,
    deleteSettings,
  };
}
