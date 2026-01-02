/**
 * プロファイル管理カスタムフック
 *
 * 複数の設定プロファイルの管理、切り替え、永続化を行う
 */

import { useState, useEffect, useCallback } from 'react';

import type {
  AppSettings,
  Profile,
  ProfileStorage,
} from '../types/profile';
import {
  CURRENT_STORAGE_VERSION,
  CURRENT_SETTINGS_VERSION,
  STORAGE_KEY_PROFILES,
  LEGACY_STORAGE_KEYS,
} from '../types/profile';
import type { LayoutOptions, GraphFilter, NodeColorRule } from '../types/graph';

// ============================================
// 戻り値型
// ============================================

/**
 * useProfile フックの戻り値型
 */
export interface UseProfileResult {
  /** 現在のアクティブプロファイル */
  activeProfile: Profile | null;

  /** 全プロファイル一覧 */
  profiles: Profile[];

  /** ローディング状態（初期化中） */
  isLoading: boolean;

  /** プロファイル切り替え */
  switchProfile: (profileId: string) => void;

  /** 新規プロファイル作成（新しいプロファイルIDを返す） */
  createProfile: (name: string) => string;

  /** プロファイル名変更 */
  renameProfile: (profileId: string, newName: string) => void;

  /** プロファイル削除 */
  deleteProfile: (profileId: string) => void;

  /** 現在のプロファイルの設定を更新 */
  updateSettings: (updates: Partial<AppSettings>) => void;

  /** 現在の設定（activeProfile.settings へのショートカット） */
  settings: AppSettings;
}

// ============================================
// デフォルト値
// ============================================

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
 * デフォルトのアプリケーション設定
 */
const DEFAULT_APP_SETTINGS: AppSettings = {
  layout: DEFAULT_LAYOUT_OPTIONS,
  filter: DEFAULT_FILTER,
  colorRules: [],
  version: CURRENT_SETTINGS_VERSION,
};

// ============================================
// ユーティリティ関数
// ============================================

/**
 * 一意なプロファイルIDを生成
 */
function generateProfileId(): string {
  return `profile_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 現在のISO日時文字列を取得
 */
function nowISOString(): string {
  return new Date().toISOString();
}

// ============================================
// マイグレーション関数
// ============================================

/**
 * 旧形式のレイアウトオプションを読み込み
 */
function loadLegacyLayout(): LayoutOptions {
  try {
    const stored = localStorage.getItem(LEGACY_STORAGE_KEYS.layout);
    if (stored) {
      const parsed = JSON.parse(stored) as LayoutOptions;
      if (
        typeof parsed.type === 'string' &&
        ['hierarchical', 'force', 'radial', 'grid'].includes(parsed.type) &&
        typeof parsed.animate === 'boolean'
      ) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Failed to load legacy layout options:', error);
  }
  return DEFAULT_LAYOUT_OPTIONS;
}

/**
 * 旧形式のフィルタを読み込み
 */
function loadLegacyFilter(): GraphFilter {
  try {
    const stored = localStorage.getItem(LEGACY_STORAGE_KEYS.filter);
    if (stored) {
      const parsed = JSON.parse(stored) as GraphFilter;
      if (Array.isArray(parsed.directories) && typeof parsed.includeIsolated === 'boolean') {
        return {
          ...parsed,
          excludeNodeIds: parsed.excludeNodeIds ?? [],
          consolidateEdges: parsed.consolidateEdges ?? false,
        };
      }
    }
  } catch (error) {
    console.warn('Failed to load legacy filter:', error);
  }
  return DEFAULT_FILTER;
}

/**
 * 旧形式の色ルールを読み込み
 */
function loadLegacyColorRules(): NodeColorRule[] {
  try {
    const stored = localStorage.getItem(LEGACY_STORAGE_KEYS.colorRules);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (rule): rule is NodeColorRule =>
            typeof rule === 'object' &&
            rule !== null &&
            typeof rule.id === 'string' &&
            typeof rule.prefix === 'string' &&
            typeof rule.color === 'string' &&
            typeof rule.enabled === 'boolean'
        );
      }
    }
  } catch (error) {
    console.warn('Failed to load legacy color rules:', error);
  }
  return [];
}

/**
 * 旧形式からのマイグレーション
 */
function migrateFromLegacy(): ProfileStorage {
  const layout = loadLegacyLayout();
  const filter = loadLegacyFilter();
  const colorRules = loadLegacyColorRules();

  const defaultProfile: Profile = {
    id: generateProfileId(),
    name: 'デフォルト',
    createdAt: nowISOString(),
    updatedAt: nowISOString(),
    settings: {
      layout,
      filter,
      colorRules,
      version: CURRENT_SETTINGS_VERSION,
    },
  };

  const storage: ProfileStorage = {
    storageVersion: CURRENT_STORAGE_VERSION,
    activeProfileId: defaultProfile.id,
    profiles: [defaultProfile],
  };

  // 旧キーを削除
  localStorage.removeItem(LEGACY_STORAGE_KEYS.layout);
  localStorage.removeItem(LEGACY_STORAGE_KEYS.filter);
  localStorage.removeItem(LEGACY_STORAGE_KEYS.colorRules);

  return storage;
}

/**
 * 新形式の初期ストレージを作成
 */
function createInitialStorage(): ProfileStorage {
  const defaultProfile: Profile = {
    id: generateProfileId(),
    name: 'デフォルト',
    createdAt: nowISOString(),
    updatedAt: nowISOString(),
    settings: DEFAULT_APP_SETTINGS,
  };

  return {
    storageVersion: CURRENT_STORAGE_VERSION,
    activeProfileId: defaultProfile.id,
    profiles: [defaultProfile],
  };
}

/**
 * localStorage からプロファイルストレージを読み込み
 * 必要に応じてマイグレーションを実行
 */
function loadAndMigrateStorage(): ProfileStorage {
  try {
    // 新形式が存在するか確認
    const newData = localStorage.getItem(STORAGE_KEY_PROFILES);
    if (newData) {
      const parsed = JSON.parse(newData) as ProfileStorage;
      // 基本的なバリデーション
      if (
        typeof parsed.storageVersion === 'number' &&
        typeof parsed.activeProfileId === 'string' &&
        Array.isArray(parsed.profiles) &&
        parsed.profiles.length > 0
      ) {
        return parsed;
      }
    }

    // 旧形式が存在するか確認
    const hasLegacy =
      localStorage.getItem(LEGACY_STORAGE_KEYS.layout) !== null ||
      localStorage.getItem(LEGACY_STORAGE_KEYS.filter) !== null ||
      localStorage.getItem(LEGACY_STORAGE_KEYS.colorRules) !== null;

    if (hasLegacy) {
      return migrateFromLegacy();
    }
  } catch (error) {
    console.warn('Failed to load profile storage:', error);
  }

  // 新規作成
  return createInitialStorage();
}

/**
 * ストレージを localStorage に保存
 */
function saveStorage(storage: ProfileStorage): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(storage));
  } catch (error) {
    console.warn('Failed to save profile storage:', error);
  }
}

// ============================================
// メインフック
// ============================================

/**
 * プロファイル管理カスタムフック
 *
 * - 複数プロファイルの管理
 * - プロファイル切り替え
 * - 設定の永続化（localStorage）
 * - 旧形式からの自動マイグレーション
 *
 * @returns プロファイル管理インターフェース
 */
export function useProfile(): UseProfileResult {
  const [storage, setStorage] = useState<ProfileStorage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初期化: localStorage から読み込み、必要ならマイグレーション
  useEffect(() => {
    const loaded = loadAndMigrateStorage();
    // 初期化時のsetStateは意図的
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStorage(loaded);
    setIsLoading(false);
  }, []);

  // storage 変更時に localStorage に保存
  useEffect(() => {
    if (storage) {
      saveStorage(storage);
    }
  }, [storage]);

  // 現在のアクティブプロファイルを取得
  const activeProfile = storage?.profiles.find((p) => p.id === storage.activeProfileId) ?? null;

  // 現在の設定（ショートカット）
  const settings = activeProfile?.settings ?? DEFAULT_APP_SETTINGS;

  /**
   * プロファイル切り替え
   */
  const switchProfile = useCallback((profileId: string) => {
    setStorage((prev) => {
      if (!prev) return prev;
      const exists = prev.profiles.some((p) => p.id === profileId);
      if (!exists) return prev;
      return {
        ...prev,
        activeProfileId: profileId,
      };
    });
  }, []);

  /**
   * 新規プロファイル作成
   */
  const createProfile = useCallback((name: string): string => {
    const newId = generateProfileId();
    const now = nowISOString();

    const newProfile: Profile = {
      id: newId,
      name: name.trim() || '新しいプロファイル',
      createdAt: now,
      updatedAt: now,
      settings: DEFAULT_APP_SETTINGS,
    };

    setStorage((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        activeProfileId: newId,
        profiles: [...prev.profiles, newProfile],
      };
    });

    return newId;
  }, []);

  /**
   * プロファイル名変更
   */
  const renameProfile = useCallback((profileId: string, newName: string) => {
    setStorage((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        profiles: prev.profiles.map((p) =>
          p.id === profileId
            ? { ...p, name: newName.trim() || p.name, updatedAt: nowISOString() }
            : p
        ),
      };
    });
  }, []);

  /**
   * プロファイル削除
   */
  const deleteProfile = useCallback((profileId: string) => {
    setStorage((prev) => {
      if (!prev) return prev;

      // 最後の1つは削除不可
      if (prev.profiles.length <= 1) return prev;

      const newProfiles = prev.profiles.filter((p) => p.id !== profileId);

      // 削除されたのがアクティブプロファイルの場合、先頭に切り替え
      const newActiveId =
        prev.activeProfileId === profileId
          ? newProfiles[0].id
          : prev.activeProfileId;

      return {
        ...prev,
        activeProfileId: newActiveId,
        profiles: newProfiles,
      };
    });
  }, []);

  /**
   * 現在のプロファイルの設定を更新
   */
  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setStorage((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        profiles: prev.profiles.map((p) =>
          p.id === prev.activeProfileId
            ? {
                ...p,
                settings: { ...p.settings, ...updates },
                updatedAt: nowISOString(),
              }
            : p
        ),
      };
    });
  }, []);

  return {
    activeProfile,
    profiles: storage?.profiles ?? [],
    isLoading,
    switchProfile,
    createProfile,
    renameProfile,
    deleteProfile,
    updateSettings,
    settings,
  };
}
