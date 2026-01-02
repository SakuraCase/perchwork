/**
 * GroupList - グループ一覧コンポーネント
 *
 * 役割:
 *   - 作成済みグループの一覧表示
 *   - 折りたたみ/展開トグル
 *   - グループの編集/削除
 */

import type { SequenceGroup } from '../../types/sequence';

// ============================================
// Props定義
// ============================================

export interface GroupListProps {
  /** グループ一覧 */
  groups: SequenceGroup[];
  /** 折りたたみトグル */
  onToggleCollapse: (groupId: string) => void;
  /** グループ編集 */
  onEdit: (groupId: string) => void;
  /** グループ削除 */
  onDelete: (groupId: string) => void;
}

// ============================================
// メインコンポーネント
// ============================================

export function GroupList({
  groups,
  onToggleCollapse,
  onEdit,
  onDelete,
}: GroupListProps) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      {/* ヘッダー */}
      <div className="text-xs text-gray-400 px-2 py-1">
        グループ ({groups.length}件)
      </div>

      {/* グループリスト */}
      <div className="border border-gray-700 rounded">
        {groups.map((group) => (
          <div
            key={group.id}
            className="flex items-center gap-2 px-2 py-1 border-b border-gray-800 last:border-b-0 hover:bg-gray-800"
          >
            {/* 折りたたみトグル */}
            <button
              onClick={() => onToggleCollapse(group.id)}
              className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-200"
              title={group.isCollapsed ? '展開' : '折りたたみ'}
            >
              {group.isCollapsed ? '▶' : '▼'}
            </button>

            {/* グループ名 */}
            <span
              className={`
                flex-1 text-sm truncate
                ${group.isCollapsed ? 'text-gray-400' : 'text-purple-400'}
              `}
            >
              {group.name}
            </span>

            {/* 呼び出し数 */}
            <span className="text-xs text-gray-500">
              ({group.callEntryIds.length})
            </span>

            {/* 編集ボタン */}
            <button
              onClick={() => onEdit(group.id)}
              className="text-gray-400 hover:text-gray-200 text-xs"
              title="グループ名を編集"
            >
              ✏️
            </button>

            {/* 削除ボタン */}
            <button
              onClick={() => onDelete(group.id)}
              className="text-gray-400 hover:text-red-400 text-xs"
              title="グループを削除"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
