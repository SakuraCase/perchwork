/**
 * GraphOpenDialog - グラフ設定開くダイアログ
 *
 * 保存済みグラフ設定一覧から選択して開く、または削除する
 */

import { useState, useEffect, useRef } from 'react';

import type { SavedGraphSettings } from '@/types/graph';

// ============================================
// Props定義
// ============================================

export interface GraphOpenDialogProps {
  /** ダイアログの表示状態 */
  isOpen: boolean;
  /** 保存済みグラフ設定一覧 */
  savedSettings: SavedGraphSettings[];
  /** 選択時のコールバック */
  onSelect: (saved: SavedGraphSettings) => void;
  /** 削除時のコールバック */
  onDelete: (id: string) => void;
  /** キャンセル時のコールバック */
  onCancel: () => void;
}

// ============================================
// 削除確認ダイアログ
// ============================================

interface DeleteConfirmProps {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirm({ name, onConfirm, onCancel }: DeleteConfirmProps) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
      <div className="bg-gray-800 border border-gray-600 rounded-lg shadow-lg w-[300px] p-4">
        <p className="text-sm text-gray-200 mb-4">
          「{name}」を削除しますか？
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-gray-300 bg-gray-700 border border-gray-600 rounded hover:bg-gray-600"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3 py-1.5 text-sm text-white bg-red-600 border border-red-500 rounded hover:bg-red-500"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// メインコンポーネント
// ============================================

export function GraphOpenDialog({
  isOpen,
  savedSettings,
  onSelect,
  onDelete,
  onCancel,
}: GraphOpenDialogProps) {
  const [deleteTarget, setDeleteTarget] = useState<SavedGraphSettings | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // ダイアログが開いたら削除対象をリセット
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset state when dialog opens
      setDeleteTarget(null);
    }
  }, [isOpen]);

  // Escキーでダイアログを閉じる
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteTarget) {
          setDeleteTarget(null);
        } else {
          onCancel();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, deleteTarget]);

  // ダイアログ外クリックで閉じる
  useEffect(() => {
    if (!isOpen || deleteTarget) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        onCancel();
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onCancel, deleteTarget]);

  const handleDeleteClick = (e: React.MouseEvent, saved: SavedGraphSettings) => {
    e.stopPropagation();
    setDeleteTarget(saved);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      onDelete(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div
          ref={dialogRef}
          className="bg-gray-800 border border-gray-600 rounded-lg shadow-lg w-[400px] max-h-[80vh] flex flex-col"
        >
          {/* ヘッダー */}
          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-100">保存済みグラフ設定を開く</h2>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-200"
              aria-label="閉じる"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* コンテンツ */}
          <div className="flex-1 overflow-y-auto p-4">
            {savedSettings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>保存済みグラフ設定がありません</p>
              </div>
            ) : (
              <div className="space-y-2">
                {savedSettings.map((saved) => (
                  <div
                    key={saved.id}
                    className="group flex items-center gap-2 p-3 bg-gray-700 rounded hover:bg-gray-600 cursor-pointer transition-colors"
                    onClick={() => onSelect(saved)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-100 truncate">{saved.name}</div>
                      <div className="text-xs text-gray-400 truncate">
                        レイアウト: {saved.settings.layout.type}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(saved.updatedAt).toLocaleString('ja-JP')}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteClick(e, saved)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 transition-opacity"
                      aria-label={`${saved.name}を削除`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 削除確認ダイアログ */}
      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
