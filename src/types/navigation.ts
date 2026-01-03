/**
 * navigation.ts
 *
 * ナビゲーション履歴に関する型定義
 */

import type { ItemId } from './schema';
import type { ViewTab } from './view';

/**
 * ナビゲーション履歴エントリ
 */
export interface NavigationHistoryEntry {
  /** 一意なエントリID */
  id: string;
  /** 選択されたアイテムID（null = ファイル選択/定義一覧） */
  itemId: ItemId | null;
  /** ファイルパス */
  filePath: string;
  /** アイテム名（表示用）- ファイル選択時は構造体名 */
  itemName: string;
  /** 発生したタブ */
  tab: ViewTab;
  /** タイムスタンプ */
  timestamp: number;
}
