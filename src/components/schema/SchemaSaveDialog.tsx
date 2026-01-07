/**
 * SchemaSaveDialog - スキーマ設定保存ダイアログ
 *
 * 名前を入力して新規保存、または既存の保存を上書き
 */

import { useState, useEffect, useRef } from 'react';

import type { SavedSchemaSettings } from '@/types/schemaGraph';

// ============================================
// Props定義
// ============================================

export interface SchemaSaveDialogProps {
  /** ダイアログの表示状態 */
  isOpen: boolean;
  /** 既存の保存済み設定 */
  existingSaves: SavedSchemaSettings[];
  /** 確定時のコールバック（idがあれば上書き、なければ新規） */
  onConfirm: (name: string, existingId?: string) => void;
  /** キャンセル時のコールバック */
  onCancel: () => void;
}

// ============================================
// メインコンポーネント
// ============================================

export function SchemaSaveDialog({
  isOpen,
  existingSaves,
  onConfirm,
  onCancel,
}: SchemaSaveDialogProps) {
  const [name, setName] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // ダイアログが開いたら初期化
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset state when dialog opens
      setName('');
      setSelectedId(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

  // Escキーでダイアログを閉じる
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  // ダイアログ外クリックで閉じる
  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen, onCancel]);

  const handleSelectExisting = (save: SavedSchemaSettings) => {
    setSelectedId(save.id);
    setName(save.name);
  };

  const handleClearSelection = () => {
    setSelectedId(null);
    setName('');
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onConfirm(name.trim(), selectedId ?? undefined);
  };

  if (!isOpen) return null;

  const isOverwrite = selectedId !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={dialogRef}
        className="bg-stone-800 border border-stone-600 rounded-lg shadow-lg w-[400px] max-h-[80vh] flex flex-col"
      >
        {/* ヘッダー */}
        <div className="px-4 py-3 border-b border-stone-700">
          <h2 className="text-sm font-semibold text-stone-100">スキーマ設定を保存</h2>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-4 py-4 space-y-4 overflow-y-auto flex-1">
            {/* 既存の保存一覧 */}
            {existingSaves.length > 0 && (
              <div>
                <label className="block text-xs text-stone-400 mb-2">
                  上書き保存（選択すると上書き）
                </label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {existingSaves.map((save) => (
                    <button
                      key={save.id}
                      type="button"
                      onClick={() => handleSelectExisting(save)}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                        selectedId === save.id
                          ? 'bg-orange-600 text-white'
                          : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                      }`}
                    >
                      <div className="truncate">{save.name}</div>
                      <div className="text-xs opacity-70">
                        {new Date(save.updatedAt).toLocaleString('ja-JP')}
                      </div>
                    </button>
                  ))}
                </div>
                {selectedId && (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="mt-2 text-xs text-stone-400 hover:text-stone-300"
                  >
                    選択を解除して新規保存
                  </button>
                )}
              </div>
            )}

            {/* 名前入力 */}
            <div>
              <label
                htmlFor="schema-save-name-input"
                className="block text-xs text-stone-400 mb-1"
              >
                {isOverwrite ? '保存名（変更可）' : '新規保存名'}
              </label>
              <input
                ref={inputRef}
                id="schema-save-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-stone-700 text-stone-100 border border-stone-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="保存名を入力"
              />
            </div>
          </div>

          {/* ボタン */}
          <div className="flex justify-end gap-2 px-4 py-3 border-t border-stone-700">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-stone-300 bg-stone-700 border border-stone-600 rounded hover:bg-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className={`px-4 py-2 text-sm text-white border rounded focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                isOverwrite
                  ? 'bg-yellow-600 border-yellow-500 hover:bg-yellow-500 focus:ring-yellow-500'
                  : 'bg-orange-600 border-orange-500 hover:bg-orange-500 focus:ring-orange-500'
              }`}
            >
              {isOverwrite ? '上書き保存' : '新規保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
