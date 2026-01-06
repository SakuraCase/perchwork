/**
 * ReviewOverview.tsx
 *
 * レビュー概要サマリー
 */

import type { ReviewIndex } from "../../types/review";

interface ReviewOverviewProps {
  index: ReviewIndex;
}

export function ReviewOverview({ index }: ReviewOverviewProps) {
  const { summary } = index;

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold text-gray-100">レビュー概要</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded p-4">
          <p className="text-sm text-gray-400">解析ファイル数</p>
          <p className="text-2xl font-bold text-gray-100">
            {summary.total_files}
          </p>
        </div>
        <div className="bg-gray-800 rounded p-4">
          <p className="text-sm text-gray-400">修正計画数</p>
          <p className="text-2xl font-bold text-gray-100">
            {summary.total_fix_plans}
          </p>
        </div>
      </div>

      <div className="bg-gray-800 rounded p-4">
        <p className="text-sm text-gray-400 mb-3">優先度別</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full" />
              <span className="text-sm text-gray-300">High</span>
            </div>
            <span className="text-lg font-bold text-red-400">
              {summary.by_priority.high}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-yellow-500 rounded-full" />
              <span className="text-sm text-gray-300">Medium</span>
            </div>
            <span className="text-lg font-bold text-yellow-400">
              {summary.by_priority.medium}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-500 rounded-full" />
              <span className="text-sm text-gray-300">Low</span>
            </div>
            <span className="text-lg font-bold text-blue-400">
              {summary.by_priority.low}
            </span>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500">
        <p>生成日時: {new Date(index.generated_at).toLocaleString("ja-JP")}</p>
        <p>モード: {index.config.mode}</p>
      </div>
    </div>
  );
}
