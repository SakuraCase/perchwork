/**
 * ReviewFileList.tsx
 *
 * レビューファイルリスト（優先度フィルター付き）
 */

import { useState, useMemo } from "react";
import type { ReviewIndex } from "../../types/review";

type PriorityFilter = "all" | "high" | "medium" | "low";

interface ReviewFileListProps {
  index: ReviewIndex;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}

export function ReviewFileList({
  index,
  selectedPath,
  onSelectFile,
}: ReviewFileListProps) {
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");

  // フィルタリングとソート
  const filteredFiles = useMemo(() => {
    let files = [...index.files];

    // 優先度フィルター
    if (priorityFilter !== "all") {
      files = files.filter((f) => f.by_priority[priorityFilter] > 0);
    }

    // HIGH優先度 → MEDIUM優先度 → 件数順でソート
    files.sort((a, b) => {
      if (b.by_priority.high !== a.by_priority.high) {
        return b.by_priority.high - a.by_priority.high;
      }
      if (b.by_priority.medium !== a.by_priority.medium) {
        return b.by_priority.medium - a.by_priority.medium;
      }
      return b.fix_plans - a.fix_plans;
    });

    return files;
  }, [index.files, priorityFilter]);

  const filterButtons: { value: PriorityFilter; label: string; color: string }[] = [
    { value: "all", label: "All", color: "stone" },
    { value: "high", label: "High", color: "red" },
    { value: "medium", label: "Med", color: "yellow" },
    { value: "low", label: "Low", color: "orange" },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* ヘッダー */}
      <div className="p-3 border-b border-stone-700">
        <h3 className="text-sm font-semibold text-stone-300 mb-2">
          ファイル一覧 ({filteredFiles.length}/{index.files.length})
        </h3>

        {/* 優先度フィルター */}
        <div className="flex gap-1">
          {filterButtons.map((btn) => {
            const isActive = priorityFilter === btn.value;
            const colorClasses = {
              stone: isActive
                ? "bg-stone-600 text-white"
                : "bg-stone-800 text-stone-400 hover:bg-stone-700",
              red: isActive
                ? "bg-red-600 text-white"
                : "bg-stone-800 text-red-400 hover:bg-stone-700",
              yellow: isActive
                ? "bg-yellow-600 text-white"
                : "bg-stone-800 text-yellow-400 hover:bg-stone-700",
              orange: isActive
                ? "bg-orange-600 text-white"
                : "bg-stone-800 text-orange-400 hover:bg-stone-700",
            };

            return (
              <button
                key={btn.value}
                onClick={() => setPriorityFilter(btn.value)}
                className={`px-2 py-1 text-xs rounded transition-colors ${colorClasses[btn.color as keyof typeof colorClasses]}`}
              >
                {btn.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ファイルリスト */}
      <div className="flex-1 overflow-y-auto divide-y divide-stone-800">
        {filteredFiles.length === 0 ? (
          <div className="p-4 text-center text-stone-500 text-sm">
            該当するファイルがありません
          </div>
        ) : (
          filteredFiles.map((file) => (
            <button
              key={file.path}
              onClick={() => onSelectFile(file.path)}
              className={`w-full text-left p-3 transition-colors ${
                selectedPath === file.path
                  ? "bg-orange-900/50"
                  : "hover:bg-stone-800"
              }`}
            >
              <div className="flex items-center gap-2">
                {/* HIGH優先度アイコン */}
                {file.by_priority.high > 0 && (
                  <span className="text-red-400 text-sm" title="高優先度の問題あり">
                    ⚠️
                  </span>
                )}
                <p
                  className="text-sm text-stone-200 font-mono truncate flex-1"
                  title={file.path}
                >
                  {file.path}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {file.fix_plans > 0 ? (
                  <>
                    {/* 優先度別バッジ */}
                    {file.by_priority.high > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                        H:{file.by_priority.high}
                      </span>
                    )}
                    {file.by_priority.medium > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                        M:{file.by_priority.medium}
                      </span>
                    )}
                    {file.by_priority.low > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
                        L:{file.by_priority.low}
                      </span>
                    )}
                    <span className="text-xs text-stone-500">
                      計{file.fix_plans}件
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-green-400">✓ OK</span>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
