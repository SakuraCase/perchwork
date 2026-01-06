/**
 * JSONデータの読み込みと管理を行うカスタムフック
 */

import { useState, useEffect, useCallback } from 'react';
import type { IndexFile, SplitFile, CodeItem, ItemId, SemanticTest } from '../types/schema';
import { fetchIndex, fetchSplitFile, fetchSemanticFile } from '../services/dataLoader';
import * as cacheManager from '../services/cacheManager';

/**
 * JSONデータの読み込みと管理を行うフック
 *
 * index.json を初期化時に読み込み、分割JSONのオンデマンド読み込みとキャッシュを管理する
 *
 * @returns index - インデックスファイル（読み込み中はnull）
 * @returns loadFile - 分割JSONファイルを読み込む関数
 * @returns loadFileWithSemantic - 構文＋セマンティック情報をマージして読み込む関数
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

        // ネットワークから取得（存在しない場合はnull）
        const data = await fetchIndex();

        if (data) {
          // キャッシュに保存
          cacheManager.set('index.json', data);
          setIndex(data);
        }
        // dataがnullの場合は、indexはnullのままで「データがありません」画面が表示される
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

  /**
   * 構文ファイルとセマンティックファイルを読み込み、マージして返す
   *
   * @param path - ファイルパス（例: "entity/battle_state.json"）
   * @returns マージ済みの分割ファイルデータと tested_by マッピング、セマンティックテスト情報
   */
  const loadFileWithSemantic = useCallback(async (path: string): Promise<{
    splitFile: SplitFile;
    testedBy: Map<ItemId, string[]>;
    semanticTests: SemanticTest[];
  }> => {
    setIsLoading(true);
    setError(null);

    try {
      // マージ済みキャッシュをチェック
      const cacheKey = `merged:${path}`;
      const cached = cacheManager.get<{ splitFile: SplitFile; testedBy: Map<ItemId, string[]>; semanticTests: SemanticTest[] }>(cacheKey);
      if (cached) {
        setIsLoading(false);
        return cached;
      }

      // 構文ファイルとセマンティックファイルを並列で読み込み
      const [structureData, semanticData] = await Promise.all([
        fetchSplitFile(path),
        fetchSemanticFile(path),
      ]);

      // セマンティックデータがある場合はマージ
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let mergedSplitFile: any = structureData;
      const testedBy = new Map<ItemId, string[]>();

      // データ形式を判定（フラット形式: { path, items } or ネスト形式: { files: [...] }）
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawData = structureData as any;
      const isFlat = 'items' in rawData && Array.isArray(rawData.items);

      if (semanticData) {
        if (isFlat) {
          // フラット形式: { path, items } の場合
          mergedSplitFile = {
            ...rawData,
            items: rawData.items.map((item: CodeItem) => {
              const semanticItem = semanticData.items.find(s => s.id === item.id);
              if (semanticItem) {
                return {
                  ...item,
                  summary: semanticItem.summary || item.summary,
                  responsibility: semanticItem.responsibility || item.responsibility,
                } as CodeItem;
              }
              return item;
            }),
          };
        } else if ('files' in rawData && Array.isArray(rawData.files)) {
          // ネスト形式: { files: SourceFile[] } の場合
          mergedSplitFile = {
            ...rawData,
            files: rawData.files.map((file: { items: CodeItem[] }) => ({
              ...file,
              items: file.items.map((item: CodeItem) => {
                const semanticItem = semanticData.items.find(s => s.id === item.id);
                if (semanticItem) {
                  return {
                    ...item,
                    summary: semanticItem.summary || item.summary,
                    responsibility: semanticItem.responsibility || item.responsibility,
                  } as CodeItem;
                }
                return item;
              }),
            })),
          };
        }

        // tested_by の逆引き計算
        for (const test of semanticData.tests) {
          if (test.tested_item) {
            const existing = testedBy.get(test.tested_item) || [];
            existing.push(test.id);
            testedBy.set(test.tested_item, existing);
          }
        }
      }

      // キャッシュに保存
      const result = {
        splitFile: mergedSplitFile,
        testedBy,
        semanticTests: semanticData?.tests || [],
      };
      cacheManager.set(cacheKey, result);

      setIsLoading(false);
      return result;
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
    loadFileWithSemantic,
    isLoading,
    error,
  };
}
