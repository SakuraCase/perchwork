/**
 * tracelight エラー型定義
 */

/** エラー種別 */
export type ErrorType =
  | 'DataNotFound'
  | 'ParseError'
  | 'NetworkError';

/**
 * tracelight 基底エラークラス
 */
export class TracelightError extends Error {
  readonly type: ErrorType;
  readonly details?: unknown;

  constructor(
    type: ErrorType,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.name = 'TracelightError';
    this.type = type;
    this.details = details;
  }
}

/**
 * データが見つからないエラー
 */
export class DataNotFoundError extends TracelightError {
  constructor(path: string) {
    super('DataNotFound', `Data file not found: ${path}`);
  }
}

/**
 * JSONパースエラー
 */
export class ParseError extends TracelightError {
  constructor(path: string, details?: unknown) {
    super('ParseError', `Failed to parse JSON file: ${path}`, details);
  }
}

/**
 * ネットワークエラー
 */
export class NetworkError extends TracelightError {
  constructor(url: string, details?: unknown) {
    super('NetworkError', `Network request failed: ${url}`, details);
  }
}
