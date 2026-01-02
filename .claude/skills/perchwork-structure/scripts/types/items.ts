/**
 * フィールド情報
 */
export interface FieldInfo {
  name: string;
  type: string;
}

/**
 * 抽出されたアイテムの型定義
 */
export interface ExtractedItem {
  id: string;
  type: 'struct' | 'enum' | 'trait' | 'impl' | 'function' | 'method';
  name: string;
  line_start: number;
  line_end: number;
  visibility: 'pub' | 'pub(crate)' | 'private';
  signature: string;
  fields?: FieldInfo[];
  is_async?: boolean;
  impl_for?: string;
  trait_name?: string;
}

/**
 * テスト情報の型定義
 */
export interface TestInfo {
  id: string;
  name: string;
  line_start: number;
  is_async: boolean;
}
