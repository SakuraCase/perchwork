/**
 * SequenceToolbar - シーケンス図のツールバー
 *
 * 役割:
 *   - Mermaidコードをクリップボードにコピー
 *   - 編集状態を名前付きで保存
 *   - 保存済みシーケンスを開く
 */

import { useState, useCallback } from 'react';

// ============================================
// Props定義
// ============================================

export interface SequenceToolbarProps {
  /** Mermaidコード */
  mermaidCode: string | null;
  /** 保存ダイアログを開く */
  onSave: () => void;
  /** 開くダイアログを開く */
  onOpen: () => void;
  /** 未保存の変更があるか */
  hasUnsavedChanges: boolean;
  /** 保存が無効か（起点関数が未選択など） */
  saveDisabled?: boolean;
  /** 保存済みシーケンスがあるか */
  hasSavedSequences: boolean;
}

// ============================================
// メインコンポーネント
// ============================================

export function SequenceToolbar({
  mermaidCode,
  onSave,
  onOpen,
  hasUnsavedChanges,
  saveDisabled = false,
  hasSavedSequences,
}: SequenceToolbarProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  /**
   * Mermaidコードをクリップボードにコピー
   * インデックスマーカー[[idx:N]]は削除してからコピー
   */
  const handleCopyMermaid = useCallback(async () => {
    if (!mermaidCode) return;

    try {
      // マーカーを削除してからコピー
      const cleanCode = mermaidCode.replace(/\[\[idx:\d+\]\]/g, '');
      await navigator.clipboard.writeText(cleanCode);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  }, [mermaidCode]);

  return (
    <div className="flex items-center gap-2 p-2 border-b border-stone-700">
      {/* コピーボタン */}
      <button
        onClick={handleCopyMermaid}
        disabled={!mermaidCode}
        className={`
          px-3 py-1 text-sm rounded border focus:outline-none focus:ring-2 focus:ring-orange-500
          ${
            !mermaidCode
              ? 'bg-stone-800 text-stone-500 border-stone-700 cursor-not-allowed'
              : copyStatus === 'copied'
              ? 'bg-green-800 text-green-200 border-green-600'
              : copyStatus === 'error'
              ? 'bg-red-800 text-red-200 border-red-600'
              : 'bg-stone-700 text-stone-100 border-stone-600 hover:bg-stone-600'
          }
        `}
        aria-label="Mermaidコードをコピー"
        title="Mermaidコードをクリップボードにコピー"
      >
        {copyStatus === 'copied' ? '✓' : copyStatus === 'error' ? '✕' : '📋'}
      </button>

      {/* 保存ボタン */}
      <button
        onClick={onSave}
        disabled={saveDisabled}
        className={`
          px-3 py-1 text-sm rounded border focus:outline-none focus:ring-2 focus:ring-orange-500
          ${
            saveDisabled
              ? 'bg-stone-800 text-stone-500 border-stone-700 cursor-not-allowed'
              : 'bg-stone-700 text-stone-100 border-stone-600 hover:bg-stone-600'
          }
        `}
        aria-label="保存"
        title="名前を付けて保存"
      >
        💾
        {hasUnsavedChanges && !saveDisabled && (
          <span className="ml-1 text-yellow-400">●</span>
        )}
      </button>

      {/* 開くボタン */}
      <button
        onClick={onOpen}
        disabled={!hasSavedSequences}
        className={`
          px-3 py-1 text-sm rounded border focus:outline-none focus:ring-2 focus:ring-orange-500
          ${
            !hasSavedSequences
              ? 'bg-stone-800 text-stone-500 border-stone-700 cursor-not-allowed'
              : 'bg-stone-700 text-stone-100 border-stone-600 hover:bg-stone-600'
          }
        `}
        aria-label="開く"
        title="保存済みシーケンスを開く"
      >
        📂
      </button>
    </div>
  );
}
