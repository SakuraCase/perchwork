/**
 * perchwork エラー型定義
 */

/** エラー種別 */
export type ErrorType =
  | 'DataNotFound'
  | 'ParseError'
  | 'NetworkError';

/**
 * perchwork 基底エラークラス
 */
export class PerchworkError extends Error {
  readonly type: ErrorType;
  readonly details?: unknown;

  constructor(
    type: ErrorType,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.name = 'PerchworkError';
    this.type = type;
    this.details = details;
  }
}

/**
 * データが見つからないエラー
 */
export class DataNotFoundError extends PerchworkError {
  constructor(path: string) {
    super('DataNotFound', `Data file not found: ${path}`);
  }
}

/**
 * JSONパースエラー
 */
export class ParseError extends PerchworkError {
  constructor(path: string, details?: unknown) {
    super('ParseError', `Failed to parse JSON file: ${path}`, details);
  }
}

/**
 * ネットワークエラー
 */
export class NetworkError extends PerchworkError {
  constructor(url: string, details?: unknown) {
    super('NetworkError', `Network request failed: ${url}`, details);
  }
}
