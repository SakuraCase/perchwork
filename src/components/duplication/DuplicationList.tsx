/**
 * DuplicationList.tsx
 *
 * 重複グループのリスト表示
 */

import { useState, useMemo } from "react";
import type { DuplicationIndex, DuplicationSeverity } from "../../types/duplication";

interface DuplicationListProps {
  index: DuplicationIndex;
  selectedId: string | null;
  onSelectDuplicate: (id: string) => void;
}

type SortBy = "locations" | "lines" | "severity";

/** severityの優先度（ソート用） */
const SEVERITY_ORDER: Record<DuplicationSeverity | 'undefined', number> = {
  high: 0,
  medium: 1,
  low: 2,
  none: 3,
  undefined: 4,
};

/** severityに応じたドット色 */
function getSeverityDotColor(severity: DuplicationSeverity | undefined): string {
  switch (severity) {
    case 'high':
      return 'bg-red-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'low':
      return 'bg-blue-500';
    case 'none':
      return 'bg-stone-500';
    default:
      return 'bg-stone-700';
  }
}

export function DuplicationList({
  index,
  selectedId,
  onSelectDuplicate,
}: DuplicationListProps) {
  const [sortBy, setSortBy] = useState<SortBy>("locations");

  const sortedDuplicates = useMemo(() => {
    const duplicates = [...index.duplicates];
    if (sortBy === "lines") {
      return duplicates.sort((a, b) => b.lines - a.lines);
    } else if (sortBy === "severity") {
      return duplicates.sort((a, b) => {
        const aOrder = SEVERITY_ORDER[a.severity ?? 'undefined'];
        const bOrder = SEVERITY_ORDER[b.severity ?? 'undefined'];
        if (aOrder !== bOrder) return aOrder - bOrder;
        return b.location_count - a.location_count;
      });
    } else {
      // locations順（デフォルト）
      return duplicates.sort((a, b) => b.location_count - a.location_count);
    }
  }, [index.duplicates, sortBy]);

  return (
    <div className="h-full flex flex-col">
      {/* ソート切り替え */}
      <div className="p-2 border-b border-stone-700 flex gap-2 flex-wrap">
        <button
          onClick={() => setSortBy("locations")}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            sortBy === "locations"
              ? "bg-orange-600 text-white"
              : "bg-stone-800 text-stone-400 hover:bg-stone-700"
          }`}
        >
          箇所数順
        </button>
        <button
          onClick={() => setSortBy("severity")}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            sortBy === "severity"
              ? "bg-orange-600 text-white"
              : "bg-stone-800 text-stone-400 hover:bg-stone-700"
          }`}
        >
          重要度順
        </button>
        <button
          onClick={() => setSortBy("lines")}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            sortBy === "lines"
              ? "bg-orange-600 text-white"
              : "bg-stone-800 text-stone-400 hover:bg-stone-700"
          }`}
        >
          行数順
        </button>
      </div>

      {/* リスト */}
      <div className="flex-1 overflow-y-auto">
        {sortedDuplicates.length === 0 ? (
          <div className="p-4 text-center text-stone-500 text-sm">
            3箇所以上の重複は検出されませんでした
          </div>
        ) : (
          <div className="divide-y divide-stone-800">
            {sortedDuplicates.map((dup) => (
              <button
                key={dup.id}
                onClick={() => onSelectDuplicate(dup.id)}
                className={`w-full text-left p-3 transition-colors ${
                  selectedId === dup.id
                    ? "bg-orange-600/20 border-l-2 border-orange-500"
                    : "hover:bg-stone-800 border-l-2 border-transparent"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {/* severity ドット */}
                    <span
                      className={`w-2 h-2 rounded-full ${getSeverityDotColor(dup.severity)}`}
                      title={dup.severity ?? '未解析'}
                    />
                    <span className="text-xs font-mono text-stone-500">
                      {dup.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {dup.needs_fix && (
                      <span className="text-xs px-1.5 py-0.5 bg-red-600/30 text-red-300 rounded">
                        要修正
                      </span>
                    )}
                    {/* 箇所数バッジ */}
                    <span className="text-xs px-1.5 py-0.5 bg-orange-600/30 text-orange-300 rounded">
                      {dup.location_count}箇所
                    </span>
                    <span className="text-xs font-medium text-stone-400">
                      {dup.lines}行
                    </span>
                  </div>
                </div>
                {/* 関連ファイル（最大3件表示） */}
                <div className="text-xs text-stone-500 truncate">
                  {dup.files.slice(0, 3).map((f) => f.split('/').pop()).join(', ')}
                  {dup.files.length > 3 && ` +${dup.files.length - 3}`}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
