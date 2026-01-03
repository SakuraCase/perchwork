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
import type { NavigationHistoryEntry } from '@/types/navigation';
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
  /** ナビゲーション履歴 */
  navigationHistory?: NavigationHistoryEntry[];
  /** 指定インデックスのエントリに移動 */
  onNavigateTo?: (index: number) => void;
  /** グラフ表示ハンドラ（グラフタブへ遷移し、ノードを中心表示） */
  onShowInGraph?: (itemId: ItemId, filePath: string) => void;
  /** グラフ表示ボタンのラベル */
  showInGraphLabel?: string;
  /** シーケンス図生成ハンドラ（シーケンスタブへ遷移し、rootを設定） */
  onShowInSequence?: (itemId: ItemId) => void;
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
  navigationHistory = [],
  onNavigateTo,
  onShowInGraph,
  showInGraphLabel = 'グラフで表示',
  onShowInSequence,
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
    const isFunctionType =
      selectedItem.type === 'fn' || selectedItem.type === 'method';

    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6">
          {/* 履歴プルダウン（一番上） */}
          {navigationHistory.length >= 1 && onNavigateTo && (
            <div className="mb-4">
              <select
                onChange={(e) => {
                  const index = parseInt(e.target.value, 10);
                  if (!isNaN(index) && index >= 0) {
                    onNavigateTo(index);
                    e.target.value = ''; // 選択をリセット
                  }
                }}
                defaultValue=""
                className="w-full px-3 py-2 text-sm bg-gray-800 text-gray-300 border border-gray-600 rounded hover:border-gray-500 focus:border-blue-500 focus:outline-none cursor-pointer"
              >
                <option value="" disabled>
                  ← 履歴から移動 ({navigationHistory.length})
                </option>
                {navigationHistory.map((entry, idx) => (
                  <option key={entry.id} value={idx}>
                    {entry.itemId ? entry.itemName : `${entry.itemName} (定義一覧)`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* アクションボタン（fn/method型のみ） */}
          {isFunctionType && (onShowInGraph || onShowInSequence) && (
            <div className="mb-4 flex gap-2">
              {onShowInGraph && (
                <button
                  type="button"
                  onClick={() => onShowInGraph(selectedItem.id, file.path)}
                  className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  {showInGraphLabel}
                </button>
              )}
              {onShowInSequence && (
                <button
                  type="button"
                  onClick={() => onShowInSequence(selectedItem.id)}
                  className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  シーケンスで表示
                </button>
              )}
            </div>
          )}

          {/* 定義一覧に戻るボタン */}
          <div className="mb-4">
            <button
              type="button"
              onClick={() => onSelectItem(null as unknown as ItemId)}
              className="px-3 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded transition-colors flex items-center gap-2"
            >
              <span>←</span>
              <span>定義一覧</span>
            </button>
          </div>

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
                  {callers.map((caller, index) => (
                    <button
                      key={`${caller.id}-${index}`}
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
        {/* 履歴プルダウン */}
        {navigationHistory.length >= 1 && onNavigateTo && (
          <div className="mb-4">
            <select
              onChange={(e) => {
                const index = parseInt(e.target.value, 10);
                if (!isNaN(index) && index >= 0) {
                  onNavigateTo(index);
                  e.target.value = ''; // 選択をリセット
                }
              }}
              defaultValue=""
              className="w-full px-3 py-2 text-sm bg-gray-800 text-gray-300 border border-gray-600 rounded hover:border-gray-500 focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="" disabled>
                ← 履歴から移動 ({navigationHistory.length})
              </option>
              {navigationHistory.map((entry, idx) => (
                <option key={entry.id} value={idx}>
                  {entry.itemId ? entry.itemName : `${entry.itemName} (定義一覧)`}
                </option>
              ))}
            </select>
          </div>
        )}

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
