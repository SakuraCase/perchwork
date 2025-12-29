/**
 * データキャッシュの管理
 */

/** キャッシュエントリ */
interface CacheEntry<T> {
  /** キャッシュされたデータ */
  value: T;
  /** 有効期限（ミリ秒単位のタイムスタンプ） */
  expiresAt: number;
}

/** キャッシュストア */
const cache = new Map<string, CacheEntry<unknown>>();

/**
 * キャッシュからデータを取得する
 * @param key - キャッシュキー
 * @returns キャッシュされたデータ、または存在しない/期限切れの場合は null
 */
export function get<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;

  if (!entry) {
    return null;
  }

  // 有効期限チェック
  if (isExpired(key)) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

/**
 * キャッシュにデータを保存する
 * @param key - キャッシュキー
 * @param value - キャッシュするデータ
 * @param ttl - 有効期限（秒単位、デフォルト: 300秒）
 */
export function set<T>(key: string, value: T, ttl: number = 300): void {
  const expiresAt = Date.now() + ttl * 1000;
  cache.set(key, { value, expiresAt });
}

/**
 * キャッシュ全体をクリアする
 */
export function clear(): void {
  cache.clear();
}

/**
 * 指定されたキーのキャッシュが期限切れかどうかを判定する
 * @param key - キャッシュキー
 * @returns 期限切れの場合 true、それ以外は false
 */
export function isExpired(key: string): boolean {
  const entry = cache.get(key);

  if (!entry) {
    return true;
  }

  return Date.now() > entry.expiresAt;
}
