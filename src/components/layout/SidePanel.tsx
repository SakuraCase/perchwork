/**
 * SidePanel.tsx
 *
 * 開閉可能な左サイドパネルコンポーネント
 * ノード詳細表示用のパネルを提供する
 */
import type { ReactNode } from "react";

interface SidePanelProps {
  /** パネルが開いているかどうか */
  isOpen: boolean;
  /** 開閉トグルハンドラ */
  onToggle: () => void;
  /** パネル内のコンテンツ */
  children: ReactNode;
}

/**
 * 左サイドパネル
 * @param props - サイドパネルのプロパティ
 */
export function SidePanel({ isOpen, onToggle, children }: SidePanelProps) {
  if (!isOpen) {
    // 閉じた状態：開くボタンのみ表示
    return (
      <div className="flex items-start bg-stone-800 border-r border-stone-700">
        <button
          onClick={onToggle}
          className="p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-700"
          title="パネルを開く"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    );
  }

  // 開いた状態：パネル全体を表示
  return (
    <aside className="w-[30%] min-w-[300px] max-w-[500px] flex flex-col bg-stone-800 border-r border-stone-700 overflow-hidden">
      {/* ヘッダー：閉じるボタン */}
      <div className="flex justify-start p-2 border-b border-stone-700">
        <button
          onClick={onToggle}
          className="p-1 text-stone-400 hover:text-stone-200 hover:bg-stone-700 rounded"
          title="パネルを閉じる"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-auto">{children}</div>
    </aside>
  );
}
