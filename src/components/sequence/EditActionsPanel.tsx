/**
 * EditActionsPanel - 編集アクションパネル
 *
 * 役割:
 *   - 選択された呼び出しに対する編集アクションボタンを表示
 *   - グループ化、省略、Note追加
 */

import type { CallEntryId, CallInfo, SequenceEditState } from '../../types/sequence';
import { generateCallEntryId } from '../../types/sequence';

// ============================================
// Props定義
// ============================================

export interface EditActionsPanelProps {
  /** 選択中の呼び出しID */
  selectedCallIds: Set<CallEntryId>;
  /** 全呼び出しリスト（連続性チェック用） */
  calls: CallInfo[];
  /** 編集状態（グループ済みチェック用） */
  editState: SequenceEditState;
  /** グループ化アクション */
  onCreateGroup: () => void;
  /** 省略アクション */
  onOmit: () => void;
  /** 選択解除アクション */
  onClearSelection: () => void;
}

// ============================================
// ヘルパー関数
// ============================================

/**
 * 選択された呼び出しが連続しているかチェック
 */
function areSelectionsConsecutive(
  selectedCallIds: Set<CallEntryId>,
  calls: CallInfo[]
): boolean {
  if (selectedCallIds.size <= 1) return true;

  const callEntryIds = calls.map(generateCallEntryId);
  const selectedIndices = callEntryIds
    .map((id, index) => (selectedCallIds.has(id) ? index : -1))
    .filter((index) => index !== -1)
    .sort((a, b) => a - b);

  for (let i = 1; i < selectedIndices.length; i++) {
    if (selectedIndices[i] - selectedIndices[i - 1] !== 1) {
      return false;
    }
  }

  return true;
}

/**
 * 選択された呼び出しに既にグループ化済みのものが含まれているかチェック
 */
function hasGroupedCalls(
  selectedCallIds: Set<CallEntryId>,
  editState: SequenceEditState
): boolean {
  for (const id of selectedCallIds) {
    if (editState.groups.some((g) => g.callEntryIds.includes(id))) {
      return true;
    }
  }
  return false;
}

// ============================================
// メインコンポーネント
// ============================================

export function EditActionsPanel({
  selectedCallIds,
  calls,
  editState,
  onCreateGroup,
  onOmit,
  onClearSelection,
}: EditActionsPanelProps) {
  const hasSelection = selectedCallIds.size > 0;
  const isConsecutive = areSelectionsConsecutive(selectedCallIds, calls);
  const hasAlreadyGrouped = hasGroupedCalls(selectedCallIds, editState);
  const canGroup = selectedCallIds.size >= 2 && isConsecutive && !hasAlreadyGrouped;
  const canOmit = hasSelection;

  return (
    <div className="space-y-2 p-2">
      {/* 選択情報 */}
      <div className="flex items-center justify-between text-xs text-gray-400 min-h-[20px]">
        {hasSelection ? (
          <>
            <span>{selectedCallIds.size}件選択中</span>
            <button
              onClick={onClearSelection}
              className="text-blue-400 hover:text-blue-300"
            >
              解除
            </button>
          </>
        ) : (
          <span className="text-gray-500">呼び出しを選択してください</span>
        )}
      </div>

      {/* アクションボタン */}
      <div className="flex flex-wrap gap-2">
        {/* グループ化ボタン */}
        <button
          onClick={onCreateGroup}
          disabled={!canGroup}
          className={`
            px-3 py-1 text-xs rounded border focus:outline-none focus:ring-2 focus:ring-blue-500
            ${
              canGroup
                ? 'bg-purple-700 text-purple-100 border-purple-600 hover:bg-purple-600'
                : 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'
            }
          `}
          title={
            canGroup
              ? 'グループ化: 選択した呼び出しをまとめる'
              : hasAlreadyGrouped
                ? '既にグループ化済みの呼び出しが含まれています'
                : '連続した2つ以上の呼び出しを選択してください'
          }
        >
          📦 グループ化
        </button>

        {/* 省略ボタン */}
        <button
          onClick={onOmit}
          disabled={!canOmit}
          className={`
            px-3 py-1 text-xs rounded border focus:outline-none focus:ring-2 focus:ring-blue-500
            ${
              canOmit
                ? 'bg-gray-700 text-gray-100 border-gray-600 hover:bg-gray-600'
                : 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'
            }
          `}
          title="省略: 選択した呼び出しを「...」で置換"
        >
          ⋯ 省略
        </button>
      </div>

      {/* ヘルプテキスト */}
      {!canGroup && selectedCallIds.size >= 2 && (
        <p className="text-xs text-yellow-500">
          {hasAlreadyGrouped
            ? '※ 既にグループ化済みの呼び出しが含まれています'
            : '※ グループ化には連続した呼び出しを選択してください'}
        </p>
      )}
    </div>
  );
}
