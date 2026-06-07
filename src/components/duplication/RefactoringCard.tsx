/**
 * RefactoringCard.tsx
 *
 * リファクタリング提案カード
 */

import type { RefactoringSuggestion, RefactoringStrategy } from "../../types/duplication";

interface RefactoringCardProps {
  suggestion: RefactoringSuggestion;
}

const strategyLabels: Record<RefactoringStrategy, string> = {
  extract_function: "関数抽出",
  extract_trait: "トレイト抽出",
  use_macro: "マクロ化",
  parameterize: "パラメータ化",
};

const strategyColors: Record<RefactoringStrategy, string> = {
  extract_function: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  extract_trait: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  use_macro: "bg-green-500/20 text-green-300 border-green-500/30",
  parameterize: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
};

export function RefactoringCard({ suggestion }: RefactoringCardProps) {
  return (
    <div className="bg-stone-800 border border-stone-700 rounded-lg p-4 space-y-3">
      {/* タイトルと戦略バッジ */}
      <div className="flex items-start justify-between gap-2">
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded border shrink-0 ${strategyColors[suggestion.strategy]}`}
        >
          {strategyLabels[suggestion.strategy]}
        </span>
      </div>

      <p className="text-sm text-stone-300">{suggestion.description}</p>
    </div>
  );
}
