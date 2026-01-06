/**
 * review.ts
 *
 * コードレビュー機能に関する型定義
 */

/** レビューエージェント種別 */
export type ReviewAgent =
  | 'comment-analyzer'
  | 'pr-test-analyzer'
  | 'silent-failure-hunter'
  | 'type-design-analyzer'
  | 'code-reviewer'
  | 'code-simplifier';

/** エージェント実行ステータス */
export type AgentStatus = 'success' | 'error' | 'skipped';

/** 修正計画の優先度 */
export type FixPriority = 'high' | 'medium' | 'low';

/** 修正計画 */
export interface FixPlan {
  /** 優先度 */
  priority: FixPriority;
  /** 問題タイトル */
  title: string;
  /** 詳細説明 */
  description: string;
  /** Claude Code に貼り付けるプロンプト */
  prompt: string;
  /** 元エージェント（オプション） */
  agent?: ReviewAgent;
}

/** コメント解析結果 */
export interface CommentAnalyzerResult {
  status: AgentStatus;
  issues: Array<{
    line: number;
    confidence: 'high' | 'medium' | 'low';
    message: string;
  }>;
}

/** テスト解析結果 */
export interface TestAnalyzerResult {
  status: AgentStatus;
  coverage_score: number; // 1-10
  gaps: Array<{
    item: string;
    description: string;
  }>;
}

/** サイレントエラー検出結果 */
export interface SilentFailureResult {
  status: AgentStatus;
  findings: Array<{
    line: number;
    severity: 'critical' | 'high' | 'medium';
    message: string;
  }>;
}

/** 型設計解析結果 */
export interface TypeDesignResult {
  status: AgentStatus;
  scores: {
    encapsulation: number; // 1-10
    invariant: number; // 1-10
    usefulness: number; // 1-10
    enforcement: number; // 1-10
  };
  recommendations: string[];
}

/** コードレビュー結果 */
export interface CodeReviewerResult {
  status: AgentStatus;
  score: number; // 0-100
  issues: Array<{
    line: number;
    message: string;
    suggestion?: string;
  }>;
}

/** コード簡素化提案 */
export interface CodeSimplifierResult {
  status: AgentStatus;
  suggestions: Array<{
    line_start: number;
    line_end: number;
    description: string;
    improvement: string;
  }>;
}

/** エージェント結果のユニオン型 */
export type AgentResult =
  | CommentAnalyzerResult
  | TestAnalyzerResult
  | SilentFailureResult
  | TypeDesignResult
  | CodeReviewerResult
  | CodeSimplifierResult;

/** エージェント結果のマップ型 */
export interface AgentResults {
  'comment-analyzer'?: CommentAnalyzerResult;
  'pr-test-analyzer'?: TestAnalyzerResult;
  'silent-failure-hunter'?: SilentFailureResult;
  'type-design-analyzer'?: TypeDesignResult;
  'code-reviewer'?: CodeReviewerResult;
  'code-simplifier'?: CodeSimplifierResult;
}

/** ファイルレビュー結果 */
export interface ReviewFileResult {
  /** ファイルパス（相対） */
  path: string;
  /** 生成日時 */
  generated_at: string;
  /** エージェント別結果 */
  agents: AgentResults;
  /** 統合された修正計画 */
  fix_plans: FixPlan[];
}

/** レビューインデックス */
export interface ReviewIndex {
  /** バージョン */
  version: string;
  /** 生成日時 */
  generated_at: string;
  /** 設定情報 */
  config: {
    target_dir: string;
    mode: 'diff' | 'full';
  };
  /** サマリー */
  summary: {
    total_files: number;
    total_fix_plans: number;
    by_priority: {
      high: number;
      medium: number;
      low: number;
    };
  };
  /** ファイル一覧 */
  files: Array<{
    path: string;
    fix_plans: number;
  }>;
}

/** レビューサイドパネルのタブ */
export type ReviewSidePanelTab = 'overview' | 'files';

/** レビュー選択状態 */
export interface ReviewSelection {
  /** 選択されたファイルパス */
  filePath: string | null;
  /** 選択された修正計画インデックス */
  fixPlanIndex: number | null;
}
