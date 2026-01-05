/**
 * Pagination.tsx
 *
 * ページネーションコンポーネント
 */

interface PaginationProps {
  /** 現在のページ（1始まり） */
  currentPage: number;
  /** 総ページ数 */
  totalPages: number;
  /** 総アイテム数 */
  totalItems: number;
  /** 1ページあたりのアイテム数 */
  pageSize: number;
  /** ページ変更時のコールバック */
  onPageChange: (page: number) => void;
  /** ページサイズ変更時のコールバック */
  onPageSizeChange?: (size: number) => void;
  /** 選択可能なページサイズ */
  pageSizeOptions?: number[];
}

/**
 * ページネーション
 */
export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
}: PaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // 表示するページ番号を計算
  const getPageNumbers = (): (number | "...")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | "...")[] = [];

    if (currentPage <= 4) {
      // 先頭付近
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (currentPage >= totalPages - 3) {
      // 末尾付近
      pages.push(
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages
      );
    } else {
      // 中間
      pages.push(
        1,
        "...",
        currentPage - 1,
        currentPage,
        currentPage + 1,
        "...",
        totalPages
      );
    }

    return pages;
  };

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
      {/* 表示件数 */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-400">
          {startItem}-{endItem} / {totalItems}件
        </span>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}件/ページ
              </option>
            ))}
          </select>
        )}
      </div>

      {/* ページナビゲーション */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* 前へ */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-2 py-1 text-sm rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-400"
          >
            ←
          </button>

          {/* ページ番号 */}
          {getPageNumbers().map((page, index) =>
            page === "..." ? (
              <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  page === currentPage
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:bg-gray-700"
                }`}
              >
                {page}
              </button>
            )
          )}

          {/* 次へ */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-2 py-1 text-sm rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-400"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
