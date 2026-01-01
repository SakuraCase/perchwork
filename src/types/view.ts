/**
 * view.ts
 *
 * ビュー切り替えに関する型定義
 */

/** タブの種類 */
export type ViewTab = 'graph' | 'tree' | 'sequence';

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
