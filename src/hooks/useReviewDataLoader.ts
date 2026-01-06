/**
 * useReviewDataLoader.ts
 *
 * レビュー解析データの読み込みと管理を行うカスタムフック
 */

import { useState, useEffect, useCallback } from "react";
import type {
  ReviewIndex,
  ReviewFileResult,
  FixPlan,
  FixPriority,
} from "../types/review";
import {
  fetchReviewIndex,
  fetchReviewResultOrNull,
} from "../services/reviewLoader";
import * as cacheManager from "../services/cacheManager";

/** 優先度付き修正計画 */
export interface RankedFixPlan {
  fixPlan: FixPlan;
  filePath: string;
}

/**
 * レビュー解析データの読み込みと管理を行うフック
 */
export function useReviewDataLoader() {
  const [index, setIndex] = useState<ReviewIndex | null>(null);
  const [selectedFile, setSelectedFile] = useState<ReviewFileResult | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // インデックスの初期読み込み
  useEffect(() => {
    const loadIndex = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // キャッシュをチェック
        const cacheKey = "review:index";
        const cached = cacheManager.get<ReviewIndex>(cacheKey);
        if (cached) {
          setIndex(cached);
          setIsLoading(false);
          return;
        }

        // ネットワークから取得
        const data = await fetchReviewIndex();

        if (data) {
          cacheManager.set(cacheKey, data);
          setIndex(data);
        } else {
          setIndex(null);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load review index"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadIndex();
  }, []);

  /**
   * ファイルのレビュー結果を読み込む
   */
  const loadFileDetails = useCallback(
    async (relativePath: string): Promise<ReviewFileResult | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const cacheKey = `review:file:${relativePath}`;
        const cached = cacheManager.get<ReviewFileResult>(cacheKey);
        if (cached) {
          setSelectedFile(cached);
          setIsLoading(false);
          return cached;
        }

        const data = await fetchReviewResultOrNull(relativePath);

        if (data) {
          cacheManager.set(cacheKey, data);
          setSelectedFile(data);
        } else {
          setSelectedFile(null);
        }

        setIsLoading(false);
        return data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : `Failed to load ${relativePath}`;
        setError(errorMessage);
        setIsLoading(false);
        return null;
      }
    },
    []
  );

  /**
   * 全ファイルの修正計画を優先度順でランキング
   */
  const getTopFixPlansByPriority = useCallback(
    async (limit = 20): Promise<RankedFixPlan[]> => {
      if (!index) return [];

      const allFixPlans: RankedFixPlan[] = [];

      // 全ファイルを読み込んで修正計画を収集
      for (const fileSummary of index.files) {
        const cacheKey = `review:file:${fileSummary.path}`;
        let fileData = cacheManager.get<ReviewFileResult>(cacheKey);

        if (!fileData) {
          fileData = await fetchReviewResultOrNull(fileSummary.path);
          if (fileData) {
            cacheManager.set(cacheKey, fileData);
          }
        }

        if (fileData) {
          for (const fixPlan of fileData.fix_plans) {
            allFixPlans.push({
              fixPlan,
              filePath: fileData.path,
            });
          }
        }
      }

      // 優先度順でソート（high > medium > low）
      const priorityOrder: Record<FixPriority, number> = {
        high: 3,
        medium: 2,
        low: 1,
      };

      return allFixPlans
        .sort(
          (a, b) =>
            priorityOrder[b.fixPlan.priority] -
            priorityOrder[a.fixPlan.priority]
        )
        .slice(0, limit);
    },
    [index]
  );

  /**
   * 特定の優先度の修正計画のみを取得
   */
  const getFixPlansByPriority = useCallback(
    async (priority: FixPriority): Promise<RankedFixPlan[]> => {
      if (!index) return [];

      const fixPlans: RankedFixPlan[] = [];

      for (const fileSummary of index.files) {
        const cacheKey = `review:file:${fileSummary.path}`;
        let fileData = cacheManager.get<ReviewFileResult>(cacheKey);

        if (!fileData) {
          fileData = await fetchReviewResultOrNull(fileSummary.path);
          if (fileData) {
            cacheManager.set(cacheKey, fileData);
          }
        }

        if (fileData) {
          for (const fixPlan of fileData.fix_plans) {
            if (fixPlan.priority === priority) {
              fixPlans.push({
                fixPlan,
                filePath: fileData.path,
              });
            }
          }
        }
      }

      return fixPlans;
    },
    [index]
  );

  /**
   * 選択中のファイルをクリア
   */
  const clearSelectedFile = useCallback(() => {
    setSelectedFile(null);
  }, []);

  return {
    index,
    selectedFile,
    isLoading,
    error,
    loadFileDetails,
    getTopFixPlansByPriority,
    getFixPlansByPriority,
    clearSelectedFile,
  };
}
