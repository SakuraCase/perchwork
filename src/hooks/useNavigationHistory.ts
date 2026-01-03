/**
 * ナビゲーション履歴を管理するカスタムフック
 */

import { useState, useCallback } from 'react';
import type { NavigationHistoryEntry } from '../types/navigation';

/** 履歴の最大件数 */
const MAX_HISTORY_SIZE = 10;

/**
 * フックの戻り値
 */
export interface UseNavigationHistoryResult {
  /** 履歴エントリ一覧（新しい順） */
  history: NavigationHistoryEntry[];
  /** 履歴に追加 */
  push: (entry: Omit<NavigationHistoryEntry, 'id' | 'timestamp'>) => void;
  /** 指定インデックスのエントリを取得（履歴は変更しない） */
  getEntry: (index: number) => NavigationHistoryEntry | null;
  /** 履歴が存在するか */
  canGoBack: boolean;
  /** 履歴をクリア */
  clear: () => void;
}

/**
 * 一意なIDを生成
 */
function generateId(): string {
  return `nav_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * ナビゲーション履歴を管理するカスタムフック
 *
 * グラフビューとツリービューで共通の履歴を管理する。
 * 最大10件まで保持し、超過した分は古いものから削除される。
 *
 * @returns 履歴情報と操作関数
 */
export function useNavigationHistory(): UseNavigationHistoryResult {
  const [history, setHistory] = useState<NavigationHistoryEntry[]>([]);

  /**
   * 履歴に追加
   */
  const push = useCallback(
    (entry: Omit<NavigationHistoryEntry, 'id' | 'timestamp'>) => {
      setHistory((prev) => {
        // 同じアイテム・ファイルが連続する場合は追加しない
        if (prev.length > 0 &&
            prev[0].itemId === entry.itemId &&
            prev[0].filePath === entry.filePath) {
          return prev;
        }

        const newEntry: NavigationHistoryEntry = {
          ...entry,
          id: generateId(),
          timestamp: Date.now(),
        };

        // 最大件数を超えないように古いエントリを削除
        const newHistory = [newEntry, ...prev].slice(0, MAX_HISTORY_SIZE);
        return newHistory;
      });
    },
    []
  );

  /**
   * 指定インデックスのエントリを取得（履歴は変更しない）
   */
  const getEntry = useCallback((index: number): NavigationHistoryEntry | null => {
    if (index < 0 || index >= history.length) return null;
    return history[index] ?? null;
  }, [history]);

  /**
   * 履歴をクリア
   */
  const clear = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    history,
    push,
    getEntry,
    canGoBack: history.length > 1,
    clear,
  };
}
