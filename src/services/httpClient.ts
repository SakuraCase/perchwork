/**
 * HTTP クライアントユーティリティ
 *
 * JSONフェッチとエラーハンドリングを統一的に行う。
 */

import { DataNotFoundError, ParseError, NetworkError } from '@/types/errors';

/**
 * 汎用JSONフェッチ関数
 *
 * @param url - 取得するJSONファイルのURL
 * @returns パースされたJSONデータ
 * @throws {DataNotFoundError} ファイルが見つからない場合（404）
 * @throws {ParseError} JSONパースに失敗した場合
 * @throws {NetworkError} ネットワークエラーが発生した場合
 */
export async function fetchJson<T>(url: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url);
  } catch (error) {
    throw new NetworkError(url, error);
  }

  // 404エラーの場合はDataNotFoundErrorをスロー
  if (response.status === 404) {
    throw new DataNotFoundError(url);
  }

  // その他のHTTPエラーの場合はNetworkErrorをスロー
  if (!response.ok) {
    throw new NetworkError(url, {
      status: response.status,
      statusText: response.statusText,
    });
  }

  // JSONパース
  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new ParseError(url, error);
  }
}

/**
 * JSONフェッチ（存在しない場合はnullを返す）
 *
 * @param url - 取得するJSONファイルのURL
 * @returns パースされたJSONデータ、または存在しない場合はnull
 * @throws {ParseError} JSONパースに失敗した場合
 * @throws {NetworkError} ネットワークエラーが発生した場合
 */
export async function fetchJsonOrNull<T>(url: string): Promise<T | null> {
  try {
    return await fetchJson<T>(url);
  } catch (error) {
    if (error instanceof DataNotFoundError) {
      return null;
    }
    throw error;
  }
}
