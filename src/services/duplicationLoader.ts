/**
 * duplicationLoader.ts
 *
 * 重複コード検出データの取得
 */

import type { DuplicationIndex, DuplicationGroup } from "../types/duplication";
import { fetchJsonOrNull } from "./httpClient";

/**
 * 重複インデックスを取得する
 * @returns インデックスデータ、または存在しない場合は null
 */
export async function fetchDuplicationIndex(): Promise<DuplicationIndex | null> {
  return fetchJsonOrNull<DuplicationIndex>("/data/duplication/index.json");
}

/**
 * 重複グループの詳細を取得する
 * @param id - グループID（例: "grp_abc123"）
 * @returns 重複グループ詳細、または存在しない場合は null
 */
export async function fetchDuplicationGroup(
  id: string
): Promise<DuplicationGroup | null> {
  return fetchJsonOrNull<DuplicationGroup>(`/data/duplication/duplicates/${id}.json`);
}
