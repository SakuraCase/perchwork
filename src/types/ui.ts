/**
 * UI固有の型定義
 */

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
