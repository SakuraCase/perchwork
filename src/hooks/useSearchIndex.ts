/**
 * useSearchIndex.ts
 *
 * 検索インデックスを構築・管理するカスタムフック
 * index.jsonから全ファイルを読み込み、アイテムの検索用インデックスを作成
 */

import { useState, useEffect } from 'react';
import type { IndexFile, ItemId, ItemType, CodeItem } from '../types/schema';
import { fetchSplitFile } from '../services/dataLoader';
import * as cacheManager from '../services/cacheManager';

/**
 * 検索インデックスのアイテム
 */
export interface SearchIndexItem {
  /** アイテムID（検索対象） */
  id: ItemId;
  /** アイテム名 */
  name: string;
  /** 表示用名前（methodは "Struct::method" 形式） */
  displayName: string;
  /** アイテムの種類 */
  type: ItemType;
  /** ファイルパス（index.json内のパス） */
  filePath: string;
  /** メソッドの所属struct名（同一struct制限用、methodのみ） */
  structName: string | null;
}

interface UseSearchIndexResult {
  /** 検索用アイテム一覧 */
  items: SearchIndexItem[];
  /** ローディング中かどうか */
  isLoading: boolean;
}

const CACHE_KEY = 'search-index';

/**
 * 検索インデックスを構築するフック
 *
 * @param index - index.jsonのデータ（nullの場合は空のインデックス）
 * @returns 検索用アイテム一覧とローディング状態
 */
export function useSearchIndex(index: IndexFile | null): UseSearchIndexResult {
  const [items, setItems] = useState<SearchIndexItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!index) {
      setItems([]);
      return;
    }

    // キャッシュをチェック
    const cached = cacheManager.get<SearchIndexItem[]>(CACHE_KEY);
    if (cached) {
      setItems(cached);
      return;
    }

    const buildIndex = async () => {
      setIsLoading(true);

      try {
        const allItems: SearchIndexItem[] = [];

        // 全ファイルを並列で読み込み（パフォーマンス向上）
        const filePromises = index.files.map(async (fileEntry) => {
          try {
            const splitFile = await fetchSplitFile(fileEntry.path);

            // SplitFileの形式を判定してアイテムを抽出
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rawData = splitFile as any;

            let codeItems: CodeItem[] = [];

            if ('items' in rawData && Array.isArray(rawData.items)) {
              // フラット形式: { path, items }
              codeItems = rawData.items;
            } else if ('files' in rawData && Array.isArray(rawData.files)) {
              // ネスト形式: { files: SourceFile[] }
              for (const file of rawData.files) {
                if (file.items && Array.isArray(file.items)) {
                  codeItems.push(...file.items);
                }
              }
            }

            // アイテムをSearchIndexItem形式に変換（テスト関数を除外）
            const searchItems: SearchIndexItem[] = [];
            for (const item of codeItems) {
              // テスト関数を除外（IDの末尾が ::test または ::function）
              if (item.id.endsWith('::test') || item.id.endsWith('::function')) {
                continue;
              }

              // displayName と structName を生成
              let displayName = item.name;
              let structName: string | null = null;

              if (item.type === 'method' && item.impl_for) {
                displayName = `${item.impl_for}::${item.name}`;
                structName = item.impl_for;
              }

              searchItems.push({
                id: item.id,
                name: item.name,
                displayName,
                type: item.type,
                filePath: fileEntry.path,
                structName,
              });
            }
            return searchItems;
          } catch (err) {
            console.warn(`Failed to load ${fileEntry.path}:`, err);
            return [];
          }
        });

        const results = await Promise.all(filePromises);
        for (const fileItems of results) {
          allItems.push(...fileItems);
        }

        // キャッシュに保存
        cacheManager.set(CACHE_KEY, allItems);

        setItems(allItems);
      } catch (err) {
        console.error('Failed to build search index:', err);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    buildIndex();
  }, [index]);

  return { items, isLoading };
}
