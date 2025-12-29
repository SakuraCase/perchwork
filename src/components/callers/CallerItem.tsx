/**
 * CallerItem コンポーネント
 *
 * 個々の Caller を表示するコンポーネント。
 * Caller の名前、ファイル、行番号を表示し、クリック可能。
 */

import type { Caller } from '@/types/callers';

interface CallerItemProps {
  /** Caller データ */
  caller: Caller;
  /** クリック時のコールバック */
  onClick?: () => void;
}

/**
 * CallerItemコンポーネント
 *
 * 個々の Caller を表示し、クリックで詳細を表示できるようにする。
 */
export function CallerItem({ caller, onClick }: CallerItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-800 transition-colors rounded"
    >
      {/* Caller 名 */}
      <div className="flex items-center gap-2 mb-1">
        <span className="font-semibold text-gray-200">{caller.name}</span>
      </div>

      {/* 呼び出し位置（ファイル:行番号） */}
      <div className="text-xs text-gray-500">
        {caller.callSite.file}:{caller.callSite.line}
      </div>
    </button>
  );
}
