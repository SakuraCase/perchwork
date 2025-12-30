/**
 * JSONファイルの取得とパース
 */

import type {
  IndexFile,
  SplitFile,
  CallGraphChunk,
  SemanticFile,
} from '../types/schema';
import {
  DataNotFoundError,
  ParseError,
  NetworkError,
} from '../types/errors';

/**
 * index.json を取得する
 * @returns インデックスファイルのデータ
 * @throws {DataNotFoundError} ファイルが見つからない場合
 * @throws {ParseError} JSONパースに失敗した場合
 * @throws {NetworkError} ネットワークエラーが発生した場合
 */
export async function fetchIndex(): Promise<IndexFile> {
  return fetchJson<IndexFile>('/data/index.json');
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
  const fullPath = `/data/${path}`;
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
  const fullPath = `/data/${path}`;
  return fetchJson<CallGraphChunk>(fullPath);
}

/**
 * セマンティックファイル（Phase 2 出力）を取得する
 * @param path - ファイルパス（例: "entity/battle_state.json"）
 * @returns セマンティックファイルのデータ、または存在しない場合は null
 */
export async function fetchSemanticFile(path: string): Promise<SemanticFile | null> {
  const fullPath = `/data/semantic/${path}`;
  try {
    return await fetchJson<SemanticFile>(fullPath);
  } catch (error) {
    // セマンティックファイルが存在しない場合は null を返す
    if (error instanceof DataNotFoundError) {
      return null;
    }
    throw error;
  }
}

/**
 * 汎用JSONフェッチ関数
 * @param url - 取得するJSONファイルのURL
 * @returns パースされたJSONデータ
 * @throws {DataNotFoundError} ファイルが見つからない場合（404）
 * @throws {ParseError} JSONパースに失敗した場合
 * @throws {NetworkError} ネットワークエラーが発生した場合
 */
async function fetchJson<T>(url: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url);
  } catch (error) {
    throw new NetworkError(url, error);
  }

  // 404 エラーの場合は DataNotFoundError をスロー
  if (response.status === 404) {
    throw new DataNotFoundError(url);
  }

  // その他の HTTP エラーの場合は NetworkError をスロー
  if (!response.ok) {
    throw new NetworkError(url, {
      status: response.status,
      statusText: response.statusText,
    });
  }

  // JSON パース
  try {
    return await response.json() as T;
  } catch (error) {
    throw new ParseError(url, error);
  }
}
