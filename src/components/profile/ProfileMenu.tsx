/**
 * ProfileMenu - プロファイル管理メニュー
 *
 * プロファイル一覧と各種アクション（切り替え、編集、削除、新規作成）を提供
 */

import type { Profile } from '../../types/profile';

// ============================================
// Props定義
// ============================================

export interface ProfileMenuProps {
  /** プロファイル一覧 */
  profiles: Profile[];

  /** 現在選択中のプロファイルID */
  activeProfileId: string;

  /** プロファイル選択時 */
  onSelect: (profileId: string) => void;

  /** 新規作成クリック */
  onCreateNew: () => void;

  /** 名前編集クリック */
  onEditName: (profileId: string) => void;

  /** 削除クリック */
  onDelete: (profileId: string) => void;
}

// ============================================
// アイコンコンポーネント
// ============================================

function CheckIcon() {
  return (
    <svg
      className="w-4 h-4 text-blue-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4v16m8-8H4"
      />
    </svg>
  );
}

// ============================================
// メインコンポーネント
// ============================================

export function ProfileMenu({
  profiles,
  activeProfileId,
  onSelect,
  onCreateNew,
  onEditName,
  onDelete,
}: ProfileMenuProps) {
  const canDelete = profiles.length > 1;

  return (
    <div className="py-1 min-w-[200px]">
      {/* プロファイル一覧 */}
      <div className="max-h-60 overflow-y-auto">
        {profiles.map((profile) => {
          const isActive = profile.id === activeProfileId;
          return (
            <div
              key={profile.id}
              className={`group flex items-center gap-2 px-3 py-2 ${
                isActive ? 'bg-gray-700/50' : 'hover:bg-gray-700/30'
              }`}
            >
              {/* チェックマーク or スペーサー */}
              <div className="w-4 flex-shrink-0">
                {isActive && <CheckIcon />}
              </div>

              {/* プロファイル名（クリックで選択） */}
              <button
                type="button"
                onClick={() => onSelect(profile.id)}
                className="flex-1 text-left text-sm text-gray-200 truncate hover:text-white"
              >
                {profile.name}
              </button>

              {/* アクションボタン */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditName(profile.id);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-200 rounded hover:bg-gray-600"
                  title="名前を編集"
                >
                  <EditIcon />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(profile.id);
                  }}
                  disabled={!canDelete}
                  className="p-1 text-gray-400 hover:text-red-400 rounded hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-400 disabled:hover:bg-transparent"
                  title={canDelete ? '削除' : '最後のプロファイルは削除できません'}
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 区切り線 */}
      <div className="my-1 border-t border-gray-600" />

      {/* 新規作成ボタン */}
      <button
        type="button"
        onClick={onCreateNew}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700/30"
      >
        <PlusIcon />
        <span>新規プロファイル</span>
      </button>
    </div>
  );
}
