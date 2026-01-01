/**
 * DetailPanel コンポーネント
 *
 * 選択されたファイルとアイテムの詳細を表示するパネル。
 * 未選択時はプレースホルダー、ファイル選択時はアイテム一覧、
 * アイテム選択時は詳細情報を表示する。
 * アイテム選択時には、Callers も自動的に表示される。
 */

import { useState } from 'react';
import type { SourceFile, ItemId, SemanticTest } from '@/types/schema';
import type { CallersIndex } from '@/types/callers';
import { ItemSummary } from './ItemSummary';
import { GroupedItemList } from './GroupedItemList';
import { useCallers } from '@/hooks/useCallers';

interface DetailPanelProps {
  /** 選択されたソースファイル（null = 未選択） */
  file: SourceFile | null;
  /** 選択されたアイテムID（null = 未選択） */
  selectedItemId: ItemId | null;
  /** アイテム選択時のコールバック */
  onSelectItem: (id: ItemId) => void;
  /** Callersインデックス */
  callersIndex: CallersIndex | null;
  /** セマンティックテスト情報 */
  semanticTests: SemanticTest[];
}

/**
 * DetailPanelコンポーネント
 *
 * 3つの状態を管理:
 * 1. ファイル未選択 → プレースホルダー表示
 * 2. ファイル選択済み、アイテム未選択 → アイテム一覧表示
 * 3. アイテム選択済み → ItemSummary + Callers
 */
export function DetailPanel({
  file,
  selectedItemId,
  onSelectItem,
  callersIndex,
  semanticTests
}: DetailPanelProps) {
  // 折りたたみ状態の管理
  const [callersExpanded, setCallersExpanded] = useState(false);

  // useCallers を使用（アイテム選択時に自動実行）
  const { callers, isLoading: callersLoading } = useCallers(
    selectedItemId,
    callersIndex
  );
  // ノード未選択時: プレースホルダー表示
  if (!file) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <p className="text-lg mb-2">ノードが選択されていません</p>
          <p className="text-sm">グラフからノードをクリックしてください</p>
        </div>
      </div>
    );
  }

  // 選択されたアイテムを検索
  const selectedItem = selectedItemId
    ? file.items.find((item) => item.id === selectedItemId)
    : null;

  // アイテム選択済み: ItemSummary + Callers + 影響分析
  if (selectedItem) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6">
          {/* 戻るボタン */}
          <button
            type="button"
            onClick={() => onSelectItem(null as unknown as ItemId)}
            className="mb-4 px-3 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded transition-colors flex items-center gap-2"
          >
            <span>←</span>
            <span>アイテム一覧に戻る</span>
          </button>

          {/* アイテム詳細 */}
          <ItemSummary item={selectedItem} />

          {/* Callers セクション */}
          <div className="mt-6 border-t border-gray-700 pt-6">
            <button
              type="button"
              onClick={() => setCallersExpanded(!callersExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-750 rounded transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-200">
                  Callers
                </span>
                {callersLoading ? (
                  <span className="text-xs text-gray-500">読み込み中...</span>
                ) : (
                  <span className="text-xs text-gray-500">
                    ({callers.length}件)
                  </span>
                )}
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  callersExpanded ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {callersExpanded && (
              <div className="mt-2 px-4 py-3 bg-gray-850 rounded">
                {callersLoading ? (
                  <p className="text-sm text-gray-500">読み込み中...</p>
                ) : callers.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    この関数を呼んでいる関数はありません（エントリポイント）
                  </p>
                ) : (
                  <div className="space-y-2">
                    {callers.map((caller) => (
                      <button
                        key={caller.id}
                        type="button"
                        onClick={() => onSelectItem(caller.id)}
                        className="w-full text-left px-3 py-2 bg-gray-800 hover:bg-gray-750 rounded transition-colors"
                      >
                        <div className="text-sm font-medium text-blue-400">
                          {caller.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {caller.file}:{caller.line}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ファイル選択済み、アイテム未選択: グループ化されたアイテム一覧表示
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        {/* ファイル情報ヘッダー */}
        <div className="mb-6 pb-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-gray-100 mb-2">{file.path}</h2>
          <p className="text-sm text-gray-500">
            アイテム数: {file.items.length}
          </p>
        </div>

        {/* グループ化されたアイテム一覧 */}
        <GroupedItemList
          items={file.items}
          semanticTests={semanticTests}
          onSelectItem={onSelectItem}
        />
      </div>
    </div>
  );
}
