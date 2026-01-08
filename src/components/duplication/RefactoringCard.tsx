/**
 * RefactoringCard.tsx
 *
 * リファクタリング提案カード
 */

import type { RefactoringSuggestion, RefactoringStrategy } from "../../types/duplication";

interface RefactoringCardProps {
  suggestion: RefactoringSuggestion;
}

type StrategyType = RefactoringStrategy | "no_refactoring";

const strategyLabels: Record<StrategyType, string> = {
  extract_function: "関数抽出",
  extract_trait: "トレイト抽出",
  use_macro: "マクロ化",
  parameterize: "パラメータ化",
  no_refactoring: "対応不要",
};

const strategyColors: Record<StrategyType, string> = {
  extract_function: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  extract_trait: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  use_macro: "bg-green-500/20 text-green-300 border-green-500/30",
  parameterize: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  no_refactoring: "bg-stone-500/20 text-stone-300 border-stone-500/30",
};

export function RefactoringCard({ suggestion }: RefactoringCardProps) {
  return (
    <div className="bg-stone-800 border border-stone-700 rounded-lg p-4 space-y-3">
      {/* タイトルと戦略バッジ */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-stone-100 font-medium">{suggestion.title}</h4>
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded border shrink-0 ${strategyColors[suggestion.strategy]}`}
        >
          {strategyLabels[suggestion.strategy]}
        </span>
      </div>

      {/* 概要 */}
      {suggestion.summary && (
        <div>
          <p className="text-xs text-stone-500 mb-1">概要</p>
          <p className="text-sm text-stone-300">{suggestion.summary}</p>
        </div>
      )}

      {/* 対象 */}
      {suggestion.targets && (
        <div>
          <p className="text-xs text-stone-500 mb-1">対象</p>
          <p className="text-sm text-stone-400 whitespace-pre-wrap">{suggestion.targets}</p>
        </div>
      )}

      {/* 修正内容 */}
      {suggestion.changes && (
        <div>
          <p className="text-xs text-stone-500 mb-1">修正内容</p>
          <p className="text-sm text-stone-400 whitespace-pre-wrap">{suggestion.changes}</p>
        </div>
      )}

      {/* プロンプト */}
      {suggestion.prompt && (
        <div>
          <p className="text-xs text-stone-500 mb-1">実行プロンプト</p>
          <div className="bg-stone-900 rounded p-3 max-h-32 overflow-y-auto">
            <pre className="text-xs text-stone-400 whitespace-pre-wrap font-mono">
              {suggestion.prompt}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
