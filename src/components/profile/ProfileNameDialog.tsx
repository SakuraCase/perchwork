/**
 * ProfileNameDialog - プロファイル名編集ダイアログ
 *
 * プロファイルの新規作成や名前変更に使用するモーダルダイアログ
 */

import { useState, useEffect, useRef } from 'react';

// ============================================
// Props定義
// ============================================

export interface ProfileNameDialogProps {
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

export function ProfileNameDialog({
  isOpen,
  mode,
  currentName = '',
  onConfirm,
  onCancel,
}: ProfileNameDialogProps) {
  const [name, setName] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // ダイアログが開いたら初期値をセットしてフォーカス
  useEffect(() => {
    if (isOpen) {
      // ダイアログ開閉時の状態リセットは意図的
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // ============================================
  // イベントハンドラ
  // ============================================

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onConfirm(name.trim());
  };

  // ============================================
  // レンダリング
  // ============================================

  if (!isOpen) return null;

  const title = mode === 'create' ? '新規プロファイル' : 'プロファイル名を編集';
  const confirmLabel = mode === 'create' ? '作成' : '保存';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={dialogRef}
        className="bg-gray-800 border border-gray-600 rounded-lg shadow-lg w-[320px]"
      >
        {/* ヘッダー */}
        <div className="px-4 py-3 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-gray-100">{title}</h2>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
          {/* プロファイル名入力 */}
          <div>
            <label
              htmlFor="profile-name-input"
              className="block text-xs text-gray-400 mb-1"
            >
              プロファイル名
            </label>
            <input
              ref={inputRef}
              id="profile-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-700 text-gray-100 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="プロファイル名を入力"
            />
          </div>

          {/* ボタン */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-300 bg-gray-700 border border-gray-600 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 text-sm text-white bg-blue-600 border border-blue-500 rounded hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
