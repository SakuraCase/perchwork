/**
 * ReviewResultDetail.tsx
 *
 * レビュー結果詳細表示
 */

import type { ReviewFileResult, ReviewAgent } from "../../types/review";
import { FixPlanCard } from "./FixPlanCard";

interface ReviewResultDetailProps {
  result: ReviewFileResult;
}

const agentLabels: Record<ReviewAgent, string> = {
  "comment-analyzer": "コメント解析",
  "pr-test-analyzer": "テスト解析",
  "silent-failure-hunter": "サイレントエラー検出",
  "type-design-analyzer": "型設計解析",
  "code-reviewer": "コードレビュー",
  "code-simplifier": "簡素化提案",
};

export function ReviewResultDetail({ result }: ReviewResultDetailProps) {
  const agents = result.agents;

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      {/* ヘッダー */}
      <div>
        <h2 className="text-lg font-semibold text-stone-100 font-mono">
          {result.path}
        </h2>
        <p className="text-xs text-stone-500 mt-1">
          生成日時: {new Date(result.generated_at).toLocaleString("ja-JP")}
        </p>
      </div>

      {/* エージェント結果サマリー */}
      <div>
        <h3 className="text-sm font-semibold text-stone-300 mb-3">
          エージェント結果
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(agents) as ReviewAgent[]).map((agentKey) => {
            const agentResult = agents[agentKey];
            if (!agentResult) return null;

            const statusColor =
              agentResult.status === "success"
                ? "text-green-400"
                : agentResult.status === "error"
                  ? "text-red-400"
                  : "text-stone-400";

            return (
              <div
                key={agentKey}
                className="bg-stone-800 rounded p-2 text-sm flex items-center justify-between"
              >
                <span className="text-stone-300">{agentLabels[agentKey]}</span>
                <span className={statusColor}>
                  {agentResult.status === "success"
                    ? "✓"
                    : agentResult.status === "error"
                      ? "✗"
                      : "-"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 詳細スコア（type-design-analyzer がある場合） */}
      {agents["type-design-analyzer"]?.status === "success" && (
        <div>
          <h3 className="text-sm font-semibold text-stone-300 mb-3">
            型設計スコア
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(agents["type-design-analyzer"].scores).map(
              ([key, value]) => (
                <div
                  key={key}
                  className="bg-stone-800 rounded p-2 text-sm flex items-center justify-between"
                >
                  <span className="text-stone-400 capitalize">{key}</span>
                  <span
                    className={`font-bold ${
                      value >= 8
                        ? "text-green-400"
                        : value >= 5
                          ? "text-yellow-400"
                          : "text-red-400"
                    }`}
                  >
                    {value}/10
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* code-reviewer スコア */}
      {agents["code-reviewer"]?.status === "success" && (
        <div>
          <h3 className="text-sm font-semibold text-stone-300 mb-3">
            コードレビュースコア
          </h3>
          <div className="bg-stone-800 rounded p-3 flex items-center gap-4">
            <span
              className={`text-3xl font-bold ${
                agents["code-reviewer"].score >= 80
                  ? "text-green-400"
                  : agents["code-reviewer"].score >= 60
                    ? "text-yellow-400"
                    : "text-red-400"
              }`}
            >
              {agents["code-reviewer"].score}
            </span>
            <span className="text-stone-400">/ 100</span>
          </div>
        </div>
      )}

      {/* 修正計画 */}
      <div>
        <h3 className="text-sm font-semibold text-stone-300 mb-3">
          修正計画 ({result.fix_plans.length})
        </h3>
        {result.fix_plans.length === 0 ? (
          <div className="bg-green-900/20 border border-green-700 rounded p-4 text-center">
            <p className="text-green-400">
              修正が必要な問題は検出されませんでした
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {result.fix_plans.map((fixPlan, index) => (
              <FixPlanCard key={index} fixPlan={fixPlan} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
