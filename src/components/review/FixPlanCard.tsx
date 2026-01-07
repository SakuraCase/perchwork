/**
 * FixPlanCard.tsx
 *
 * 修正計画カード（コピーボタン付き）
 */

import { useState, useCallback } from "react";
import type { FixPlan, ReviewAgent } from "../../types/review";

interface FixPlanCardProps {
  fixPlan: FixPlan;
  filePath?: string;
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

export function FixPlanCard({ fixPlan, filePath }: FixPlanCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fixPlan.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [fixPlan.prompt]);

  return (
    <div
      className={`border-l-4 rounded-r p-4 ${priorityStyles[fixPlan.priority]}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
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
          <span className="text-xs text-stone-400 bg-stone-700 px-2 py-0.5 rounded">
            {agentLabels[fixPlan.agent]}
          </span>
        )}
      </div>

      {filePath && (
        <p className="text-xs text-stone-500 mb-2 font-mono">{filePath}</p>
      )}

      <p className="text-sm text-stone-300 mb-3">{fixPlan.description}</p>

      <div className="bg-stone-900 rounded p-3 relative">
        <p className="text-xs text-stone-400 mb-1">Prompt:</p>
        <pre className="text-sm text-stone-200 whitespace-pre-wrap font-mono">
          {fixPlan.prompt}
        </pre>
        <button
          onClick={handleCopy}
          className={`absolute top-2 right-2 px-2 py-1 text-xs rounded transition-colors ${
            copied
              ? "bg-green-600 text-white"
              : "bg-stone-700 text-stone-300 hover:bg-stone-600"
          }`}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
