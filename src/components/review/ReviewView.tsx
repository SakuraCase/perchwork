/**
 * ReviewView.tsx
 *
 * レビュータブのメインビュー
 */

import { useState, useCallback } from "react";
import { useReviewDataLoader } from "../../hooks/useReviewDataLoader";
import { useDuplicationDataLoader } from "../../hooks/useDuplicationDataLoader";
import { ReviewOverview } from "./ReviewOverview";
import { ReviewFileList } from "./ReviewFileList";
import { ReviewResultDetail } from "./ReviewResultDetail";
import { DuplicationView } from "../duplication/DuplicationView";
import { Loading } from "../common/Loading";

interface ReviewViewProps {
  /** ツリーで表示ハンドラ */
  onShowInTree?: (filePath: string) => void;
}

type ViewMode = "overview" | "file" | "duplication";

export function ReviewView({ onShowInTree }: ReviewViewProps) {
  const { index, selectedFile, isLoading, error, loadFileDetails } =
    useReviewDataLoader();
  const { getAllStats, hasDuplicationData } = useDuplicationDataLoader();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("overview");

  // 全体の統計
  const allStats = getAllStats();
  // 重複データが存在するか
  const hasDupData = hasDuplicationData();

  const handleSelectFile = useCallback(
    async (path: string) => {
      setSelectedPath(path);
      setViewMode("file");
      await loadFileDetails(path);
    },
    [loadFileDetails]
  );

  const handleShowOverview = useCallback(() => {
    setViewMode("overview");
    setSelectedPath(null);
  }, []);

  const handleShowDuplication = useCallback(() => {
    setViewMode("duplication");
    setSelectedPath(null);
  }, []);

  if (isLoading && !index) {
    return <Loading message="レビューデータを読み込んでいます..." />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-400 mb-2">エラーが発生しました</p>
          <p className="text-stone-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!index) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <p className="text-stone-300 text-lg mb-2">
            レビューデータがありません
          </p>
          <p className="text-stone-500 text-sm">
            <code>/analyze</code> を実行してレビューデータを生成してください
          </p>
        </div>
      </div>
    );
  }

  // 重複ビューモードの場合は専用ビューを表示
  if (viewMode === "duplication") {
    return (
      <DuplicationView
        onShowInTree={onShowInTree}
        onBackToOverview={handleShowOverview}
      />
    );
  }

  return (
    <div className="flex h-full">
      {/* 左パネル: ファイルリスト */}
      <div className="w-80 border-r border-stone-700 flex flex-col">
        <div className="p-2 border-b border-stone-700 space-y-2">
          <button
            onClick={handleShowOverview}
            className={`w-full px-3 py-2 text-sm rounded transition-colors ${
              viewMode === "overview"
                ? "bg-orange-600 text-white"
                : "bg-stone-800 text-stone-300 hover:bg-stone-700"
            }`}
          >
            概要
          </button>
          {/* 重複詳細ボタン - 重複データがあれば表示 */}
          {hasDupData && (
            <button
              onClick={handleShowDuplication}
              className="w-full px-3 py-2 text-sm rounded transition-colors bg-stone-800 text-stone-300 hover:bg-stone-700"
            >
              重複詳細 ({allStats?.total_duplicates ?? 0})
            </button>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          <ReviewFileList
            index={index}
            selectedPath={selectedPath}
            onSelectFile={handleSelectFile}
          />
        </div>
      </div>

      {/* 右パネル: 詳細表示 */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "overview" ? (
          <ReviewOverview
            index={index}
            onFileSelect={handleSelectFile}
            allDuplicationStats={allStats}
          />
        ) : selectedFile ? (
          <ReviewResultDetail key={selectedFile.path} result={selectedFile} onShowInTree={onShowInTree} />
        ) : isLoading ? (
          <Loading message="ファイルを読み込んでいます..." />
        ) : (
          <div className="flex items-center justify-center h-full text-stone-500">
            ファイルを選択してください
          </div>
        )}
      </div>
    </div>
  );
}
