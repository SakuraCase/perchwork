/**
 * Perchwork Complexity - 型定義
 */

/** 設定ファイルの型 */
export interface Config {
  target_dir: string;
  include?: string[];
  exclude?: string[];
}

/** LOC メトリクス */
export interface LocMetrics {
  total: number;
  code: number;
  comment: number;
  blank: number;
}

/** Halstead メトリクス */
export interface HalsteadMetrics {
  n1: number;       // 総オペレータ数
  n2: number;       // 総オペランド数
  N1: number;       // ユニークオペレータ数
  N2: number;       // ユニークオペランド数
  length: number;   // プログラム長
  vocabulary: number; // ボキャブラリ
  volume: number;   // ボリューム
  difficulty: number; // 難易度
  effort: number;   // 労力
  bugs: number;     // 推定バグ数
  time: number;     // 推定実装時間
}

/** 関数/メソッドのメトリクス */
export interface FunctionMetrics {
  id: string;
  name: string;
  kind: 'function' | 'method' | 'impl' | 'closure';
  line_start: number;
  line_end: number;
  cc: number;              // Cyclomatic Complexity
  cognitive: number;       // Cognitive Complexity
  nargs: number;           // 引数の数
  nexits: number;          // 出口の数
  loc: LocMetrics;
  halstead?: HalsteadMetrics;
}

/** ファイルのメトリクス */
export interface FileMetrics {
  path: string;
  relative_path: string;
  language: string;
  loc: LocMetrics;
  cc_sum: number;          // ファイル全体のCC合計
  cc_avg: number;          // 平均CC
  cognitive_sum: number;   // ファイル全体のCognitive合計
  cognitive_avg: number;   // 平均Cognitive
  mi?: number;             // Maintainability Index
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
    high_cc: number;       // CC > 10 の関数数
    high_cognitive: number; // Cognitive > 15 の関数数
    low_mi: number;        // MI < 20 のファイル数
  };
}

/** インデックスファイルの型 */
export interface ComplexityIndex {
  version: string;
  generated_at: string;
  target_dir: string;
  language: string;
  stats: ComplexityStats;
  files: Array<{
    path: string;
    relative_path: string;
    cc_avg: number;
    cognitive_avg: number;
    function_count: number;
    loc: number;
    mi?: number;  // Maintainability Index
  }>;
}

/** rust-code-analysis の生出力 */
export interface RcaSpaceMetrics {
  kind?: string;
  name?: string;
  start_line?: number;
  end_line?: number;
  metrics?: {
    cyclomatic?: { sum: number; average: number };
    cognitive?: { sum: number; average: number };
    nargs?: { total: number; average: number };
    nexits?: { sum: number; average: number };
    loc?: {
      sloc: number;
      ploc: number;
      cloc: number;
      blank: number;
    };
    halstead?: {
      n1?: number;
      n2?: number;
      N1?: number;
      N2?: number;
      length?: number;
      vocabulary?: number;
      volume?: number;
      difficulty?: number;
      effort?: number;
      bugs?: number;
      time?: number;
    };
    mi?: {
      mi_original?: number;
      mi_sei?: number;
      mi_visual_studio?: number;
    };
  };
  spaces?: RcaSpaceMetrics[];
}

export interface RcaOutput {
  name: string;
  spaces?: RcaSpaceMetrics[];
}
