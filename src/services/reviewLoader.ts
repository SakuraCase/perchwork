/**
 * reviewLoader.ts
 *
 * レビュー解析データの取得
 */

import type { ReviewIndex, ReviewFileResult } from "../types/review";
import { fetchJson, fetchJsonOrNull } from "./httpClient";

/**
 * レビューインデックスを取得する
 * @returns インデックスデータ、または存在しない場合は null
 */
export async function fetchReviewIndex(): Promise<ReviewIndex | null> {
  return fetchJsonOrNull<ReviewIndex>("/data/review/index.json");
}

/**
 * ファイルのレビュー結果を取得する
 * @param relativePath - 相対パス（例: "entity/battle_state.rs"）
 * @returns レビュー結果
 */
export async function fetchReviewResult(
  relativePath: string
): Promise<ReviewFileResult> {
  // 階層構造パスに変換（.rs → .json）
  const jsonPath = relativePath.replace(/\.[^.]+$/, ".json");
  const fullPath = `/data/review/${jsonPath}`;
  return fetchJson<ReviewFileResult>(fullPath);
}

/**
 * ファイルのレビュー結果を取得する（存在しない場合はnull）
 * @param relativePath - 相対パス
 * @returns レビュー結果、または存在しない場合は null
 */
export async function fetchReviewResultOrNull(
  relativePath: string
): Promise<ReviewFileResult | null> {
  const jsonPath = relativePath.replace(/\.[^.]+$/, ".json");
  const fullPath = `/data/review/${jsonPath}`;
  return fetchJsonOrNull<ReviewFileResult>(fullPath);
}
