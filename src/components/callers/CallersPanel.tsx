/**
 * CallersPanel コンポーネント
 *
 * Callers 一覧パネル。
 * フラット一覧とツリー表示を切り替え可能。
 * useCallersフックを使用してデータを管理。
 */

import { useState } from 'react';
import type { ItemId } from '@/types/schema';
import type { CallersIndex } from '@/types/callers';
import { useCallers } from '@/hooks/useCallers';
import { CallerItem } from './CallerItem';
import { CallersTree } from './CallersTree';

interface CallersPanelProps {
  /** 対象アイテムID */
  targetId: ItemId | null;
  /** 対象アイテム名 */
  targetName: string;
  /** Callers インデックス */
  callersIndex: CallersIndex | null;
  /** Caller選択時のコールバック */
  onSelectCaller: (callerId: ItemId) => void;
}

/**
 * CallersPanelコンポーネント
 *
 * Callers の一覧とツリー表示を提供。
 * タブで表示モードを切り替え可能。
 */
export function CallersPanel({
  targetId,
  targetName,
  callersIndex,
  onSelectCaller
}: CallersPanelProps) {
  // 表示モード（'list' または 'tree'）
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');

  // useCallers フックでデータを取得
  const {
    callers,
    callersTree,
    isLoading,
    error,
    totalCount,
    toggleExpand
  } = useCallers(targetId, callersIndex);

  // 対象が選択されていない場合
  if (!targetId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <p className="text-lg mb-2">アイテムが選択されていません</p>
          <p className="text-sm">アイテムを選択してください</p>
        </div>
      </div>
    );
  }

  // 読み込み中
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  // エラー時
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">
          <p className="text-lg mb-2">エラー</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Callers がない場合
  const hasCallers = totalCount > 0;

  return (
    <div className="h-full flex flex-col">
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-gray-700">
        <h2 className="text-xl font-bold text-gray-100 mb-2">
          Callers of `{targetName}`
        </h2>
        <p className="text-sm text-gray-500">
          {hasCallers
            ? `${totalCount} 件の呼び出し元`
            : 'この関数を呼んでいる関数はありません（エントリポイント）'}
        </p>
      </div>

      {/* Callers がある場合のみタブとコンテンツを表示 */}
      {hasCallers && (
        <>
          {/* タブ */}
          <div className="flex border-b border-gray-700">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'text-gray-100 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              フラット一覧
            </button>
            <button
              type="button"
              onClick={() => setViewMode('tree')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'tree'
                  ? 'text-gray-100 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              ツリー表示
            </button>
          </div>

          {/* コンテンツ */}
          <div className="flex-1 overflow-y-auto">
            {viewMode === 'list' ? (
              // フラット一覧
              <div className="p-4 space-y-2">
                {callers.map((caller) => (
                  <CallerItem
                    key={caller.id}
                    caller={caller}
                    onClick={() => onSelectCaller(caller.id)}
                  />
                ))}
              </div>
            ) : (
              // ツリー表示
              <div className="p-4">
                {callersTree && callersTree.children.length > 0 ? (
                  callersTree.children.map((child) => (
                    <CallersTree
                      key={child.caller.id}
                      node={child}
                      onSelectCaller={onSelectCaller}
                      onToggleExpand={toggleExpand}
                    />
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <p>ツリーデータがありません</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
