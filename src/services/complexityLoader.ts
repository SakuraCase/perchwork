/**
 * complexityLoader.ts
 *
 * 複雑度解析データの取得
 */

import type { ComplexityIndex, FileMetrics } from "../types/complexity";
import { fetchJson, fetchJsonOrNull } from "./httpClient";

/**
 * 複雑度インデックスを取得する
 * @returns インデックスデータ、または存在しない場合は null
 */
export async function fetchComplexityIndex(): Promise<ComplexityIndex | null> {
  return fetchJsonOrNull<ComplexityIndex>("/data/complexity/index.json");
}

/**
 * ファイルの詳細メトリクスを取得する
 * @param relativePath - 相対パス（例: "domain/core/entity/unit.rs"）
 * @returns ファイルメトリクス
 */
export async function fetchFileMetrics(
  relativePath: string
): Promise<FileMetrics> {
  // 階層構造パスに変換（.rs → .json）
  const jsonPath = relativePath.replace(/\.[^.]+$/, ".json");
  const fullPath = `/data/complexity/${jsonPath}`;
  return fetchJson<FileMetrics>(fullPath);
}

/**
 * ファイルの詳細メトリクスを取得する（存在しない場合はnull）
 * @param relativePath - 相対パス
 * @returns ファイルメトリクス、または存在しない場合は null
 */
export async function fetchFileMetricsOrNull(
  relativePath: string
): Promise<FileMetrics | null> {
  const jsonPath = relativePath.replace(/\.[^.]+$/, ".json");
  const fullPath = `/data/complexity/${jsonPath}`;
  return fetchJsonOrNull<FileMetrics>(fullPath);
}
