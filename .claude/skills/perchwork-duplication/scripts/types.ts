/**
 * Perchwork Duplication - 型定義
 */

/** 設定ファイルの型 */
export interface Config {
  target_dir: string;
  extensions?: string[];
  exclude?: string[];
  language?: string;
}

/** jscpd ファイル位置 */
export interface JscpdLocation {
  name: string;
  start: number;
  end: number;
  startLoc: { line: number; column: number };
  endLoc: { line: number; column: number };
}

/** jscpd 重複エントリ */
export interface JscpdDuplicate {
  format: string;
  lines: number;
  tokens: number;
  firstFile: JscpdLocation;
  secondFile: JscpdLocation;
  fragment?: string;
}

/** jscpd 統計 */
export interface JscpdStatistics {
  detectionDate: string;
  formats: Record<
    string,
    {
      total: {
        lines: number;
        sources: number;
        clones: number;
        duplicatedLines: number;
        percentage: number;
      };
    }
  >;
  total: {
    lines: number;
    sources: number;
    clones: number;
    duplicatedLines: number;
    percentage: number;
  };
}

/** jscpd JSON出力 */
export interface JscpdOutput {
  duplicates: JscpdDuplicate[];
  statistics: JscpdStatistics;
}

/** ファイル位置（perchwork形式） */
export interface FileLocation {
  path: string;
  startLine: number;
  endLine: number;
}

/** リファクタリング戦略 */
export type RefactoringStrategy =
  | 'extract_function'
  | 'extract_trait'
  | 'use_macro'
  | 'parameterize';

/** リファクタリング提案 */
export interface RefactoringSuggestion {
  strategy: RefactoringStrategy;
  description: string;
  prompt: string;
}

/** 重複の重要度 (Phase 2 で設定) */
export type DuplicationSeverity = 'high' | 'medium' | 'low' | 'none';

/** 重複ペア（jscpdの生出力形式、内部使用） */
export interface DuplicationPair {
  id: string;
  lines: number;
  tokens: number;
  fileA: FileLocation;
  fileB: FileLocation;
  fragment?: string;
  fragment_hash?: string;
}

/** 重複グループ（3箇所以上の重複をグループ化） */
export interface DuplicationGroup {
  /** グループID */
  id: string;
  /** fragmentのハッシュ（グループ化キー） */
  fragment_hash: string;
  /** 重複行数 */
  lines: number;
  /** トークン数 */
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
  total_files: number;
  total_duplicates: number;
  total_duplicated_lines: number;
  duplication_percentage: number;
  // Phase 2 で追加される統計
  high_severity_count?: number;
  needs_fix_count?: number;
}

/** インデックスファイル */
export interface DuplicationIndex {
  version: string;
  /** フェーズ番号（1: 生データ, 2: グループ化, 3: LLM判断後） */
  phase?: number;
  generated_at: string;
  target_dir: string;
  config: {
    min_lines: number;
    min_tokens: number;
    /** 最小重複箇所数（デフォルト: 3） */
    min_locations?: number;
    /** 類似度閾値（デフォルト: 0.85） */
    similarity_threshold?: number;
  };
  stats: DuplicationStats;
  /** 重複グループ一覧（3箇所以上の重複のみ） */
  duplicates: Array<{
    id: string;
    lines: number;
    /** 重複箇所数 */
    location_count: number;
    /** 代表的なファイルパス */
    files: string[];
    // Phase 2 で追加
    severity?: DuplicationSeverity;
    needs_fix?: boolean;
  }>;
}
