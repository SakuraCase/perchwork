/**
 * view.ts
 *
 * ビュー切り替えに関する型定義
 */

/** タブの種類 */
export type ViewTab = 'graph' | 'tree' | 'sequence' | 'ai';

/** ディレクトリグループ（ツリー表示用） */
export interface DirectoryGroup {
  /** ディレクトリ名 (entity, service, value_object, master) */
  name: string;
  /** ディレクトリ内のファイル一覧 */
  files: Array<{
    path: string;
    items: number;
    tests: number;
  }>;
}

/** ファイルエントリ */
export interface FileEntry {
  path: string;
  items: number;
  tests: number;
}

/** 再帰的なツリーノード */
export interface TreeNode {
  /** ディレクトリ名 */
  name: string;
  /** フルパス */
  path: string;
  /** サブディレクトリ */
  children: TreeNode[];
  /** このディレクトリ直下のファイル */
  files: FileEntry[];
}
