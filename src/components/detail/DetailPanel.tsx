/**
 * DetailPanel コンポーネント
 *
 * 選択されたファイルとアイテムの詳細を表示するパネル。
 * 未選択時はプレースホルダー、ファイル選択時はアイテム一覧、
 * アイテム選択時は詳細情報を表示する。
 * アイテム選択時には、Callers と影響分析も自動的に表示される。
 */

import { useState } from 'react';
import type { SourceFile, ItemId, CodeItem, SemanticTest } from '@/types/schema';
import type { CallersIndex } from '@/types/callers';
import { ItemSummary } from './ItemSummary';
import { GroupedItemList } from './GroupedItemList';
import { useCallers } from '@/hooks/useCallers';
import { useImpactAnalysis } from '@/hooks/useImpactAnalysis';

interface DetailPanelProps {
  /** 選択されたソースファイル（null = 未選択） */
  file: SourceFile | null;
  /** 選択されたアイテムID（null = 未選択） */
  selectedItemId: ItemId | null;
  /** アイテム選択時のコールバック */
  onSelectItem: (id: ItemId) => void;
  /** Callersインデックス */
  callersIndex: CallersIndex | null;
  /** コードアイテムのマップ */
  codeItems: Map<ItemId, CodeItem> | null;
  /** セマンティックテスト情報 */
  semanticTests: SemanticTest[];
}

/**
 * DetailPanelコンポーネント
 *
 * 3つの状態を管理:
 * 1. ファイル未選択 → プレースホルダー表示
 * 2. ファイル選択済み、アイテム未選択 → アイテム一覧表示
 * 3. アイテム選択済み → ItemSummary + Callers + 影響分析
 */
export function DetailPanel({
  file,
  selectedItemId,
  onSelectItem,
  callersIndex,
  codeItems,
  semanticTests
}: DetailPanelProps) {
  // 折りたたみ状態の管理
  const [callersExpanded, setCallersExpanded] = useState(false);
  const [impactExpanded, setImpactExpanded] = useState(false);

  // useCallers と useImpactAnalysis を使用（アイテム選択時に自動実行）
  const { callers, isLoading: callersLoading } = useCallers(
    selectedItemId,
    callersIndex
  );
  const { result: impactResult, isAnalyzing: impactAnalyzing } = useImpactAnalysis(
    selectedItemId,
    callersIndex,
    codeItems
  );
  // ファイル未選択時: プレースホルダー表示
  if (!file) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <p className="text-lg mb-2">ファイルが選択されていません</p>
          <p className="text-sm">左側のツリーからファイルを選択してください</p>
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

          {/* 影響分析セクション */}
          <div className="mt-6 border-t border-gray-700 pt-6">
            <button
              type="button"
              onClick={() => setImpactExpanded(!impactExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-750 rounded transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-200">
                  影響分析
                </span>
                {impactAnalyzing ? (
                  <span className="text-xs text-gray-500">分析中...</span>
                ) : impactResult ? (
                  <span className="text-xs text-gray-500">
                    (直接: {impactResult.directImpact.length}件、間接: {impactResult.totalAffected - impactResult.directImpact.length}件)
                  </span>
                ) : null}
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  impactExpanded ? 'rotate-180' : ''
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

            {impactExpanded && (
              <div className="mt-2 px-4 py-3 bg-gray-850 rounded">
                {impactAnalyzing ? (
                  <p className="text-sm text-gray-500">分析中...</p>
                ) : !impactResult ? (
                  <p className="text-sm text-gray-500">影響分析データがありません</p>
                ) : (
                  <div className="space-y-4">
                    {/* サマリー */}
                    <div className="grid grid-cols-3 gap-4 p-3 bg-gray-800 rounded">
                      <div>
                        <div className="text-xs text-gray-500">直接影響</div>
                        <div className="text-lg font-semibold text-blue-400">
                          {impactResult.directImpact.length}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">間接影響</div>
                        <div className="text-lg font-semibold text-purple-400">
                          {impactResult.totalAffected - impactResult.directImpact.length}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">影響テスト</div>
                        <div className="text-lg font-semibold text-green-400">
                          {impactResult.directTests.length + impactResult.indirectTests.length}
                        </div>
                      </div>
                    </div>

                    {/* 直接影響 */}
                    {impactResult.directImpact.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 mb-2">
                          直接影響 ({impactResult.directImpact.length}件)
                        </h4>
                        <div className="space-y-1">
                          {impactResult.directImpact.slice(0, 5).map((caller) => (
                            <button
                              key={caller.id}
                              type="button"
                              onClick={() => onSelectItem(caller.id)}
                              className="w-full text-left px-2 py-1 text-xs bg-gray-800 hover:bg-gray-750 rounded transition-colors"
                            >
                              <span className="text-blue-400">{caller.name}</span>
                              <span className="text-gray-600 ml-2">
                                {caller.file}:{caller.line}
                              </span>
                            </button>
                          ))}
                          {impactResult.directImpact.length > 5 && (
                            <p className="text-xs text-gray-500 px-2">
                              ...他 {impactResult.directImpact.length - 5}件
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 間接影響（最大レベル2まで表示） */}
                    {Array.from(impactResult.indirectImpact.entries())
                      .filter(([level]) => level <= 2)
                      .map(([level, callers]) => (
                        <div key={level}>
                          <h4 className="text-xs font-semibold text-gray-400 mb-2">
                            間接影響 レベル{level} ({callers.length}件)
                          </h4>
                          <div className="space-y-1">
                            {callers.slice(0, 3).map((caller) => (
                              <button
                                key={caller.id}
                                type="button"
                                onClick={() => onSelectItem(caller.id)}
                                className="w-full text-left px-2 py-1 text-xs bg-gray-800 hover:bg-gray-750 rounded transition-colors"
                              >
                                <span className="text-purple-400">{caller.name}</span>
                                <span className="text-gray-600 ml-2">
                                  {caller.file}:{caller.line}
                                </span>
                              </button>
                            ))}
                            {callers.length > 3 && (
                              <p className="text-xs text-gray-500 px-2">
                                ...他 {callers.length - 3}件
                              </p>
                            )}
                          </div>
                        </div>
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
