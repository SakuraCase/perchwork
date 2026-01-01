/**
 * useDebounce.ts
 *
 * 値のデバウンス処理を行うカスタムフック
 * 検索入力など、頻繁に更新される値の処理を遅延させる
 */

import { useState, useEffect } from 'react';

/**
 * 値をデバウンスするフック
 *
 * @param value - デバウンス対象の値
 * @param delay - 遅延時間（ミリ秒）
 * @returns デバウンスされた値
 *
 * @example
 * const [query, setQuery] = useState('');
 * const debouncedQuery = useDebounce(query, 150);
 *
 * useEffect(() => {
 *   // debouncedQuery が変更されたときのみ検索を実行
 *   search(debouncedQuery);
 * }, [debouncedQuery]);
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
