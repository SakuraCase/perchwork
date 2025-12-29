/**
 * JSONデータの読み込みと管理を行うカスタムフック
 */

import { useState, useEffect, useCallback } from 'react';
import type { IndexFile, SplitFile } from '../types/schema';
import { fetchIndex, fetchSplitFile } from '../services/dataLoader';
import * as cacheManager from '../services/cacheManager';

/**
 * JSONデータの読み込みと管理を行うフック
 *
 * index.json を初期化時に読み込み、分割JSONのオンデマンド読み込みとキャッシュを管理する
 *
 * @returns index - インデックスファイル（読み込み中はnull）
 * @returns loadFile - 分割JSONファイルを読み込む関数
 * @returns isLoading - データ読み込み中かどうか
 * @returns error - エラーメッセージ（エラーがない場合はnull）
 */
export function useDataLoader() {
  const [index, setIndex] = useState<IndexFile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // index.json の初期読み込み
  useEffect(() => {
    const loadIndex = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // キャッシュをチェック
        const cached = cacheManager.get<IndexFile>('index.json');
        if (cached) {
          setIndex(cached);
          setIsLoading(false);
          return;
        }

        // ネットワークから取得
        const data = await fetchIndex();

        // キャッシュに保存
        cacheManager.set('index.json', data);

        setIndex(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load index.json');
      } finally {
        setIsLoading(false);
      }
    };

    loadIndex();
  }, []);

  /**
   * 分割JSONファイルを読み込む
   *
   * キャッシュが存在する場合はキャッシュから返し、存在しない場合はネットワークから取得してキャッシュに保存する
   *
   * @param path - ファイルパス（例: "domain/core.json"）
   * @returns 分割ファイルのデータ
   * @throws エラーが発生した場合はエラーメッセージを state に設定
   */
  const loadFile = useCallback(async (path: string): Promise<SplitFile> => {
    setIsLoading(true);
    setError(null);

    try {
      // キャッシュをチェック
      const cached = cacheManager.get<SplitFile>(path);
      if (cached) {
        setIsLoading(false);
        return cached;
      }

      // ネットワークから取得
      const data = await fetchSplitFile(path);

      // キャッシュに保存
      cacheManager.set(path, data);

      setIsLoading(false);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to load ${path}`;
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    }
  }, []);

  return {
    index,
    loadFile,
    isLoading,
    error,
  };
}
