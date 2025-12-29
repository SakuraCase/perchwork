/**
 * tracelight エラー型定義
 */

/** エラー種別 */
export type ErrorType =
  | 'ConfigNotFound'
  | 'TargetDirNotFound'
  | 'GitNotAvailable'
  | 'SchemaValidationError'
  | 'LLMError'
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
 * 設定ファイルが見つからないエラー
 */
export class ConfigNotFoundError extends TracelightError {
  constructor(path: string) {
    super('ConfigNotFound', `Config file not found: ${path}`);
  }
}

/**
 * 対象ディレクトリが見つからないエラー
 */
export class TargetDirNotFoundError extends TracelightError {
  constructor(path: string) {
    super('TargetDirNotFound', `Target directory not found: ${path}`);
  }
}

/**
 * Git コマンドが使用不可エラー
 */
export class GitNotAvailableError extends TracelightError {
  constructor(details?: string) {
    super('GitNotAvailable', 'Git command is not available', details);
  }
}

/**
 * スキーマ検証エラー
 */
export class SchemaValidationError extends TracelightError {
  constructor(itemId: string, details: unknown) {
    super('SchemaValidationError', `Schema validation failed for item: ${itemId}`, details);
  }
}

/**
 * LLM 解析エラー
 */
export class LLMError extends TracelightError {
  readonly retryCount: number;

  constructor(message: string, retryCount: number = 0) {
    super('LLMError', message);
    this.retryCount = retryCount;
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

/**
 * エラーがリカバリー可能かどうかを判定
 */
export function isRecoverable(error: TracelightError): boolean {
  switch (error.type) {
    case 'ConfigNotFound':
    case 'TargetDirNotFound':
    case 'DataNotFound':
      return false;  // 処理中断
    case 'GitNotAvailable':
      return true;   // フォールバック可能
    case 'SchemaValidationError':
      return true;   // 該当項目スキップ
    case 'LLMError':
      return error instanceof LLMError && error.retryCount < 3;  // 3回までリトライ
    case 'ParseError':
    case 'NetworkError':
      return false;  // 処理中断
    default:
      return false;
  }
}
