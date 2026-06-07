/**
 * duplication.ts
 *
 * 重複コード検出機能に関する型定義
 */

/** リファクタリング戦略 */
export type RefactoringStrategy =
  | 'extract_function'
  | 'extract_trait'
  | 'use_macro'
  | 'parameterize';

/** ファイル位置 */
export interface FileLocation {
  /** ファイルパス（相対） */
  path: string;
  /** 開始行 */
  startLine: number;
  /** 終了行 */
  endLine: number;
}

/** リファクタリング提案 */
export interface RefactoringSuggestion {
  /** 戦略 */
  strategy: RefactoringStrategy;
  /** 機械的な提案説明 */
  description: string;
}

/** 重複グループ（3箇所以上の重複をグループ化） */
export interface DuplicationGroup {
  /** グループID */
  id: string;
  /** fragmentのハッシュ */
  fragment_hash: string;
  /** 重複行数 */
  lines: number;
  /** 重複トークン数 */
  tokens: number;
  /** 重複箇所のリスト（3箇所以上） */
  locations: FileLocation[];
  /** コード断片 */
  fragment?: string;
  /** リファクタリング提案 */
  refactoring_suggestion?: RefactoringSuggestion;
}

/** 重複統計 */
export interface DuplicationStats {
  /** 解析対象ファイル数 */
  total_files: number;
  /** 検出された重複グループ数 */
  total_duplicates: number;
  /** 重複行数の合計 */
  total_duplicated_lines: number;
  /** 重複率（%） */
  duplication_percentage: number;
}

/** 重複インデックス */
export interface DuplicationIndex {
  /** バージョン */
  version: string;
  /** 生成日時 */
  generated_at: string;
  /** 解析対象ディレクトリ */
  target_dir: string;
  /** 設定 */
  config: {
    /** 最小重複行数 */
    min_lines: number;
    /** 最小重複トークン数 */
    min_tokens: number;
    /** 最小重複箇所数 */
    min_locations: number;
  };
  /** 統計情報 */
  stats: DuplicationStats;
  /** 重複グループ一覧 */
  duplicates: Array<{
    id: string;
    lines: number;
    /** 重複箇所数 */
    location_count: number;
    /** 関連ファイル */
    files: string[];
  }>;
}
