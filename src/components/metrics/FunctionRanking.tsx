/**
 * FunctionRanking.tsx
 *
 * 関数の複雑度ランキングテーブル
 */

import { useState, useEffect, useMemo } from "react";
import { METRIC_CONFIGS } from "../../types/complexity";
import type { RankedFunction } from "../../hooks/useComplexityLoader";
import { Pagination } from "./Pagination";

interface FunctionRankingProps {
  /** CC順のランキング取得関数（全データ取得用） */
  getTopByCC: (limit?: number) => Promise<RankedFunction[]>;
  /** Cognitive順のランキング取得関数（未使用だが互換性のため残す） */
  getTopByCognitive: (limit?: number) => Promise<RankedFunction[]>;
  /** ファイル選択時のコールバック（ツリービューに遷移） */
  onSelectFile?: (relativePath: string, lineNumber?: number) => void;
}

type SortKey = "cc" | "cognitive" | "loc" | "nargs";
type SortOrder = "asc" | "desc";

/**
 * 値の色を決定（CC用）
 */
function getCCColor(value: number): string {
  const config = METRIC_CONFIGS.cc;
  if (config.dangerThreshold && value >= config.dangerThreshold) {
    return "text-red-400";
  }
  if (config.warningThreshold && value >= config.warningThreshold) {
    return "text-yellow-400";
  }
  return "text-white";
}

/**
 * 値の色を決定（Cognitive用）
 */
function getCognitiveColor(value: number): string {
  const config = METRIC_CONFIGS.cognitive;
  if (config.dangerThreshold && value >= config.dangerThreshold) {
    return "text-red-400";
  }
  if (config.warningThreshold && value >= config.warningThreshold) {
    return "text-yellow-400";
  }
  return "text-white";
}

/**
 * 関数の複雑度ランキング
 */
export function FunctionRanking({
  getTopByCC,
  onSelectFile,
}: FunctionRankingProps) {
  const [allFunctions, setAllFunctions] = useState<RankedFunction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("cc");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 全データを取得（初回のみ）
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // CC順で全データを取得（ソートはクライアント側で行う）
        const data = await getTopByCC(10000);
        setAllFunctions(data);
      } catch (error) {
        console.error("Failed to load functions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [getTopByCC]);

  // ソート
  const sortedFunctions = useMemo(() => {
    return [...allFunctions].sort((a, b) => {
      let aVal: number;
      let bVal: number;

      switch (sortKey) {
        case "cc":
          aVal = a.function.cc;
          bVal = b.function.cc;
          break;
        case "cognitive":
          aVal = a.function.cognitive;
          bVal = b.function.cognitive;
          break;
        case "loc":
          aVal = a.function.loc.code;
          bVal = b.function.loc.code;
          break;
        case "nargs":
          aVal = a.function.nargs;
          bVal = b.function.nargs;
          break;
      }

      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [allFunctions, sortKey, sortOrder]);

  // ページネーション
  const totalPages = Math.ceil(sortedFunctions.length / pageSize);
  const paginatedFunctions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedFunctions.slice(start, start + pageSize);
  }, [sortedFunctions, currentPage, pageSize]);

  // ソート変更ハンドラ
  const handleSort = (key: SortKey) => {
    setCurrentPage(1);
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      // 全て高い方が悪いので、デフォルトはdesc
      setSortOrder("desc");
    }
  };

  // ソートインジケーター
  const getSortIndicator = (key: SortKey) => {
    if (sortKey !== key) return null;
    return sortOrder === "asc" ? " ▲" : " ▼";
  };

  const handleRowClick = (item: RankedFunction) => {
    onSelectFile?.(item.relativePath, item.function.line_start);
  };

  return (
    <div className="bg-stone-800 rounded-lg border border-stone-700">
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 border-b border-stone-700">
        <h3 className="text-lg font-medium text-white">関数ランキング</h3>
      </div>

      {/* テーブル */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-stone-400">読み込み中...</div>
        ) : sortedFunctions.length === 0 ? (
          <div className="p-8 text-center text-stone-400">データがありません</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-900/50">
              <tr className="text-stone-400 text-left">
                <th className="px-4 py-3 w-12">#</th>
                <th className="px-4 py-3">関数名</th>
                <th className="px-4 py-3">ファイル</th>
                <th
                  className="px-4 py-3 text-right cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort("cc")}
                >
                  CC{getSortIndicator("cc")}
                </th>
                <th
                  className="px-4 py-3 text-right cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort("cognitive")}
                >
                  Cognitive{getSortIndicator("cognitive")}
                </th>
                <th
                  className="px-4 py-3 text-right cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort("loc")}
                >
                  行数{getSortIndicator("loc")}
                </th>
                <th
                  className="px-4 py-3 text-right cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort("nargs")}
                >
                  引数{getSortIndicator("nargs")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-700">
              {paginatedFunctions.map((item, index) => (
                <tr
                  key={item.function.id}
                  className="hover:bg-stone-700/50 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(item)}
                >
                  <td className="px-4 py-3 text-stone-500">
                    {(currentPage - 1) * pageSize + index + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-mono text-orange-400">
                      {item.function.name}
                    </div>
                    <div className="text-xs text-stone-500">
                      L{item.function.line_start}-{item.function.line_end}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-300 truncate max-w-xs">
                    {item.relativePath}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono ${getCCColor(item.function.cc)}`}
                  >
                    {item.function.cc}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono ${getCognitiveColor(item.function.cognitive)}`}
                  >
                    {item.function.cognitive}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-400 font-mono">
                    {item.function.loc.code}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-400 font-mono">
                    {item.function.nargs}
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
        totalItems={sortedFunctions.length}
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
