/**
 * Perchwork Complexity - rust-code-analysis 出力変換
 */

import type {
  RcaOutput,
  RcaSpaceMetrics,
  FileMetrics,
  FunctionMetrics,
  LocMetrics,
} from './types.js';

/**
 * rust-code-analysis の出力を FileMetrics に変換
 */
export function transformRcaOutput(
  rcaOutput: RcaOutput,
  filePath: string,
  relativePath: string,
  language: string
): FileMetrics {
  const functions: FunctionMetrics[] = [];

  // ルートのスペースからファイル全体のメトリクスを取得
  const rootSpace = rcaOutput.spaces?.[0];
  const rootMetrics = rootSpace?.metrics;

  // 関数/メソッドを再帰的に収集
  if (rootSpace?.spaces) {
    collectFunctions(rootSpace.spaces, functions, filePath);
  }

  // ファイル全体のLOC
  const fileLoc: LocMetrics = {
    total: rootMetrics?.loc?.sloc ?? 0,
    code: rootMetrics?.loc?.ploc ?? 0,
    comment: rootMetrics?.loc?.cloc ?? 0,
    blank: rootMetrics?.loc?.blank ?? 0,
  };

  // CC/Cognitive の集計
  const ccSum = functions.reduce((sum, f) => sum + f.cc, 0);
  const cognitiveSum = functions.reduce((sum, f) => sum + f.cognitive, 0);
  const funcCount = functions.length || 1;

  // MI (Maintainability Index) - rootから取得
  const mi = rootMetrics?.mi?.mi_visual_studio ?? rootMetrics?.mi?.mi_original;

  return {
    path: filePath,
    relative_path: relativePath,
    language,
    loc: fileLoc,
    cc_sum: ccSum,
    cc_avg: ccSum / funcCount,
    cognitive_sum: cognitiveSum,
    cognitive_avg: cognitiveSum / funcCount,
    mi,
    functions,
  };
}

/**
 * 関数/メソッドを再帰的に収集
 */
function collectFunctions(
  spaces: RcaSpaceMetrics[],
  result: FunctionMetrics[],
  filePath: string
): void {
  for (const space of spaces) {
    const kind = space.kind?.toLowerCase() ?? '';

    // 関数/メソッド/クロージャを抽出
    if (kind === 'function' || kind === 'method' || kind === 'impl' || kind === 'closure') {
      const metrics = space.metrics;
      const id = `${filePath}:${space.start_line ?? 0}:${space.name ?? 'anonymous'}`;

      const funcMetrics: FunctionMetrics = {
        id,
        name: space.name ?? 'anonymous',
        kind: kind as FunctionMetrics['kind'],
        line_start: space.start_line ?? 0,
        line_end: space.end_line ?? 0,
        cc: metrics?.cyclomatic?.sum ?? 0,
        cognitive: metrics?.cognitive?.sum ?? 0,
        nargs: metrics?.nargs?.total ?? 0,
        nexits: metrics?.nexits?.sum ?? 0,
        loc: {
          total: metrics?.loc?.sloc ?? 0,
          code: metrics?.loc?.ploc ?? 0,
          comment: metrics?.loc?.cloc ?? 0,
          blank: metrics?.loc?.blank ?? 0,
        },
      };

      // Halstead メトリクスがあれば追加
      if (metrics?.halstead) {
        const h = metrics.halstead;
        funcMetrics.halstead = {
          n1: h.n1 ?? 0,
          n2: h.n2 ?? 0,
          N1: h.N1 ?? 0,
          N2: h.N2 ?? 0,
          length: h.length ?? 0,
          vocabulary: h.vocabulary ?? 0,
          volume: h.volume ?? 0,
          difficulty: h.difficulty ?? 0,
          effort: h.effort ?? 0,
          bugs: h.bugs ?? 0,
          time: h.time ?? 0,
        };
      }

      result.push(funcMetrics);
    }

    // 子スペースを再帰的に処理
    if (space.spaces && space.spaces.length > 0) {
      collectFunctions(space.spaces, result, filePath);
    }
  }
}

/**
 * 複数ファイルの統計を計算
 */
export function calculateStats(files: FileMetrics[]): {
  total_files: number;
  total_functions: number;
  total_loc: number;
  avg_cc: number;
  avg_cognitive: number;
  max_cc: number;
  max_cognitive: number;
  warnings: {
    high_cc: number;
    high_cognitive: number;
    low_mi: number;
  };
} {
  let totalFunctions = 0;
  let totalLoc = 0;
  let totalCc = 0;
  let totalCognitive = 0;
  let maxCc = 0;
  let maxCognitive = 0;
  let highCcCount = 0;
  let highCognitiveCount = 0;
  let lowMiCount = 0;

  for (const file of files) {
    totalLoc += file.loc.total;

    // MI チェック
    if (file.mi !== undefined && file.mi < 20) {
      lowMiCount++;
    }

    for (const func of file.functions) {
      totalFunctions++;
      totalCc += func.cc;
      totalCognitive += func.cognitive;

      if (func.cc > maxCc) maxCc = func.cc;
      if (func.cognitive > maxCognitive) maxCognitive = func.cognitive;

      if (func.cc > 10) highCcCount++;
      if (func.cognitive > 15) highCognitiveCount++;
    }
  }

  const funcCount = totalFunctions || 1;

  return {
    total_files: files.length,
    total_functions: totalFunctions,
    total_loc: totalLoc,
    avg_cc: totalCc / funcCount,
    avg_cognitive: totalCognitive / funcCount,
    max_cc: maxCc,
    max_cognitive: maxCognitive,
    warnings: {
      high_cc: highCcCount,
      high_cognitive: highCognitiveCount,
      low_mi: lowMiCount,
    },
  };
}
