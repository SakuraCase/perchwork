/**
 * CollapsibleSection コンポーネント
 *
 * 折りたたみ可能なセクションを提供する。
 * タイトル、カウント、展開アイコンを含むヘッダーと、
 * 展開時に表示されるコンテンツを持つ。
 */

import { type ReactNode } from 'react';

interface CollapsibleSectionProps {
  /** セクションのタイトル */
  title: string;
  /** カウント表示（任意） */
  count?: number;
  /** カウントの単位（デフォルト: '件'） */
  countUnit?: string;
  /** 展開状態 */
  expanded: boolean;
  /** 展開状態変更時のコールバック */
  onToggle: () => void;
  /** セクションのコンテンツ */
  children: ReactNode;
  /** ローディング中かどうか */
  isLoading?: boolean;
  /** ローディング中のテキスト */
  loadingText?: string;
  /** 追加のクラス名 */
  className?: string;
}

/**
 * 折りたたみ可能なセクションコンポーネント
 */
export function CollapsibleSection({
  title,
  count,
  countUnit = '件',
  expanded,
  onToggle,
  children,
  isLoading = false,
  loadingText = '読み込み中...',
  className = '',
}: CollapsibleSectionProps) {
  return (
    <div className={className}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-stone-800 hover:bg-stone-750 rounded transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-stone-200">{title}</span>
          {isLoading ? (
            <span className="text-xs text-stone-500">{loadingText}</span>
          ) : count !== undefined ? (
            <span className="text-xs text-stone-500">
              ({count}
              {countUnit})
            </span>
          ) : null}
        </div>
        <svg
          className={`w-5 h-5 text-stone-400 transition-transform ${
            expanded ? 'rotate-180' : ''
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

      {expanded && <div className="mt-2">{children}</div>}
    </div>
  );
}
