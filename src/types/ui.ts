/**
 * UI固有の型定義
 */

import type { ItemId } from './schema';

/**
 * ツリービューのノード
 */
export interface TreeNode {
  /** ノードの一意識別子 */
  id: string;

  /** 表示名 */
  name: string;

  /** ノードの種類 */
  type: 'directory' | 'file';

  /** ファイルパス */
  path: string;

  /** 子ノード（ディレクトリの場合のみ） */
  children?: TreeNode[];

  /** 含まれるアイテム数（ファイルの場合のみ） */
  itemCount?: number;

  /** データがロード済みかどうか */
  isLoaded: boolean;

  /** 展開状態 */
  isExpanded: boolean;
}

/**
 * 選択状態
 */
export interface SelectionState {
  /** 選択中のファイルパス（null = 未選択） */
  selectedFile: string | null;

  /** 選択中のアイテムID（null = 未選択） */
  selectedItem: ItemId | null;
}

/**
 * ローディング状態
 */
export interface LoadingState {
  /** ロード中かどうか */
  isLoading: boolean;

  /** ロード中のファイルパス（null = ロード中でない） */
  loadingPath: string | null;

  /** エラーメッセージ（null = エラーなし） */
  error: string | null;
}
