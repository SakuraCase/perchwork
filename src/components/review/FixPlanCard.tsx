/**
 * FixPlanCard.tsx
 *
 * 修正計画カード（チェックボックス付き）
 */

import type { FixPlan, ReviewAgent } from "../../types/review";

interface FixPlanCardProps {
  fixPlan: FixPlan;
  checked: boolean;
  onToggle: () => void;
}

const priorityStyles: Record<string, string> = {
  high: "border-red-500 bg-red-500/10",
  medium: "border-yellow-500 bg-yellow-500/10",
  low: "border-orange-500 bg-orange-500/10",
};

const priorityLabels: Record<string, string> = {
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
};

const agentLabels: Record<ReviewAgent, string> = {
  "comment-analyzer": "コメント解析",
  "pr-test-analyzer": "テスト解析",
  "silent-failure-hunter": "サイレントエラー",
  "type-design-analyzer": "型設計",
  "code-reviewer": "コードレビュー",
  "code-simplifier": "簡素化",
};

export function FixPlanCard({ fixPlan, checked, onToggle }: FixPlanCardProps) {
  return (
    <div
      className={`border-l-4 rounded-r p-4 ${priorityStyles[fixPlan.priority]} ${
        checked ? "ring-1 ring-orange-500/50" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        {/* チェックボックス */}
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-1 w-4 h-4 rounded border-stone-600 bg-stone-700 text-orange-500 focus:ring-orange-500 focus:ring-offset-stone-900 cursor-pointer"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded ${
                  fixPlan.priority === "high"
                    ? "bg-red-500 text-white"
                    : fixPlan.priority === "medium"
                      ? "bg-yellow-500 text-black"
                      : "bg-orange-500 text-white"
                }`}
              >
                {priorityLabels[fixPlan.priority]}
              </span>
              <h4 className="font-medium text-stone-100">{fixPlan.title}</h4>
            </div>
            {fixPlan.agent && (
              <span className="text-xs text-stone-400 bg-stone-700 px-2 py-0.5 rounded ml-2 whitespace-nowrap">
                {agentLabels[fixPlan.agent]}
              </span>
            )}
          </div>

          <p className="text-sm text-stone-300">{fixPlan.description}</p>
        </div>
      </div>
    </div>
  );
}
