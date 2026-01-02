/**
 * semantic情報の読み込みとインデックス構築
 */

import type { ItemId, SemanticFile, IndexFile } from '../types/schema';
import { fetchJson, fetchJsonOrNull } from './httpClient';

/**
 * ItemId → summary のマップ型
 */
export type SummaryMap = Map<ItemId, string>;

/**
 * index.json を取得してsemantic情報を読み込み、SummaryMapを構築する
 *
 * @returns ItemId → summary のマップ
 */
export async function loadAllSummaries(): Promise<SummaryMap> {
  const summaryMap: SummaryMap = new Map();

  // index.json からファイル一覧を取得
  const index = await fetchJson<IndexFile>('/data/structure/index.json');

  // 各ファイルに対応するsemanticファイルを読み込み
  const promises = index.files.map(async (entry) => {
    // items: 0 のファイルはスキップ
    if (entry.items === 0) return;

    const semanticPath = `/data/semantic/${entry.path}`;
    const semantic = await fetchJsonOrNull<SemanticFile>(semanticPath);

    if (semantic?.items) {
      for (const item of semantic.items) {
        if (item.summary) {
          // semantic と structure のID形式が統一されたため直接使用
          summaryMap.set(item.id as ItemId, item.summary);
        }
      }
    }
  });

  await Promise.all(promises);

  return summaryMap;
}
