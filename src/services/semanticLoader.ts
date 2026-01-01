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
 * semantic IDをcall graph IDに変換する
 * 例: "battle_loop::BattleLoop::run::method" -> "battle_loop.rs::BattleLoop::run::method"
 */
function convertSemanticIdToCallGraphId(semanticId: string, filePath: string): ItemId {
  // filePathからファイル名を抽出（例: "service/battle_loop.json" -> "battle_loop"）
  const fileName = filePath.split('/').pop()?.replace('.json', '') || '';

  // semanticIdの最初の部分をファイル名.rsに置換
  const parts = semanticId.split('::');
  if (parts.length > 0) {
    parts[0] = `${fileName}.rs`;
  }

  return parts.join('::') as ItemId;
}

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
          // semantic IDをcall graph ID形式に変換してマップに格納
          const callGraphId = convertSemanticIdToCallGraphId(item.id, entry.path);
          summaryMap.set(callGraphId, item.summary);
        }
      }
    }
  });

  await Promise.all(promises);

  return summaryMap;
}
