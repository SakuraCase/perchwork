/**
 * JSONファイルの取得とパース
 */

import type {
  IndexFile,
  SplitFile,
  CallGraphChunk,
} from '../types/schema';
import { fetchJson, fetchJsonOrNull } from './httpClient';

/**
 * index.json を取得する
 * @returns インデックスファイルのデータ、または存在しない場合は null
 * @throws {NetworkError} ネットワークエラーが発生した場合
 */
export async function fetchIndex(): Promise<IndexFile | null> {
  return fetchJsonOrNull<IndexFile>('/data/structure/index.json');
}

/**
 * 分割ファイル（SplitFile）を取得する
 * @param path - ファイルパス（例: "domain/core.json"）
 * @returns 分割ファイルのデータ
 * @throws {DataNotFoundError} ファイルが見つからない場合
 * @throws {ParseError} JSONパースに失敗した場合
 * @throws {NetworkError} ネットワークエラーが発生した場合
 */
export async function fetchSplitFile(path: string): Promise<SplitFile> {
  const fullPath = `/data/structure/${path}`;
  return fetchJson<SplitFile>(fullPath);
}

/**
 * コールグラフチャンクを取得する
 * @param path - ファイルパス（例: "call_graph/domain_core.json"）
 * @returns コールグラフチャンクのデータ
 * @throws {DataNotFoundError} ファイルが見つからない場合
 * @throws {ParseError} JSONパースに失敗した場合
 * @throws {NetworkError} ネットワークエラーが発生した場合
 */
export async function fetchCallGraphChunk(path: string): Promise<CallGraphChunk> {
  const fullPath = `/data/structure/${path}`;
  return fetchJson<CallGraphChunk>(fullPath);
}
