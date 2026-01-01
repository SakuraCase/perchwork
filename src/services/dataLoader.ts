/**
 * JSONファイルの取得とパース
 */

import type {
  IndexFile,
  SplitFile,
  CallGraphChunk,
  SemanticFile,
} from '../types/schema';
import { fetchJson, fetchJsonOrNull } from './httpClient';

/**
 * index.json を取得する
 * @returns インデックスファイルのデータ
 * @throws {DataNotFoundError} ファイルが見つからない場合
 * @throws {ParseError} JSONパースに失敗した場合
 * @throws {NetworkError} ネットワークエラーが発生した場合
 */
export async function fetchIndex(): Promise<IndexFile> {
  return fetchJson<IndexFile>('/data/structure/index.json');
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

/**
 * セマンティックファイル（Phase 2 出力）を取得する
 * @param path - ファイルパス（例: "entity/battle_state.json"）
 * @returns セマンティックファイルのデータ、または存在しない場合は null
 */
export async function fetchSemanticFile(path: string): Promise<SemanticFile | null> {
  const fullPath = `/data/semantic/${path}`;
  return fetchJsonOrNull<SemanticFile>(fullPath);
}
