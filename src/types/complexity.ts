/**
 * complexity.ts
 *
 * コード複雑度解析データの型定義
 */

/** LOC メトリクス */
export interface LocMetrics {
  total: number;
  code: number;
  comment: number;
  blank: number;
}

/** Halstead メトリクス */
export interface HalsteadMetrics {
  n1: number; // 総オペレータ数
  n2: number; // 総オペランド数
  N1: number; // ユニークオペレータ数
  N2: number; // ユニークオペランド数
  length: number; // プログラム長
  vocabulary: number; // ボキャブラリ
  volume: number; // ボリューム
  difficulty: number; // 難易度
  effort: number; // 労力
  bugs: number; // 推定バグ数
  time: number; // 推定実装時間
}

/** 関数/メソッドのメトリクス */
export interface FunctionMetrics {
  id: string;
  name: string;
  kind: "function" | "method" | "impl" | "closure";
  line_start: number;
  line_end: number;
  cc: number; // Cyclomatic Complexity
  cognitive: number; // Cognitive Complexity
  nargs: number; // 引数の数
  nexits: number; // 出口の数
  loc: LocMetrics;
  halstead?: HalsteadMetrics;
}

/** ファイルのメトリクス */
export interface FileMetrics {
  path: string;
  relative_path: string;
  language: string;
  loc: LocMetrics;
  cc_sum: number; // ファイル全体のCC合計
  cc_avg: number; // 平均CC
  cognitive_sum: number; // ファイル全体のCognitive合計
  cognitive_avg: number; // 平均Cognitive
  mi?: number; // Maintainability Index
  functions: FunctionMetrics[];
}

/** 統計サマリー */
export interface ComplexityStats {
  total_files: number;
  total_functions: number;
  total_loc: number;
  avg_cc: number;
  avg_cognitive: number;
  max_cc: number;
  max_cognitive: number;
  warnings: {
    high_cc: number; // CC > 10 の関数数
    high_cognitive: number; // Cognitive > 15 の関数数
    low_mi: number; // MI < 20 のファイル数
  };
}

/** インデックスファイルの型 */
export interface ComplexityIndex {
  version: string;
  generated_at: string;
  target_dir: string;
  language: string;
  stats: ComplexityStats;
  files: ComplexityFileSummary[];
}

/** ファイルサマリー（インデックス用） */
export interface ComplexityFileSummary {
  path: string;
  relative_path: string;
  cc_avg: number;
  cognitive_avg: number;
  function_count: number;
  loc: number;
  mi?: number;  // Maintainability Index
}

/** メトリクスの種類 */
export type MetricType =
  | "cc"
  | "cognitive"
  | "loc"
  | "mi"
  | "nargs"
  | "halstead_difficulty"
  | "halstead_effort"
  | "halstead_bugs";

/** メトリクス表示設定 */
export interface MetricDisplayConfig {
  type: MetricType;
  label: string;
  description: string;
  warningThreshold?: number;
  dangerThreshold?: number;
  lowerIsBetter?: boolean;
}

/** メトリクス表示設定のデフォルト値 */
export const METRIC_CONFIGS: Record<MetricType, MetricDisplayConfig> = {
  cc: {
    type: "cc",
    label: "循環的複雑度",
    description: "分岐パスの数。高いほどテストが困難",
    warningThreshold: 10,
    dangerThreshold: 20,
    lowerIsBetter: true,
  },
  cognitive: {
    type: "cognitive",
    label: "認知的複雑度",
    description: "コードの理解しやすさ。高いほど読みづらい",
    warningThreshold: 15,
    dangerThreshold: 25,
    lowerIsBetter: true,
  },
  loc: {
    type: "loc",
    label: "行数",
    description: "コードの物理的なサイズ",
    lowerIsBetter: true,
  },
  mi: {
    type: "mi",
    label: "保守性指標",
    description: "保守のしやすさ。低いほど保守困難",
    warningThreshold: 40,
    dangerThreshold: 20,
    lowerIsBetter: false,
  },
  nargs: {
    type: "nargs",
    label: "引数の数",
    description: "関数の引数の数。多すぎると使いづらい",
    warningThreshold: 5,
    dangerThreshold: 8,
    lowerIsBetter: true,
  },
  halstead_difficulty: {
    type: "halstead_difficulty",
    label: "Halstead難易度",
    description: "プログラムの理解・修正の難しさ",
    lowerIsBetter: true,
  },
  halstead_effort: {
    type: "halstead_effort",
    label: "Halstead労力",
    description: "プログラムを理解するのに必要な労力",
    lowerIsBetter: true,
  },
  halstead_bugs: {
    type: "halstead_bugs",
    label: "推定バグ数",
    description: "Halsteadメトリクスによる推定バグ数",
    lowerIsBetter: true,
  },
};
