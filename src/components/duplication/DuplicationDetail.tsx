/**
 * DuplicationDetail.tsx
 *
 * 重複グループの詳細表示
 */

import type { DuplicationGroup } from "../../types/duplication";
import { RefactoringCard } from "./RefactoringCard";

interface DuplicationDetailProps {
  group: DuplicationGroup;
  onShowInTree?: (filePath: string) => void;
}

export function DuplicationDetail({ group, onShowInTree }: DuplicationDetailProps) {
  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-stone-100 font-mono">
          {group.id}
        </h2>
        <div className="flex items-center gap-2">
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
          <h3 className="text-sm font-semibold text-stone-300 mb-3">
            リファクタリング候補
          </h3>
          <RefactoringCard suggestion={group.refactoring_suggestion} />
        </div>
      )}
    </div>
  );
}
