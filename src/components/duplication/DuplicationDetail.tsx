/**
 * DuplicationDetail.tsx
 *
 * 重複グループの詳細表示
 */

import { useState, useCallback } from "react";
import type { DuplicationGroup } from "../../types/duplication";
import { RefactoringCard } from "./RefactoringCard";

interface DuplicationDetailProps {
  group: DuplicationGroup;
  onShowInTree?: (filePath: string) => void;
}

/** severityに応じた色を返す */
function getSeverityColor(severity: string | undefined): string {
  switch (severity) {
    case 'high':
      return 'bg-red-600/20 text-red-300 border-red-500/30';
    case 'medium':
      return 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30';
    case 'low':
      return 'bg-blue-600/20 text-blue-300 border-blue-500/30';
    case 'none':
      return 'bg-stone-600/20 text-stone-300 border-stone-500/30';
    default:
      return 'bg-stone-700 text-stone-300 border-stone-600';
  }
}

/** severityの日本語ラベル */
function getSeverityLabel(severity: string | undefined): string {
  switch (severity) {
    case 'high':
      return '高';
    case 'medium':
      return '中';
    case 'low':
      return '低';
    case 'none':
      return 'なし';
    default:
      return '未解析';
  }
}

export function DuplicationDetail({ group, onShowInTree }: DuplicationDetailProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!group.refactoring_suggestion?.prompt) return;
    try {
      await navigator.clipboard.writeText(group.refactoring_suggestion.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [group.refactoring_suggestion]);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-stone-100 font-mono">
          {group.id}
        </h2>
        <div className="flex items-center gap-2">
          {/* severity バッジ */}
          <span className={`px-2 py-1 text-sm rounded border ${getSeverityColor(group.severity)}`}>
            {getSeverityLabel(group.severity)}
          </span>
          {/* needs_fix バッジ */}
          {group.needs_fix && (
            <span className="px-2 py-1 text-sm bg-red-600 text-white rounded">
              要修正
            </span>
          )}
          {/* 箇所数 */}
          <span className="px-2 py-1 text-sm bg-orange-600 text-white rounded">
            {group.locations.length}箇所
          </span>
          <span className="px-2 py-1 text-sm bg-orange-600/20 text-orange-300 rounded">
            {group.lines}行
          </span>
          <span className="px-2 py-1 text-sm bg-stone-700 text-stone-300 rounded">
            {group.tokens}トークン
          </span>
        </div>
      </div>

      {/* LLM解析結果（存在する場合） */}
      {group.explanation && (
        <div className={`rounded-lg p-4 border ${getSeverityColor(group.severity)}`}>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold">解析結果</h3>
            {group.is_meaningful !== undefined && (
              <span className={`text-xs px-2 py-0.5 rounded ${
                group.is_meaningful
                  ? 'bg-orange-600/30 text-orange-300'
                  : 'bg-stone-600/30 text-stone-400'
              }`}>
                {group.is_meaningful ? '意味のある重複' : 'ボイラープレート'}
              </span>
            )}
          </div>
          <p className="text-sm text-stone-200">{group.explanation}</p>
        </div>
      )}

      {/* 重複箇所一覧 */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-stone-300">
          重複箇所（{group.locations.length}箇所）
        </h3>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {group.locations.map((loc, idx) => (
            <div key={`${loc.path}:${loc.startLine}`} className="bg-stone-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-stone-500">#{idx + 1}</span>
                {onShowInTree && (
                  <button
                    onClick={() => onShowInTree(loc.path)}
                    className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    ツリーで表示
                  </button>
                )}
              </div>
              <div className="text-sm text-stone-200 font-mono mb-1">
                {loc.path}
              </div>
              <div className="text-xs text-stone-400">
                行 {loc.startLine} - {loc.endLine}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* コード断片（存在する場合） */}
      {group.fragment && (
        <div>
          <h3 className="text-sm font-semibold text-stone-300 mb-2">
            コード断片
          </h3>
          <div className="bg-stone-900 rounded-lg p-4 max-h-60 overflow-y-auto">
            <pre className="text-xs text-stone-300 whitespace-pre-wrap font-mono">
              {group.fragment}
            </pre>
          </div>
        </div>
      )}

      {/* リファクタリング提案 */}
      {group.refactoring_suggestion && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-stone-300">
              リファクタリング提案
            </h3>
            <button
              onClick={handleCopy}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                copied
                  ? "bg-green-600 text-white"
                  : "bg-orange-600 text-white hover:bg-orange-500"
              }`}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <RefactoringCard suggestion={group.refactoring_suggestion} />
        </div>
      )}
    </div>
  );
}
