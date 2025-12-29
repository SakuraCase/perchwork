/**
 * ImpactAnalysisPanel コンポーネント
 *
 * 影響分析パネルのメインコンポーネント。
 * サマリー、直接影響、間接影響（レベル別）、影響テストを統合表示する。
 */

import type { ItemId, CodeItem } from '@/types/schema';
import type { CallersIndex } from '@/types/callers';
import { useImpactAnalysis } from '@/hooks/useImpactAnalysis';
import { ImpactSummary } from './ImpactSummary';
import { ImpactLevelSection } from './ImpactLevelSection';
import { AffectedTestList } from './AffectedTestList';

interface ImpactAnalysisPanelProps {
  /** 対象アイテムのID */
  targetId: ItemId | null;
  /** 対象アイテムの名前 */
  targetName: string;
  /** Callersインデックス */
  callersIndex: CallersIndex | null;
  /** コードアイテムのマップ */
  codeItems: Map<ItemId, CodeItem> | null;
  /** アイテム選択時のコールバック */
  onSelectItem: (id: ItemId) => void;
  /** グラフ表示ボタンのコールバック（オプション） */
  onShowGraph?: () => void;
}

/**
 * ImpactAnalysisPanelコンポーネント
 *
 * 影響分析の実行、結果表示、グラフビューへの遷移を提供する統合パネル。
 * useImpactAnalysis フックを使用して分析を実行する。
 */
export function ImpactAnalysisPanel({
  targetId,
  targetName,
  callersIndex,
  codeItems,
  onSelectItem,
  onShowGraph,
}: ImpactAnalysisPanelProps) {
  const { result, isAnalyzing, error, analyze, clear } = useImpactAnalysis(
    targetId,
    callersIndex,
    codeItems
  );

  // 分析実行ハンドラ
  const handleAnalyze = () => {
    if (targetId) {
      analyze(targetId);
    }
  };

  // ヘッダー部分
  const renderHeader = () => (
    <div className="border-b border-gray-700 pb-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-100">
          影響分析: <span className="text-blue-400">{targetName}</span>
        </h2>
        <button
          type="button"
          onClick={clear}
          className="px-3 py-1 text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          クリア
        </button>
      </div>

      {/* 分析実行ボタン */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={!targetId || isAnalyzing}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded transition-colors"
        >
          {isAnalyzing ? '分析中...' : '影響分析を実行'}
        </button>

        {onShowGraph && result && (
          <button
            type="button"
            onClick={onShowGraph}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded transition-colors"
          >
            グラフで表示
          </button>
        )}
      </div>
    </div>
  );

  // エラー表示
  const renderError = () => (
    <div className="p-4 bg-red-600/10 border border-red-600/30 rounded">
      <div className="flex items-center gap-2">
        <svg
          className="w-5 h-5 text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-sm text-red-400">{error}</span>
      </div>
    </div>
  );

  // 初期状態（分析未実行）
  const renderEmptyState = () => (
    <div className="p-8 text-center">
      <svg
        className="w-16 h-16 mx-auto mb-4 text-gray-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
      <p className="text-gray-500 text-sm">
        「影響分析を実行」ボタンを押して分析を開始します
      </p>
    </div>
  );

  // 分析結果の表示
  const renderResult = () => {
    if (!result) return null;

    // 間接影響をレベル別にソート
    const sortedIndirectLevels = Array.from(result.indirectImpact.keys()).sort(
      (a, b) => a - b
    );

    return (
      <div className="space-y-6">
        {/* サマリー */}
        <ImpactSummary
          totalAffected={result.totalAffected}
          maxDepth={result.maxDepth}
          hasCycle={result.hasCycle}
          cycleNodes={result.cycleNodes}
        />

        {/* 直接影響 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-2">直接影響</h3>
          <ImpactLevelSection
            title="直接 Callers"
            callers={result.directImpact}
            onSelectItem={onSelectItem}
            defaultExpanded={true}
          />
        </div>

        {/* 間接影響（レベル別） */}
        {sortedIndirectLevels.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-2">
              間接影響（レベル別）
            </h3>
            <div className="space-y-2">
              {sortedIndirectLevels.map((level) => {
                const callers = result.indirectImpact.get(level) || [];
                return (
                  <ImpactLevelSection
                    key={level}
                    title={`レベル ${level}`}
                    callers={callers}
                    onSelectItem={onSelectItem}
                    defaultExpanded={level === 1}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* 影響を受けるテスト */}
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-2">
            影響を受けるテスト
          </h3>
          <AffectedTestList
            directTests={result.directTests}
            indirectTests={result.indirectTests}
            onSelectTest={onSelectItem}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="p-4">
      {renderHeader()}

      {error && renderError()}

      {!error && !result && !isAnalyzing && renderEmptyState()}

      {isAnalyzing && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <span className="ml-3 text-gray-400">分析中...</span>
        </div>
      )}

      {!isAnalyzing && result && renderResult()}
    </div>
  );
}
