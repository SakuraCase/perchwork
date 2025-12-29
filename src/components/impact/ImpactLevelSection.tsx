/**
 * ImpactLevelSection コンポーネント
 *
 * 影響レベルごとのセクションを表示するコンポーネント。
 * 直接影響、間接影響（レベル別）を折りたたみ可能な形式で表示する。
 */

import { useState } from 'react';
import type { ItemId } from '@/types/schema';
import type { Caller } from '@/types/callers';
import { CallerItem } from '@/components/callers/CallerItem';

interface ImpactLevelSectionProps {
  /** セクションのタイトル（例: "直接影響"） */
  title: string;
  /** Callerの一覧 */
  callers: Caller[];
  /** アイテム選択時のコールバック */
  onSelectItem: (id: ItemId) => void;
  /** デフォルトで展開するかどうか */
  defaultExpanded?: boolean;
}

/**
 * ImpactLevelSectionコンポーネント
 *
 * 影響レベルごとに Caller のリストを折りたたみ可能な形式で表示。
 * CallerItem を再利用して一貫性のある UI を提供する。
 */
export function ImpactLevelSection({
  title,
  callers,
  onSelectItem,
  defaultExpanded = true,
}: ImpactLevelSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (callers.length === 0) {
    return null;
  }

  return (
    <div className="border border-gray-700 rounded overflow-hidden">
      {/* ヘッダー（折りたたみトグル） */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-750 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          {/* 展開アイコン */}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isExpanded ? 'rotate-90' : ''
            }`}
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
          {/* タイトルと件数 */}
          <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
          <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-xs font-medium rounded border border-blue-600/30">
            {callers.length}
          </span>
        </div>
      </button>

      {/* Callerリスト */}
      {isExpanded && (
        <div className="bg-gray-850 border-t border-gray-700">
          <div className="max-h-96 overflow-y-auto">
            <div className="p-2 space-y-1">
              {callers.map((caller) => (
                <CallerItem
                  key={caller.id}
                  caller={caller}
                  onClick={() => onSelectItem(caller.id)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
