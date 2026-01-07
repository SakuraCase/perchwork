/**
 * GroupDialog - グループ作成/編集ダイアログ
 *
 * グループ名を入力するモーダルダイアログ
 */

import { useState, useEffect, useRef } from 'react';

// ============================================
// Props定義
// ============================================

export interface GroupDialogProps {
  /** ダイアログの表示状態 */
  isOpen: boolean;
  /** モード: 'create' = 新規作成, 'edit' = 名前編集 */
  mode: 'create' | 'edit';
  /** 編集時の現在の名前 */
  currentName?: string;
  /** 確定時のコールバック */
  onConfirm: (name: string) => void;
  /** キャンセル時のコールバック */
  onCancel: () => void;
}

// ============================================
// メインコンポーネント
// ============================================

export function GroupDialog({
  isOpen,
  mode,
  currentName = '',
  onConfirm,
  onCancel,
}: GroupDialogProps) {
  const [name, setName] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // ダイアログが開いたら初期値をセットしてフォーカス
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset state when dialog opens
      setName(currentName);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [isOpen, currentName]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onConfirm(name.trim());
  };

  if (!isOpen) return null;

  const title = mode === 'create' ? 'グループを作成' : 'グループ名を編集';
  const confirmLabel = mode === 'create' ? '作成' : '保存';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={dialogRef}
        className="bg-stone-800 border border-stone-600 rounded-lg shadow-lg w-[320px]"
      >
        {/* ヘッダー */}
        <div className="px-4 py-3 border-b border-stone-700">
          <h2 className="text-sm font-semibold text-stone-100">{title}</h2>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
          <div>
            <label
              htmlFor="group-name-input"
              className="block text-xs text-stone-400 mb-1"
            >
              グループ名
            </label>
            <input
              ref={inputRef}
              id="group-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-stone-700 text-stone-100 border border-stone-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="グループ名を入力"
            />
          </div>

          {/* ヒント */}
          <p className="text-xs text-stone-500">
            グループ化すると、選択した呼び出しがrectブロックで囲まれます
          </p>

          {/* ボタン */}
          <div className="flex justify-end gap-2 pt-2">
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
              className="px-4 py-2 text-sm text-white bg-purple-600 border border-purple-500 rounded hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
