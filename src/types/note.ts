/**
 * ノート機能の型定義
 */

/** セッションエントリ */
export interface NoteSessionEntry {
  id: string;
  title: string;
  createdAt: string;
  path: string;
}

/** ドキュメントエントリ */
export interface NoteDocumentEntry {
  id: string;
  title: string;
  path: string;
}

/** ドキュメントカテゴリ */
export interface NoteDocumentCategory {
  id: string;
  name: string;
  items: NoteDocumentEntry[];
}

/** ノートサイドパネルのタブ */
export type NoteSidePanelTab = "sessions" | "document";

/** ノート選択状態 */
export interface NoteSelection {
  type: "session" | "document";
  id: string;
  path: string;
}
