/**
 * useComplexityLoader.ts
 *
 * 複雑度解析データの読み込みと管理を行うカスタムフック
 */

import { useState, useEffect, useCallback } from "react";
import type {
  ComplexityIndex,
  FileMetrics,
  FunctionMetrics,
} from "../types/complexity";
import {
  fetchComplexityIndex,
  fetchFileMetricsOrNull,
} from "../services/complexityLoader";
import * as cacheManager from "../services/cacheManager";

/** ランキング用の関数データ */
export interface RankedFunction {
  function: FunctionMetrics;
  filePath: string;
  relativePath: string;
}

/**
 * 複雑度解析データの読み込みと管理を行うフック
 */
export function useComplexityLoader() {
  const [index, setIndex] = useState<ComplexityIndex | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // インデックスの初期読み込み
  useEffect(() => {
    const loadIndex = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // キャッシュをチェック
        const cacheKey = "complexity:index";
        const cached = cacheManager.get<ComplexityIndex>(cacheKey);
        if (cached) {
          setIndex(cached);
          setIsLoading(false);
          return;
        }

        // ネットワークから取得
        const data = await fetchComplexityIndex();

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
            : "Failed to load complexity index"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadIndex();
  }, []);

  /**
   * ファイルの詳細メトリクスを読み込む
   */
  const loadFileDetails = useCallback(
    async (relativePath: string): Promise<FileMetrics | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const cacheKey = `complexity:file:${relativePath}`;
        const cached = cacheManager.get<FileMetrics>(cacheKey);
        if (cached) {
          setSelectedFile(cached);
          setIsLoading(false);
          return cached;
        }

        const data = await fetchFileMetricsOrNull(relativePath);

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
   * 全ファイルの関数をCC順でランキング
   */
  const getTopFunctionsByCC = useCallback(
    async (limit = 20): Promise<RankedFunction[]> => {
      if (!index) return [];

      const allFunctions: RankedFunction[] = [];

      // 全ファイルを読み込んで関数を収集
      for (const fileSummary of index.files) {
        const cacheKey = `complexity:file:${fileSummary.relative_path}`;
        let fileData = cacheManager.get<FileMetrics>(cacheKey);

        if (!fileData) {
          fileData = await fetchFileMetricsOrNull(fileSummary.relative_path);
          if (fileData) {
            cacheManager.set(cacheKey, fileData);
          }
        }

        if (fileData) {
          for (const func of fileData.functions) {
            allFunctions.push({
              function: func,
              filePath: fileData.path,
              relativePath: fileData.relative_path,
            });
          }
        }
      }

      // CC降順でソートして上位を返す
      return allFunctions
        .sort((a, b) => b.function.cc - a.function.cc)
        .slice(0, limit);
    },
    [index]
  );

  /**
   * 全ファイルの関数をCognitive複雑度順でランキング
   */
  const getTopFunctionsByCognitive = useCallback(
    async (limit = 20): Promise<RankedFunction[]> => {
      if (!index) return [];

      const allFunctions: RankedFunction[] = [];

      for (const fileSummary of index.files) {
        const cacheKey = `complexity:file:${fileSummary.relative_path}`;
        let fileData = cacheManager.get<FileMetrics>(cacheKey);

        if (!fileData) {
          fileData = await fetchFileMetricsOrNull(fileSummary.relative_path);
          if (fileData) {
            cacheManager.set(cacheKey, fileData);
          }
        }

        if (fileData) {
          for (const func of fileData.functions) {
            allFunctions.push({
              function: func,
              filePath: fileData.path,
              relativePath: fileData.relative_path,
            });
          }
        }
      }

      return allFunctions
        .sort((a, b) => b.function.cognitive - a.function.cognitive)
        .slice(0, limit);
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
    getTopFunctionsByCC,
    getTopFunctionsByCognitive,
    clearSelectedFile,
  };
}
