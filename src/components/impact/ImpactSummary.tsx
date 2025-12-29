/**
 * ImpactSummary コンポーネント
 *
 * 影響分析のサマリー情報を表示するコンポーネント。
 * 総影響数、最大深度、循環参照の有無を表示する。
 */

import type { ItemId } from '@/types/schema';

interface ImpactSummaryProps {
  /** 総影響数（直接+間接） */
  totalAffected: number;
  /** 最大深度 */
  maxDepth: number;
  /** 循環参照の有無 */
  hasCycle: boolean;
  /** 循環参照に含まれるノードのID */
  cycleNodes?: ItemId[];
}

/**
 * ImpactSummaryコンポーネント
 *
 * 影響分析の概要を視覚的に表示。
 * 循環参照がある場合は警告マーカーを表示する。
 */
export function ImpactSummary({
  totalAffected,
  maxDepth,
  hasCycle,
  cycleNodes,
}: ImpactSummaryProps) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded p-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">サマリー</h3>

      <div className="space-y-2">
        {/* 総影響数 */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">総影響関数数:</span>
          <span className="text-lg font-bold text-blue-400">{totalAffected}</span>
        </div>

        {/* 最大深度 */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">最大深度:</span>
          <span className="text-lg font-bold text-purple-400">{maxDepth}</span>
        </div>

        {/* 循環参照 */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">循環参照:</span>
          {hasCycle ? (
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-yellow-400">検出</span>
              <svg
                className="w-5 h-5 text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          ) : (
            <span className="text-lg font-bold text-green-400">なし</span>
          )}
        </div>

        {/* 循環参照ノード一覧（存在する場合のみ） */}
        {hasCycle && cycleNodes && cycleNodes.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <p className="text-xs text-yellow-400 mb-2">
              循環参照ノード ({cycleNodes.length}):
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {cycleNodes.map((nodeId) => (
                <div
                  key={nodeId}
                  className="px-2 py-1 bg-yellow-600/10 border border-yellow-600/30 rounded text-xs font-mono text-yellow-400"
                >
                  {nodeId}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
