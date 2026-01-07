/**
 * ReviewOverview.tsx
 *
 * レビュー概要サマリー
 */

import type { ReviewIndex } from "../../types/review";

interface ReviewOverviewProps {
  index: ReviewIndex;
  onFileSelect?: (filePath: string) => void;
}

export function ReviewOverview({ index, onFileSelect }: ReviewOverviewProps) {
  const { summary, files } = index;

  // HIGH優先度があるファイルを抽出
  const highPriorityFiles = files.filter((f) => f.by_priority.high > 0);

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold text-stone-100">レビュー概要</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-stone-800 rounded p-4">
          <p className="text-sm text-stone-400">解析ファイル数</p>
          <p className="text-2xl font-bold text-stone-100">
            {summary.total_files}
          </p>
        </div>
        <div className="bg-stone-800 rounded p-4">
          <p className="text-sm text-stone-400">修正計画数</p>
          <p className="text-2xl font-bold text-stone-100">
            {summary.total_fix_plans}
          </p>
        </div>
      </div>

      <div className="bg-stone-800 rounded p-4">
        <p className="text-sm text-stone-400 mb-3">優先度別</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full" />
              <span className="text-sm text-stone-300">High</span>
            </div>
            <span className="text-lg font-bold text-red-400">
              {summary.by_priority.high}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-yellow-500 rounded-full" />
              <span className="text-sm text-stone-300">Medium</span>
            </div>
            <span className="text-lg font-bold text-yellow-400">
              {summary.by_priority.medium}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-orange-500 rounded-full" />
              <span className="text-sm text-stone-300">Low</span>
            </div>
            <span className="text-lg font-bold text-orange-400">
              {summary.by_priority.low}
            </span>
          </div>
        </div>
      </div>

      {/* 品質スコアセクション */}
      {(summary.average_code_score !== undefined ||
        summary.average_coverage_score !== undefined) && (
        <div className="bg-stone-800 rounded p-4">
          <p className="text-sm text-stone-400 mb-3">品質スコア</p>
          <div className="space-y-3">
            {summary.average_code_score !== undefined && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-stone-300">コード品質</span>
                  <span className="text-stone-100 font-medium">
                    {summary.average_code_score.toFixed(1)}/100
                  </span>
                </div>
                <div className="w-full bg-stone-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${summary.average_code_score}%` }}
                  />
                </div>
              </div>
            )}
            {summary.average_coverage_score !== undefined && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-stone-300">テストカバレッジ</span>
                  <span className="text-stone-100 font-medium">
                    {summary.average_coverage_score.toFixed(1)}/10
                  </span>
                </div>
                <div className="w-full bg-stone-700 rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full"
                    style={{ width: `${summary.average_coverage_score * 10}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 高優先度の問題セクション */}
      {highPriorityFiles.length > 0 && (
        <div className="bg-red-900/20 border border-red-500/30 rounded p-4">
          <p className="text-sm text-red-400 mb-3 flex items-center gap-2">
            <span>⚠️</span>
            <span>高優先度の問題</span>
          </p>
          <div className="space-y-2">
            {highPriorityFiles.map((file) => (
              <button
                key={file.path}
                onClick={() => onFileSelect?.(file.path)}
                className="w-full text-left bg-stone-800/50 hover:bg-stone-800 rounded p-3 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-stone-200 text-sm truncate" title={file.path}>
                    {file.path}
                  </span>
                  <span className="text-red-400 text-sm font-medium ml-2 whitespace-nowrap">
                    {file.by_priority.high}件
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
