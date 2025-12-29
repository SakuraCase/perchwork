/**
 * DetailPanel コンポーネント
 *
 * 選択されたファイルとアイテムの詳細を表示するパネル。
 * 未選択時はプレースホルダー、ファイル選択時はアイテム一覧、
 * アイテム選択時は詳細情報を表示する。
 */

import type { SourceFile, ItemId } from '@/types/schema';
import { ItemSummary } from './ItemSummary';

interface DetailPanelProps {
  /** 選択されたソースファイル（null = 未選択） */
  file: SourceFile | null;
  /** 選択されたアイテムID（null = 未選択） */
  selectedItemId: ItemId | null;
  /** アイテム選択時のコールバック */
  onSelectItem: (id: ItemId) => void;
}

/**
 * DetailPanelコンポーネント
 *
 * 3つの状態を管理:
 * 1. ファイル未選択 → プレースホルダー表示
 * 2. ファイル選択済み、アイテム未選択 → アイテム一覧表示
 * 3. アイテム選択済み → ItemSummary表示
 */
export function DetailPanel({
  file,
  selectedItemId,
  onSelectItem
}: DetailPanelProps) {
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

  // アイテム選択済み: ItemSummary表示
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
          <ItemSummary item={selectedItem} />
        </div>
      </div>
    );
  }

  // ファイル選択済み、アイテム未選択: アイテム一覧表示
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

        {/* アイテム一覧 */}
        {file.items.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>このファイルにはアイテムがありません</p>
          </div>
        ) : (
          <div className="space-y-2">
            {file.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectItem(item.id)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded hover:bg-gray-750 hover:border-gray-600 transition-colors text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                  {/* アイテム名 */}
                  <span className="font-semibold text-gray-200">{item.name}</span>
                  {/* タイプバッジ */}
                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-700 text-gray-400 rounded">
                    {item.type}
                  </span>
                  {/* 可視性バッジ */}
                  {item.visibility && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-700 text-gray-400 rounded">
                      {item.visibility}
                    </span>
                  )}
                </div>
                {/* 概要 */}
                <p className="text-sm text-gray-400 line-clamp-2">{item.summary}</p>
                {/* 行番号 */}
                <p className="text-xs text-gray-600 mt-1">
                  L{item.line}
                  {item.end_line && ` - L${item.end_line}`}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
