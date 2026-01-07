/**
 * LabelEditDialog - ラベル編集ダイアログ
 *
 * 呼び出し矢印のラベルをカスタマイズするダイアログ
 */

import { useState, useEffect, useRef } from 'react';

// ============================================
// Props定義
// ============================================

export interface LabelEditDialogProps {
  /** ダイアログの表示状態 */
  isOpen: boolean;
  /** 元のラベル（自動生成） */
  originalLabel: string;
  /** 現在のカスタムラベル */
  currentLabel: string;
  /** 確定時のコールバック */
  onConfirm: (label: string) => void;
  /** キャンセル時のコールバック */
  onCancel: () => void;
  /** リセット（元に戻す）時のコールバック */
  onReset: () => void;
}

// ============================================
// メインコンポーネント
// ============================================

export function LabelEditDialog({
  isOpen,
  originalLabel,
  currentLabel,
  onConfirm,
  onCancel,
  onReset,
}: LabelEditDialogProps) {
  const [label, setLabel] = useState(currentLabel || originalLabel);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // ダイアログが開いたら初期値をセットしてフォーカス
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset state when dialog opens
      setLabel(currentLabel || originalLabel);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [isOpen, currentLabel, originalLabel]);

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
    if (!label.trim()) return;
    onConfirm(label.trim());
  };

  const handleReset = () => {
    setLabel(originalLabel);
    onReset();
  };

  if (!isOpen) return null;

  const isCustomized = label !== originalLabel;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={dialogRef}
        className="bg-stone-800 border border-stone-600 rounded-lg shadow-lg w-[400px]"
      >
        {/* ヘッダー */}
        <div className="px-4 py-3 border-b border-stone-700">
          <h2 className="text-sm font-semibold text-stone-100">ラベルを編集</h2>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
          {/* 元のラベル */}
          <div>
            <label className="block text-xs text-stone-400 mb-1">
              元のラベル
            </label>
            <div className="px-3 py-2 bg-stone-900 border border-stone-700 rounded text-sm text-stone-400 font-mono">
              {originalLabel}
            </div>
          </div>

          {/* カスタムラベル */}
          <div>
            <label
              htmlFor="label-input"
              className="block text-xs text-stone-400 mb-1"
            >
              カスタムラベル
            </label>
            <textarea
              ref={inputRef}
              id="label-input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              rows={3}
              className="w-full bg-stone-700 text-stone-100 border border-stone-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono resize-none"
              placeholder="カスタムラベルを入力"
            />
          </div>

          {/* ヒント */}
          <p className="text-xs text-stone-500">
            改行は &lt;br/&gt; に変換されます
          </p>

          {/* ボタン */}
          <div className="flex justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={!isCustomized}
              className="px-4 py-2 text-sm text-stone-300 bg-stone-700 border border-stone-600 rounded hover:bg-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              元に戻す
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm text-stone-300 bg-stone-700 border border-stone-600 rounded hover:bg-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={!label.trim()}
                className="px-4 py-2 text-sm text-white bg-yellow-600 border border-yellow-500 rounded hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
