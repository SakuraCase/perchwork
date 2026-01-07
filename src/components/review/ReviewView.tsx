/**
 * ReviewView.tsx
 *
 * レビュータブのメインビュー
 */

import { useState, useCallback } from "react";
import { useReviewDataLoader } from "../../hooks/useReviewDataLoader";
import { ReviewOverview } from "./ReviewOverview";
import { ReviewFileList } from "./ReviewFileList";
import { ReviewResultDetail } from "./ReviewResultDetail";
import { Loading } from "../common/Loading";

interface ReviewViewProps {
  /** ツリーで表示ハンドラ */
  onShowInTree?: (filePath: string) => void;
}

export function ReviewView({ onShowInTree }: ReviewViewProps) {
  const { index, selectedFile, isLoading, error, loadFileDetails } =
    useReviewDataLoader();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [showOverview, setShowOverview] = useState(true);

  const handleSelectFile = useCallback(
    async (path: string) => {
      setSelectedPath(path);
      setShowOverview(false);
      await loadFileDetails(path);
    },
    [loadFileDetails]
  );

  const handleShowOverview = useCallback(() => {
    setShowOverview(true);
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

  return (
    <div className="flex h-full">
      {/* 左パネル: ファイルリスト */}
      <div className="w-80 border-r border-stone-700 flex flex-col">
        <div className="p-2 border-b border-stone-700">
          <button
            onClick={handleShowOverview}
            className={`w-full px-3 py-2 text-sm rounded transition-colors ${
              showOverview
                ? "bg-orange-600 text-white"
                : "bg-stone-800 text-stone-300 hover:bg-stone-700"
            }`}
          >
            概要
          </button>
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
        {showOverview ? (
          <ReviewOverview index={index} onFileSelect={handleSelectFile} />
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
