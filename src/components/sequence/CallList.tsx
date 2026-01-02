/**
 * CallList - 呼び出し一覧コンポーネント
 *
 * 役割:
 *   - シーケンス図内の呼び出しを一覧表示
 *   - チェックボックスで複数選択
 *   - 編集状態（グループ、省略、ラベル編集、Note）の視覚的表示
 */

import { useCallback, useRef } from 'react';
import type { CallInfo, CallEntryId, SequenceEditState } from '../../types/sequence';
import { generateCallEntryId } from '../../types/sequence';
import { extractDisplayName } from '../../services/mermaidGenerator';

// ============================================
// Props定義
// ============================================

export interface CallListProps {
  /** 呼び出しリスト */
  calls: CallInfo[];
  /** 編集状態 */
  editState: SequenceEditState;
  /** 選択中の呼び出しID */
  selectedCallIds: Set<CallEntryId>;
  /** 選択トグル */
  onToggleSelection: (callEntryId: CallEntryId) => void;
  /** 範囲選択 */
  onSelectRange: (startIndex: number, endIndex: number) => void;
  /** 選択クリア */
  onClearSelection: () => void;
  /** ラベル編集（ダブルクリック） */
  onEditLabel?: (callEntryId: CallEntryId) => void;
}

// ============================================
// ヘルパー関数
// ============================================

/**
 * 呼び出しの編集状態を取得
 */
function getCallEditStatus(callEntryId: CallEntryId, editState: SequenceEditState) {
  const isGrouped = editState.groups.some((g) => g.callEntryIds.includes(callEntryId));
  const isOmitted = editState.omissions.some((o) => o.callEntryIds.includes(callEntryId));
  const hasLabelEdit = editState.labelEdits.some((l) => l.callEntryId === callEntryId);

  return { isGrouped, isOmitted, hasLabelEdit };
}

// ============================================
// メインコンポーネント
// ============================================

export function CallList({
  calls,
  editState,
  selectedCallIds,
  onToggleSelection,
  onSelectRange,
  onClearSelection,
  onEditLabel,
}: CallListProps) {
  const lastSelectedIndexRef = useRef<number | null>(null);

  /**
   * クリックハンドラ（Shift対応）
   */
  const handleClick = useCallback(
    (index: number, callEntryId: CallEntryId, event: React.MouseEvent) => {
      if (event.shiftKey && lastSelectedIndexRef.current !== null) {
        // Shift + クリック: 範囲選択
        const start = Math.min(lastSelectedIndexRef.current, index);
        const end = Math.max(lastSelectedIndexRef.current, index);
        onSelectRange(start, end);
      } else {
        // 通常クリック: トグル
        onToggleSelection(callEntryId);
        lastSelectedIndexRef.current = index;
      }
    },
    [onToggleSelection, onSelectRange]
  );

  /**
   * ダブルクリックハンドラ（ラベル編集）
   */
  const handleDoubleClick = useCallback(
    (callEntryId: CallEntryId) => {
      onEditLabel?.(callEntryId);
    },
    [onEditLabel]
  );

  if (calls.length === 0) {
    return (
      <div className="text-sm text-gray-500 p-2">
        呼び出しがありません
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-2 py-1 text-xs text-gray-400">
        <span>呼び出し一覧 ({calls.length}件)</span>
        {selectedCallIds.size > 0 && (
          <button
            onClick={onClearSelection}
            className="text-blue-400 hover:text-blue-300"
          >
            選択解除 ({selectedCallIds.size})
          </button>
        )}
      </div>

      {/* 呼び出しリスト */}
      <div className="max-h-64 overflow-y-auto border border-gray-700 rounded">
        {calls.map((call, index) => {
          const callEntryId = generateCallEntryId(call);
          const isSelected = selectedCallIds.has(callEntryId);
          const status = getCallEditStatus(callEntryId, editState);

          return (
            <div
              key={callEntryId}
              onClick={(e) => handleClick(index, callEntryId, e)}
              onDoubleClick={() => handleDoubleClick(callEntryId)}
              className={`
                flex items-center gap-2 px-2 py-1 cursor-pointer text-sm
                border-b border-gray-800 last:border-b-0
                ${isSelected ? 'bg-blue-900/50' : 'hover:bg-gray-800'}
                ${status.isOmitted ? 'opacity-50 line-through' : ''}
                ${status.isGrouped ? 'border-l-2 border-l-purple-500' : ''}
              `}
              title={`${extractDisplayName(call.from)} → ${extractDisplayName(call.to)} (行${call.line})`}
            >
              {/* チェックボックス */}
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelection(callEntryId)}
                onClick={(e) => e.stopPropagation()}
                className="w-3 h-3 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-1 focus:ring-blue-500"
              />

              {/* 呼び出し情報 */}
              <span className="flex-1 truncate font-mono text-xs">
                <span className="text-gray-400">{extractDisplayName(call.from)}</span>
                <span className="text-gray-500 mx-1">→</span>
                <span className="text-blue-400">{extractDisplayName(call.to)}</span>
              </span>

              {/* ステータスアイコン */}
              <div className="flex items-center gap-1 text-xs">
                {status.isGrouped && (
                  <span title="グループ化済み" className="text-purple-400">📦</span>
                )}
                {status.isOmitted && (
                  <span title="省略" className="text-gray-400">⋯</span>
                )}
                {status.hasLabelEdit && (
                  <span title="ラベル編集済み" className="text-yellow-400">✏️</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
