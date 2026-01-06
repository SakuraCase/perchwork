/**
 * ReviewFileList.tsx
 *
 * レビューファイルリスト
 */

import type { ReviewIndex } from "../../types/review";

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
  // ファイルを fix_plans 数の降順でソート
  const sortedFiles = [...index.files].sort(
    (a, b) => b.fix_plans - a.fix_plans
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-3 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-gray-300">
          ファイル一覧 ({index.files.length})
        </h3>
      </div>
      <div className="divide-y divide-gray-800">
        {sortedFiles.map((file) => (
          <button
            key={file.path}
            onClick={() => onSelectFile(file.path)}
            className={`w-full text-left p-3 transition-colors ${
              selectedPath === file.path
                ? "bg-blue-900/50"
                : "hover:bg-gray-800"
            }`}
          >
            <p
              className="text-sm text-gray-200 font-mono truncate"
              title={file.path}
            >
              {file.path}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {file.fix_plans > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    file.fix_plans >= 3
                      ? "bg-red-500/20 text-red-400"
                      : file.fix_plans >= 1
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-gray-700 text-gray-400"
                  }`}
                >
                  {file.fix_plans} 件
                </span>
              )}
              {file.fix_plans === 0 && (
                <span className="text-xs text-green-400">✓ OK</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
