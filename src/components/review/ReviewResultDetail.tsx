/**
 * ReviewResultDetail.tsx
 *
 * レビュー結果詳細表示
 */

import { useMemo, useState, useCallback } from "react";
import type { ReviewFileResult, ReviewAgent, FixPlan } from "../../types/review";
import { FixPlanCard } from "./FixPlanCard";

const priorityOrder: Record<FixPlan["priority"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

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

const typeDesignScoreInfo: Record<string, { label: string; description: string }> = {
  encapsulation: { label: "Encapsulation", description: "内部実装の隠蔽度" },
  invariant: { label: "Invariant", description: "不変条件の表現" },
  usefulness: { label: "Usefulness", description: "型の有用性" },
  enforcement: { label: "Enforcement", description: "コンパイル時の強制力" },
};

export function ReviewResultDetail({ result }: ReviewResultDetailProps) {
  const agents = result.agents;
  const [copied, setCopied] = useState(false);

  // 優先度順にソート（HIGH → MEDIUM → LOW）
  const sortedFixPlans = useMemo(() => {
    return [...result.fix_plans].sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );
  }, [result.fix_plans]);

  // デフォルトで全てチェック（親コンポーネントでkeyを指定してリセット）
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    () => new Set(sortedFixPlans.map((_, i) => i))
  );

  // チェックボックスのトグル
  const handleToggle = useCallback((index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  // 選択された修正計画
  const selectedPlans = useMemo(() => {
    return sortedFixPlans.filter((_, index) => selectedIndices.has(index));
  }, [sortedFixPlans, selectedIndices]);

  // 統合プロンプトを生成
  const combinedPrompt = useMemo(() => {
    if (selectedPlans.length === 0) return "";

    const parts = selectedPlans.map((plan, idx) => {
      return `## ${idx + 1}. ${plan.title}

### 概要
${plan.description}

### 修正方法
${plan.prompt}`;
    });

    return `# 修正計画
対象ファイル: ${result.path}

${parts.join("\n\n---\n\n")}`;
  }, [selectedPlans, result.path]);

  // コピー処理
  const handleCopy = useCallback(async () => {
    if (!combinedPrompt) return;
    try {
      await navigator.clipboard.writeText(combinedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [combinedPrompt]);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      {/* ヘッダー */}
      <div>
        <h2 className="text-lg font-semibold text-stone-100 font-mono">
          {result.path}
        </h2>
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
              ([key, value]) => {
                const info = typeDesignScoreInfo[key];
                return (
                  <div
                    key={key}
                    className="bg-stone-800 rounded p-2 text-sm flex items-center justify-between"
                  >
                    <div className="flex flex-col">
                      <span className="text-stone-300 capitalize">
                        {info?.label ?? key}
                      </span>
                      {info?.description && (
                        <span className="text-xs text-stone-500">
                          {info.description}
                        </span>
                      )}
                    </div>
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
                );
              }
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
          修正計画 ({sortedFixPlans.length})
        </h3>
        {sortedFixPlans.length === 0 ? (
          <div className="bg-green-900/20 border border-green-700 rounded p-4 text-center">
            <p className="text-green-400">
              修正が必要な問題は検出されませんでした
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedFixPlans.map((fixPlan, index) => (
              <FixPlanCard
                key={index}
                fixPlan={fixPlan}
                checked={selectedIndices.has(index)}
                onToggle={() => handleToggle(index)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 修正プロンプト */}
      {sortedFixPlans.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-stone-300">
              修正プロンプト ({selectedPlans.length}件選択中)
            </h3>
            <button
              onClick={handleCopy}
              disabled={selectedPlans.length === 0}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                copied
                  ? "bg-green-600 text-white"
                  : selectedPlans.length === 0
                    ? "bg-stone-700 text-stone-500 cursor-not-allowed"
                    : "bg-orange-600 text-white hover:bg-orange-500"
              }`}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          {selectedPlans.length === 0 ? (
            <div className="bg-stone-800 border border-stone-700 rounded p-4 text-center">
              <p className="text-stone-500 text-sm">
                修正計画を選択してください
              </p>
            </div>
          ) : (
            <div className="bg-stone-900 rounded p-4 max-h-96 overflow-y-auto">
              <pre className="text-sm text-stone-200 whitespace-pre-wrap font-mono">
                {combinedPrompt}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
