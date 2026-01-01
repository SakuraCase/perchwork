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
import { CollapsibleSection } from '@/components/common/CollapsibleSection';

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
  /** シーケンス図を開くコールバック */
  onOpenSequenceDiagram?: (functionId: ItemId) => void;
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
  semanticTests,
  onOpenSequenceDiagram,
}: DetailPanelProps) {
  // 折りたたみ状態の管理
  const [callersExpanded, setCallersExpanded] = useState(false);
  const [testsExpanded, setTestsExpanded] = useState(true); // デフォルト展開

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
            <span>定義一覧に戻る</span>
          </button>

          {/* シーケンス図ボタン（method/fn の場合のみ） */}
          {onOpenSequenceDiagram &&
            (selectedItem.type === 'method' || selectedItem.type === 'fn') && (
              <button
                type="button"
                onClick={() => onOpenSequenceDiagram(selectedItem.id)}
                className="mb-4 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                  />
                </svg>
                <span>シーケンス図表示</span>
              </button>
            )}

          {/* アイテム詳細（Callersは概要→責務→シグネチャ→テストの後に挿入） */}
          <ItemSummary
            item={selectedItem}
            semanticTests={semanticTests}
            testsExpanded={testsExpanded}
            onToggleTests={() => setTestsExpanded(!testsExpanded)}
          >
            {/* Callers セクション */}
            <CollapsibleSection
              title="Callers"
              count={callersLoading ? undefined : callers.length}
              expanded={callersExpanded}
              onToggle={() => setCallersExpanded(!callersExpanded)}
              isLoading={callersLoading}
              className="mt-4"
            >
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
                      className="w-full text-left px-3 py-2 bg-gray-800 border border-gray-700 rounded hover:bg-gray-750 hover:border-blue-600/50 transition-colors"
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
            </CollapsibleSection>
          </ItemSummary>
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
          <p className="text-sm text-gray-500">アイテム数: {file.items.length}</p>
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
