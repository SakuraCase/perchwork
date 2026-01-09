/**
 * useSchemaLoader.ts
 *
 * スキーマグラフデータの読み込みと管理を行うフック
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { IndexFile, SplitFile } from '../types/schema';
import type { SchemaGraphData, SchemaFilter } from '../types/schemaGraph';
import { DEFAULT_SCHEMA_FILTER } from '../types/schemaGraph';
import { fetchIndex, fetchSplitFile } from '../services/dataLoader';
import { extractStructsAndEnums, buildSchemaGraph, applySchemaFilter } from '../services/schemaTransformer';
import * as cacheManager from '../services/cacheManager';

const CACHE_KEY = 'schema:graph';

/** useSchemaLoaderの引数 */
interface UseSchemaLoaderOptions {
  /** 外部管理のフィルタ状態 */
  externalFilter?: SchemaFilter;

  /** 外部管理のフィルタ更新関数 */
  onFilterChange?: (filter: SchemaFilter) => void;
}

interface UseSchemaLoaderResult {
  /** スキーマグラフデータ（フィルタ適用前） */
  rawData: SchemaGraphData | null;

  /** スキーマグラフデータ（フィルタ適用後） */
  filteredData: SchemaGraphData | null;

  /** フィルタ設定 */
  filter: SchemaFilter;

  /** フィルタを更新 */
  setFilter: (filter: SchemaFilter) => void;

  /** 読み込み中かどうか */
  isLoading: boolean;

  /** エラーメッセージ */
  error: string | null;

  /** データを再読み込み */
  reload: () => Promise<void>;
}

/**
 * スキーマグラフデータの読み込みと管理を行うフック
 *
 * @param options.externalFilter - 外部で管理されるフィルタ状態（指定時は内部状態を使用しない）
 * @param options.onFilterChange - 外部フィルタの更新関数
 */
export function useSchemaLoader(options?: UseSchemaLoaderOptions): UseSchemaLoaderResult {
  const { externalFilter, onFilterChange } = options ?? {};

  const [rawData, setRawData] = useState<SchemaGraphData | null>(null);
  const [internalFilter, setInternalFilter] = useState<SchemaFilter>(DEFAULT_SCHEMA_FILTER);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 外部フィルタが指定されている場合はそちらを使用
  const filter = externalFilter ?? internalFilter;
  const setFilter = useCallback((newFilter: SchemaFilter) => {
    if (onFilterChange) {
      onFilterChange(newFilter);
    } else {
      setInternalFilter(newFilter);
    }
  }, [onFilterChange]);

  /**
   * スキーマデータを読み込み
   */
  const loadSchemaData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // キャッシュをチェック
      const cached = cacheManager.get<SchemaGraphData>(CACHE_KEY);
      if (cached) {
        setRawData(cached);
        setIsLoading(false);
        return;
      }

      // index.json を読み込み
      const index = await fetchIndex();
      if (!index) {
        setError('index.json が見つかりません。/analyze を実行してください。');
        setIsLoading(false);
        return;
      }

      // 全ファイルを並列で読み込み
      const splitFiles = await loadAllSplitFiles(index);

      // struct/enum を抽出
      const items = extractStructsAndEnums(splitFiles);

      // スキーマグラフを構築
      const graphData = buildSchemaGraph(items);

      // キャッシュに保存
      cacheManager.set(CACHE_KEY, graphData);

      setRawData(graphData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'スキーマデータの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 全分割ファイルを読み込み
   */
  async function loadAllSplitFiles(index: IndexFile): Promise<SplitFile[]> {
    const promises = index.files.map(async (fileEntry) => {
      const cacheKey = `split:${fileEntry.path}`;
      const cached = cacheManager.get<SplitFile>(cacheKey);
      if (cached) {
        return cached;
      }

      const data = await fetchSplitFile(fileEntry.path);
      cacheManager.set(cacheKey, data);
      return data;
    });

    return Promise.all(promises);
  }

  /**
   * データを再読み込み（キャッシュをクリア）
   */
  const reload = useCallback(async () => {
    cacheManager.clear();
    await loadSchemaData();
  }, [loadSchemaData]);

  // 初期読み込み
  useEffect(() => {
    loadSchemaData();
  }, [loadSchemaData]);

  // フィルタ適用後のデータ
  const filteredData = useMemo(() => {
    if (!rawData) return null;
    return applySchemaFilter(rawData, filter);
  }, [rawData, filter]);

  return {
    rawData,
    filteredData,
    filter,
    setFilter,
    isLoading,
    error,
    reload,
  };
}
