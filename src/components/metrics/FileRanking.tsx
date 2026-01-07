/**
 * FileRanking.tsx
 *
 * ファイルのメトリクスランキングテーブル
 * 保守性指標(MI)が低いファイルを表示
 */

import { useMemo, useState } from "react";
import type { ComplexityFileSummary } from "../../types/complexity";
import { Pagination } from "./Pagination";

interface FileRankingProps {
  /** ファイルサマリーリスト */
  files: ComplexityFileSummary[];
  /** ファイル選択時のコールバック */
  onSelectFile?: (relativePath: string) => void;
}

type SortKey = "mi" | "cc_avg" | "cognitive_avg" | "loc" | "function_count";
type SortOrder = "asc" | "desc";

/**
 * 値の色を決定（MI用）
 */
function getMiColor(value: number | undefined): string {
  if (value === undefined) return "text-stone-500";
  if (value < 20) return "text-red-400";
  if (value < 40) return "text-yellow-400";
  return "text-white";
}

/**
 * 値の色を決定（CC/Cognitive用）
 */
function getAvgColor(
  value: number,
  isCC: boolean
): "text-white" | "text-yellow-400" | "text-red-400" {
  const warn = isCC ? 5 : 8;
  const danger = isCC ? 10 : 15;
  if (value >= danger) return "text-red-400";
  if (value >= warn) return "text-yellow-400";
  return "text-white";
}

/**
 * ファイルのメトリクスランキング
 */
export function FileRanking({ files, onSelectFile }: FileRankingProps) {
  const [sortKey, setSortKey] = useState<SortKey>("mi");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [showAll, setShowAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // ソート
  const sortedFiles = useMemo(() => {
    const sorted = [...files].sort((a, b) => {
      let aVal: number;
      let bVal: number;

      switch (sortKey) {
        case "mi":
          // MI未定義のファイルは最後に
          aVal = a.mi ?? 100;
          bVal = b.mi ?? 100;
          break;
        case "cc_avg":
          aVal = a.cc_avg;
          bVal = b.cc_avg;
          break;
        case "cognitive_avg":
          aVal = a.cognitive_avg;
          bVal = b.cognitive_avg;
          break;
        case "loc":
          aVal = a.loc;
          bVal = b.loc;
          break;
        case "function_count":
          aVal = a.function_count;
          bVal = b.function_count;
          break;
      }

      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });

    // 問題のあるファイルのみ、または全て
    if (showAll) {
      return sorted;
    }
    return sorted.filter((f) => {
      // MI < 40 または CC平均 > 5 または Cognitive平均 > 8
      return (
        (f.mi !== undefined && f.mi < 40) || f.cc_avg > 5 || f.cognitive_avg > 8
      );
    });
  }, [files, sortKey, sortOrder, showAll]);

  // ページネーション
  const totalPages = Math.ceil(sortedFiles.length / pageSize);
  const paginatedFiles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedFiles.slice(start, start + pageSize);
  }, [sortedFiles, currentPage, pageSize]);

  // ソートやフィルタ変更時にページをリセット
  const handleSort = (key: SortKey) => {
    setCurrentPage(1);
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      // MIはascでソート（低い方が悪い）、他はdescでソート（高い方が悪い）
      setSortOrder(key === "mi" ? "asc" : "desc");
    }
  };

  const getSortIndicator = (key: SortKey) => {
    if (sortKey !== key) return null;
    return sortOrder === "asc" ? " ▲" : " ▼";
  };

  const handleRowClick = (file: ComplexityFileSummary) => {
    onSelectFile?.(file.relative_path);
  };

  return (
    <div className="bg-stone-800 rounded-lg border border-stone-700">
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 border-b border-stone-700">
        <h3 className="text-lg font-medium text-white">ファイルランキング</h3>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-stone-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => {
                setShowAll(e.target.checked);
                setCurrentPage(1);
              }}
              className="rounded border-stone-600 bg-stone-700 text-orange-500 focus:ring-orange-500"
            />
            すべてのファイルを表示
          </label>
        </div>
      </div>

      {/* 説明 */}
      <div className="px-4 py-2 text-xs text-stone-500 border-b border-stone-700">
        MI（保守性指標）が低いファイルや、平均CCが高いファイルを表示しています。
        <br />
        デフォルトでは問題のあるファイルのみ表示されます。
      </div>

      {/* テーブル */}
      <div className="overflow-x-auto">
        {sortedFiles.length === 0 ? (
          <div className="p-8 text-center text-stone-400">
            {showAll
              ? "データがありません"
              : "問題のあるファイルはありません"}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-900/50">
              <tr className="text-stone-400 text-left">
                <th className="px-4 py-3 w-12">#</th>
                <th className="px-4 py-3">ファイル</th>
                <th
                  className="px-4 py-3 text-right cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort("mi")}
                >
                  MI{getSortIndicator("mi")}
                </th>
                <th
                  className="px-4 py-3 text-right cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort("cc_avg")}
                >
                  平均CC{getSortIndicator("cc_avg")}
                </th>
                <th
                  className="px-4 py-3 text-right cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort("cognitive_avg")}
                >
                  平均Cog{getSortIndicator("cognitive_avg")}
                </th>
                <th
                  className="px-4 py-3 text-right cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort("loc")}
                >
                  行数{getSortIndicator("loc")}
                </th>
                <th
                  className="px-4 py-3 text-right cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort("function_count")}
                >
                  関数数{getSortIndicator("function_count")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-700">
              {paginatedFiles.map((file, index) => (
                <tr
                  key={file.relative_path}
                  className="hover:bg-stone-700/50 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(file)}
                >
                  <td className="px-4 py-3 text-stone-500">
                    {(currentPage - 1) * pageSize + index + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-stone-300 truncate max-w-md">
                      {file.relative_path}
                    </div>
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono ${getMiColor(file.mi)}`}
                  >
                    {file.mi !== undefined ? file.mi.toFixed(1) : "-"}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono ${getAvgColor(file.cc_avg, true)}`}
                  >
                    {file.cc_avg.toFixed(2)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono ${getAvgColor(file.cognitive_avg, false)}`}
                  >
                    {file.cognitive_avg.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-400 font-mono">
                    {file.loc}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-400 font-mono">
                    {file.function_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ページネーション */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={sortedFiles.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
      />
    </div>
  );
}
