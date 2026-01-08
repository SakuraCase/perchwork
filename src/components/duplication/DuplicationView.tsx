/**
 * DuplicationView.tsx
 *
 * 重複コード検出のメインビュー
 */

import { useState, useCallback } from "react";
import { useDuplicationDataLoader } from "../../hooks/useDuplicationDataLoader";
import { DuplicationList } from "./DuplicationList";
import { DuplicationDetail } from "./DuplicationDetail";
import { Loading } from "../common/Loading";

interface DuplicationViewProps {
  /** ツリーで表示ハンドラ */
  onShowInTree?: (filePath: string) => void;
  /** 概要に戻るハンドラ */
  onBackToOverview?: () => void;
}

export function DuplicationView({
  onShowInTree,
  onBackToOverview,
}: DuplicationViewProps) {
  const { index, selectedGroup, isLoading, error, loadGroupDetails } =
    useDuplicationDataLoader();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelectDuplicate = useCallback(
    async (id: string) => {
      setSelectedId(id);
      await loadGroupDetails(id);
    },
    [loadGroupDetails]
  );

  if (isLoading && !index) {
    return <Loading message="重複検出データを読み込んでいます..." />;
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
            重複検出データがありません
          </p>
          <p className="text-stone-500 text-sm">
            <code>/analyze</code> を実行して重複検出データを生成してください
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* 左パネル: 重複リスト */}
      <div className="w-80 border-r border-stone-700 flex flex-col">
        {/* 戻るボタン */}
        {onBackToOverview && (
          <div className="p-2 border-b border-stone-700">
            <button
              onClick={onBackToOverview}
              className="w-full px-3 py-2 text-sm bg-stone-800 text-stone-300 hover:bg-stone-700 rounded transition-colors flex items-center justify-center gap-2"
            >
              <span>←</span>
              <span>概要に戻る</span>
            </button>
          </div>
        )}

        {/* 統計情報 */}
        <div className="p-3 border-b border-stone-700 bg-stone-800/50">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-orange-400">
                {index.stats.total_duplicates}
              </div>
              <div className="text-xs text-stone-500">重複ペア</div>
            </div>
            <div>
              <div className="text-lg font-bold text-orange-400">
                {index.stats.duplication_percentage.toFixed(1)}%
              </div>
              <div className="text-xs text-stone-500">重複率</div>
            </div>
          </div>
        </div>

        {/* リスト */}
        <div className="flex-1 overflow-hidden">
          <DuplicationList
            index={index}
            selectedId={selectedId}
            onSelectDuplicate={handleSelectDuplicate}
          />
        </div>
      </div>

      {/* 右パネル: 詳細表示 */}
      <div className="flex-1 overflow-hidden">
        {selectedGroup ? (
          <DuplicationDetail
            key={selectedGroup.id}
            group={selectedGroup}
            onShowInTree={onShowInTree}
          />
        ) : isLoading ? (
          <Loading message="読み込んでいます..." />
        ) : (
          <div className="flex items-center justify-center h-full text-stone-500">
            重複グループを選択してください
          </div>
        )}
      </div>
    </div>
  );
}
