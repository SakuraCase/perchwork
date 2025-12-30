/**
 * tracelight 出力 JSON スキーマの型定義
 */

// ============================================
// index.json
// ============================================

/**
 * ファイルエントリ（index.json内）
 */
export interface IndexFileEntry {
  /** ファイルパス（例: "entity/battle_state.json"） */
  path: string;

  /** アイテム数 */
  items: number;

  /** テスト数 */
  tests: number;
}

/**
 * メインインデックスファイル
 */
export interface IndexFile {
  /** バージョン情報 */
  version: string;

  /** 生成日時（ISO 8601形式） */
  generated_at: string;

  /** ターゲットディレクトリ */
  target_dir: string;

  /** ファイル一覧 */
  files: IndexFileEntry[];

  /** 統計情報 */
  stats: {
    total_files: number;
    total_items: number;
    total_tests: number;
    total_edges?: number;
  };
}

/**
 * 完全なインデックスファイル形式（将来の仕様）
 *
 * 現在は使用していないが、Phase 1のジェネレーター改善時に使用予定
 */
export interface IndexFileFormat {
  /** スキーマバージョン（セマンティックバージョニング） */
  schema_version: `${number}.${number}.${number}`;

  /** 最低限必要なリーダーバージョン（後方互換性の明示） */
  min_reader_version: `${number}.${number}.${number}`;

  /** 生成日時（ISO 8601形式） */
  generated_at: string;

  /** ジェネレーターのバージョン */
  generator_version: string;

  /** プロジェクトルートパス */
  root_path: string;

  /** 設定情報 */
  config: {
    target_dir: string;
    split_depth: number;
    extensions: string[];
  };

  /** ファイル一覧 */
  files: FileEntry[];

  /** 統計情報 */
  statistics: {
    total_files: number;
    total_items: number;
    total_functions: number;
    total_structs: number;
  };
}

/**
 * ファイルエントリ（完全な形式）
 */
export interface FileEntry {
  /** public/data からの相対パス */
  path: string;

  /** 元のソースディレクトリ */
  source_dir: string;

  /** 含まれるアイテム数 */
  item_count: number;

  /** ファイルハッシュ（SHA-256） */
  hash: string;

  /** 最終更新日時（ISO 8601形式） */
  last_modified: string;
}

// ============================================
// 分割 JSON ファイル
// ============================================

/** アイテムの種類 */
export type ItemType = 'struct' | 'enum' | 'trait' | 'fn' | 'impl' | 'mod' | 'const' | 'type' | 'method';

/** アイテムID（一意性保証のフォーマット） */
export type ItemId = `${string}::${string}::${ItemType}`;

/**
 * 分割されたコードデータファイル
 */
export interface SplitFile {
  /** ソースディレクトリ */
  source_dir: string;

  /** 生成日時（ISO 8601形式） */
  generated_at: string;

  /** ソースファイル一覧 */
  files: SourceFile[];
}

/**
 * ソースファイル情報
 */
export interface SourceFile {
  /** ファイルパス */
  path: string;

  /** ファイルハッシュ（SHA-256） */
  hash: string;

  /** 最終更新日時（ISO 8601形式） */
  last_modified: string;

  /** コードアイテム一覧 */
  items: CodeItem[];
}

/**
 * コードアイテム（関数、構造体、トレイトなど）
 */
export interface CodeItem {
  /** アイテムID（例: "path/to/file.rs::ItemName::struct"） */
  id: ItemId;

  /** アイテムの種類 */
  type: ItemType;

  /** アイテム名 */
  name: string;

  /** 開始行番号 */
  line_start: number;

  /** 終了行番号（オプション） */
  line_end?: number;

  /** シグネチャ（関数の場合は引数と戻り値を含む） */
  signature: string;

  /** 1行概要（セマンティック情報、Phase 2出力でマージ） */
  summary?: string;

  /** 責務説明（セマンティック情報、Phase 2出力でマージ） */
  responsibility?: string;

  /** 可視性 */
  visibility?: 'pub' | 'pub(crate)' | 'pub(super)' | 'private';

  /** テスト参照（このアイテムをテストする関数のID） */
  tested_by?: ItemId[];

  /** 静的依存（このアイテムが依存する他アイテムのID） */
  depends_on?: ItemId[];
}

// ============================================
// call_graph/index.json
// ============================================

/**
 * コールグラフインデックス
 */
export interface CallGraphIndex {
  /** スキーマバージョン */
  schema_version: string;

  /** 生成日時（ISO 8601形式） */
  generated_at: string;

  /** チャンク一覧 */
  chunks: ChunkEntry[];

  /** 統計情報 */
  statistics: {
    total_nodes: number;
    total_edges: number;
  };
}

/**
 * チャンクエントリ
 */
export interface ChunkEntry {
  /** チャンクファイルパス（例: "domain_core.json"） */
  path: string;

  /** 含まれるソースディレクトリ */
  source_dirs: string[];

  /** ノード数 */
  node_count: number;

  /** エッジ数 */
  edge_count: number;
}

// ============================================
// call_graph/*.json（分割）
// ============================================

/**
 * コールグラフチャンク
 */
export interface CallGraphChunk {
  /** 含まれるソースディレクトリ */
  source_dirs: string[];

  /** 生成日時（ISO 8601形式） */
  generated_at: string;

  /** グラフノード一覧 */
  nodes: GraphNode[];

  /** グラフエッジ一覧 */
  edges: GraphEdge[];

  /** 他チャンクへの参照 */
  external_refs: ItemId[];
}

/**
 * グラフノード
 */
export interface GraphNode {
  /** アイテムID */
  id: ItemId;

  /** ファイルパス */
  file: string;

  /** 行番号 */
  line: number;
}

/**
 * グラフエッジ（呼び出し関係）
 */
export interface GraphEdge {
  /** 呼び出し元のアイテムID */
  from: ItemId;

  /** 呼び出し先のアイテムID */
  to: ItemId;

  /** 呼び出し位置 */
  call_site: {
    file: string;
    line: number;
  };
}

// ============================================
// search_index.json
// ============================================

/**
 * 検索インデックス
 */
export interface SearchIndex {
  /** バージョン */
  version: string;

  /** 生成日時（ISO 8601形式） */
  generated_at: string;

  /** トークン → アイテムIDリストのマッピング */
  tokens: Record<string, ItemId[]>;
}

// ============================================
// semantic/*.json（Phase 2 LLM出力）
// ============================================

/**
 * セマンティックファイル（Phase 2 出力）
 */
export interface SemanticFile {
  /** ソースファイルパス */
  path: string;

  /** 生成日時（ISO 8601形式） */
  generated_at?: string;

  /** アイテムの意味情報 */
  items: SemanticItem[];

  /** テストの意味情報 */
  tests: SemanticTest[];
}

/**
 * アイテムの意味情報
 */
export interface SemanticItem {
  /** 対応するアイテムのID */
  id: ItemId;

  /** 1行説明（最大50文字） */
  summary: string;

  /** 責務説明（struct/enumのみ、最大100文字） */
  responsibility?: string;
}

/**
 * テストの意味情報
 */
export interface SemanticTest {
  /** テストのID */
  id: string;

  /** テストの目的（最大50文字） */
  summary: string;

  /** テスト対象のアイテムID */
  tested_item?: ItemId;
}
