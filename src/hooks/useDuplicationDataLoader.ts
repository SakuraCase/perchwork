/**
 * useDuplicationDataLoader.ts
 *
 * 重複コード検出データの読み込みと管理を行うカスタムフック
 */

import { useState, useEffect, useCallback } from "react";
import type {
  DuplicationIndex,
  DuplicationGroup,
} from "../types/duplication";
import {
  fetchDuplicationIndex,
  fetchDuplicationGroup,
} from "../services/duplicationLoader";
import * as cacheManager from "../services/cacheManager";

/**
 * 重複コード検出データの読み込みと管理を行うフック
 */
export function useDuplicationDataLoader() {
  const [index, setIndex] = useState<DuplicationIndex | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<DuplicationGroup | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // インデックスの初期読み込み
  useEffect(() => {
    const loadIndex = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // キャッシュをチェック
        const cacheKey = "duplication:index";
        const cached = cacheManager.get<DuplicationIndex>(cacheKey);
        if (cached) {
          setIndex(cached);
          setIsLoading(false);
          return;
        }

        // ネットワークから取得
        const data = await fetchDuplicationIndex();

        if (data) {
          cacheManager.set(cacheKey, data);
          setIndex(data);
        } else {
          setIndex(null);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load duplication index"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadIndex();
  }, []);

  /**
   * 重複グループの詳細を読み込む
   */
  const loadGroupDetails = useCallback(
    async (id: string): Promise<DuplicationGroup | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const cacheKey = `duplication:group:${id}`;
        const cached = cacheManager.get<DuplicationGroup>(cacheKey);
        if (cached) {
          setSelectedGroup(cached);
          setIsLoading(false);
          return cached;
        }

        const data = await fetchDuplicationGroup(id);

        if (data) {
          cacheManager.set(cacheKey, data);
          setSelectedGroup(data);
        } else {
          setSelectedGroup(null);
        }

        setIsLoading(false);
        return data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : `Failed to load group ${id}`;
        setError(errorMessage);
        setIsLoading(false);
        return null;
      }
    },
    []
  );

  /**
   * 行数順でソートされた重複リストを取得
   */
  const getSortedDuplicates = useCallback(
    (sortBy: "lines" | "locations" = "locations") => {
      if (!index) return [];

      const duplicates = [...index.duplicates];

      if (sortBy === "lines") {
        return duplicates.sort((a, b) => b.lines - a.lines);
      } else {
        return duplicates.sort((a, b) => b.location_count - a.location_count);
      }
    },
    [index]
  );

  /**
   * 特定ファイルに関連する重複を取得
   */
  const getDuplicatesForFile = useCallback(
    (filePath: string) => {
      if (!index) return [];

      return index.duplicates.filter((d) => d.files.includes(filePath));
    },
    [index]
  );

  /**
   * 選択中のグループをクリア
   */
  const clearSelectedGroup = useCallback(() => {
    setSelectedGroup(null);
  }, []);

  /**
   * 重複データが存在するかどうか
   */
  const hasDuplicationData = useCallback((): boolean => {
    return index !== null && index.duplicates.length > 0;
  }, [index]);

  return {
    index,
    selectedGroup,
    isLoading,
    error,
    loadGroupDetails,
    getSortedDuplicates,
    getDuplicatesForFile,
    clearSelectedGroup,
    hasDuplicationData,
  };
}
