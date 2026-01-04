/**
 * 保存済みシーケンス図の管理を行うカスタムフック
 *
 * - localStorageに保存済みシーケンスを永続化
 * - profile依存を排除したシンプルな実装
 */

import { useState, useCallback, useEffect } from 'react';

import type { SavedSequenceDiagram, SequenceEditState } from '../types/sequence';
import type { ItemId } from '../types/schema';

// ============================================
// 定数
// ============================================

/** 保存済みシーケンスを保存するキー */
const STORAGE_KEY = 'perchwork-saved-sequences';

// ============================================
// ユーティリティ関数
// ============================================

/**
 * localStorageから保存済みシーケンスを読み込む
 */
function loadSavedSequences(): SavedSequenceDiagram[] {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return [];
    return JSON.parse(json) as SavedSequenceDiagram[];
  } catch {
    return [];
  }
}

/**
 * localStorageに保存済みシーケンスを保存
 */
function saveSavedSequences(saved: SavedSequenceDiagram[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // localStorage書き込みエラーは無視
  }
}

// ============================================
// フック定義
// ============================================

/**
 * useSavedSequences フックの戻り値型
 */
export interface UseSavedSequencesResult {
  /** 保存済みシーケンス一覧 */
  savedSequences: SavedSequenceDiagram[];

  /** 名前付きで保存（existingIdがあれば上書き） */
  saveSequence: (
    name: string,
    rootFunctionId: ItemId,
    editState: SequenceEditState,
    existingId?: string
  ) => void;

  /** 保存済みシーケンスを削除 */
  deleteSequence: (id: string) => void;
}

/**
 * 保存済みシーケンス図の管理を行うカスタムフック
 */
export function useSavedSequences(): UseSavedSequencesResult {
  const [savedSequences, setSavedSequences] = useState<SavedSequenceDiagram[]>(loadSavedSequences);

  // 保存済みシーケンス変更時にlocalStorageへ自動保存
  useEffect(() => {
    saveSavedSequences(savedSequences);
  }, [savedSequences]);

  /**
   * 名前付きで保存
   */
  const saveSequence = useCallback(
    (
      name: string,
      rootFunctionId: ItemId,
      editState: SequenceEditState,
      existingId?: string
    ) => {
      const now = new Date().toISOString();

      if (existingId) {
        // 上書き保存
        setSavedSequences((prev) =>
          prev.map((s) =>
            s.id === existingId
              ? { ...s, name, rootFunctionId, editState, updatedAt: now }
              : s
          )
        );
      } else {
        // 新規保存
        const newSaved: SavedSequenceDiagram = {
          id: `seq_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          name,
          rootFunctionId,
          editState,
          createdAt: now,
          updatedAt: now,
        };
        setSavedSequences((prev) => [...prev, newSaved]);
      }
    },
    []
  );

  /**
   * 保存済みシーケンスを削除
   */
  const deleteSequence = useCallback((id: string) => {
    setSavedSequences((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return {
    savedSequences,
    saveSequence,
    deleteSequence,
  };
}
