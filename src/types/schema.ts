// Phase 1 で詳細定義
// ここでは基本的な型のみ

export type ItemType = 'struct' | 'enum' | 'trait' | 'fn' | 'impl' | 'mod' | 'const' | 'type' | 'method';
export type ItemId = `${string}::${string}::${ItemType}`;

export interface IndexFile {
  schema_version: string;
  generated_at: string;
  root_path: string;
  files: FileEntry[];
}

export interface FileEntry {
  path: string;
  source_dir: string;
  item_count: number;
  hash: string;
}
