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

/** 重複の重要度 (Phase 2 で設定) */
export type DuplicationSeverity = 'high' | 'medium' | 'low' | 'none';

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
  strategy: RefactoringStrategy | 'no_refactoring';
  /** タイトル（短い要約） */
  title: string;
  /** 概要（なぜこの変更が必要か） */
  summary: string;
  /** 対象ファイル・箇所の説明 */
  targets: string;
  /** 修正内容（具体的な変更手順） */
  changes: string;
  /** Claude Code に貼り付けるプロンプト（no_refactoring の場合は null） */
  prompt: string | null;
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
  // Phase 2 で追加されるフィールド
  /** 重要度 */
  severity?: DuplicationSeverity;
  /** 意味のある重複かどうか */
  is_meaningful?: boolean;
  /** この重複の説明 */
  explanation?: string;
  /** 修正が必要か */
  needs_fix?: boolean;
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
  // Phase 3 で追加される統計
  /** high重要度の数 */
  high_severity_count?: number;
  /** medium重要度の数 */
  medium_severity_count?: number;
  /** low重要度の数 */
  low_severity_count?: number;
  /** none重要度の数 */
  none_severity_count?: number;
  /** 修正必要な重複の数 */
  needs_fix_count?: number;
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
    // Phase 2 で追加
    severity?: DuplicationSeverity;
    needs_fix?: boolean;
  }>;
}
