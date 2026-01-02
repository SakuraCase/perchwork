/**
 * ProfileDeleteConfirm - プロファイル削除確認ダイアログ
 *
 * プロファイル削除前の確認モーダルダイアログ
 */

import { useEffect, useRef } from 'react';

// ============================================
// Props定義
// ============================================

export interface ProfileDeleteConfirmProps {
  /** ダイアログの表示状態 */
  isOpen: boolean;

  /** 削除対象のプロファイル名 */
  profileName: string;

  /** 確定時のコールバック */
  onConfirm: () => void;

  /** キャンセル時のコールバック */
  onCancel: () => void;
}

// ============================================
// メインコンポーネント
// ============================================

export function ProfileDeleteConfirm({
  isOpen,
  profileName,
  onConfirm,
  onCancel,
}: ProfileDeleteConfirmProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // ダイアログが開いたらキャンセルボタンにフォーカス
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        cancelButtonRef.current?.focus();
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

  // ============================================
  // レンダリング
  // ============================================

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={dialogRef}
        className="bg-gray-800 border border-gray-600 rounded-lg shadow-lg w-[360px]"
      >
        {/* ヘッダー */}
        <div className="px-4 py-3 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-gray-100">
            プロファイルを削除
          </h2>
        </div>

        {/* コンテンツ */}
        <div className="px-4 py-4 space-y-3">
          <p className="text-sm text-gray-200">
            「<span className="font-medium text-white">{profileName}</span>」を削除しますか？
          </p>
          <p className="text-xs text-gray-400">
            この操作は取り消せません。プロファイルに含まれるすべての設定が失われます。
          </p>
        </div>

        {/* ボタン */}
        <div className="px-4 py-3 border-t border-gray-700 flex justify-end gap-2">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-300 bg-gray-700 border border-gray-600 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm text-white bg-red-600 border border-red-500 rounded hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
}
