/**
 * ProfileSelector - プロファイル選択コンポーネント
 *
 * ヘッダーに配置するプロファイル切り替えUI。
 * ドロップダウンメニュー、名前編集、削除確認ダイアログを統合
 */

import { useState, useRef, useEffect, useCallback } from 'react';

import type { Profile } from '../../types/profile';
import { ProfileMenu } from './ProfileMenu';
import { ProfileNameDialog } from './ProfileNameDialog';
import { ProfileDeleteConfirm } from './ProfileDeleteConfirm';

// ============================================
// Props定義
// ============================================

export interface ProfileSelectorProps {
  /** プロファイル一覧 */
  profiles: Profile[];

  /** 現在選択中のプロファイルID */
  activeProfileId: string;

  /** 現在のプロファイル名 */
  activeProfileName: string;

  /** プロファイル選択時 */
  onSelect: (profileId: string) => void;

  /** 新規プロファイル作成 */
  onCreate: (name: string) => void;

  /** プロファイル名変更 */
  onRename: (profileId: string, newName: string) => void;

  /** プロファイル削除 */
  onDelete: (profileId: string) => void;
}

// ============================================
// アイコンコンポーネント
// ============================================

function ChevronDownIcon() {
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
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}

function FolderIcon() {
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
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
  );
}

// ============================================
// ダイアログ状態型
// ============================================

type DialogState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; profileId: string; currentName: string }
  | { type: 'delete'; profileId: string; profileName: string };

// ============================================
// メインコンポーネント
// ============================================

export function ProfileSelector({
  profiles,
  activeProfileId,
  activeProfileName,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: ProfileSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>({ type: 'none' });
  const containerRef = useRef<HTMLDivElement>(null);

  // ============================================
  // メニュー開閉
  // ============================================

  const toggleMenu = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  // 外部クリックでメニューを閉じる
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closeMenu]);

  // Escキーでメニューを閉じる
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeMenu]);

  // ============================================
  // メニューアクション
  // ============================================

  const handleSelectProfile = useCallback(
    (profileId: string) => {
      onSelect(profileId);
      closeMenu();
    },
    [onSelect, closeMenu]
  );

  const handleCreateNew = useCallback(() => {
    closeMenu();
    setDialogState({ type: 'create' });
  }, [closeMenu]);

  const handleEditName = useCallback(
    (profileId: string) => {
      const profile = profiles.find((p) => p.id === profileId);
      if (!profile) return;
      closeMenu();
      setDialogState({ type: 'edit', profileId, currentName: profile.name });
    },
    [profiles, closeMenu]
  );

  const handleDeleteClick = useCallback(
    (profileId: string) => {
      const profile = profiles.find((p) => p.id === profileId);
      if (!profile) return;
      closeMenu();
      setDialogState({ type: 'delete', profileId, profileName: profile.name });
    },
    [profiles, closeMenu]
  );

  // ============================================
  // ダイアログアクション
  // ============================================

  const closeDialog = useCallback(() => {
    setDialogState({ type: 'none' });
  }, []);

  const handleCreateConfirm = useCallback(
    (name: string) => {
      onCreate(name);
      closeDialog();
    },
    [onCreate, closeDialog]
  );

  const handleEditConfirm = useCallback(
    (name: string) => {
      if (dialogState.type === 'edit') {
        onRename(dialogState.profileId, name);
      }
      closeDialog();
    },
    [dialogState, onRename, closeDialog]
  );

  const handleDeleteConfirm = useCallback(() => {
    if (dialogState.type === 'delete') {
      onDelete(dialogState.profileId);
    }
    closeDialog();
  }, [dialogState, onDelete, closeDialog]);

  // ============================================
  // レンダリング
  // ============================================

  return (
    <>
      <div ref={containerRef} className="relative">
        {/* トリガーボタン */}
        <button
          type="button"
          onClick={toggleMenu}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 bg-gray-800 border border-gray-600 rounded hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <FolderIcon />
          <span className="max-w-[120px] truncate">{activeProfileName}</span>
          <ChevronDownIcon />
        </button>

        {/* ドロップダウンメニュー */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-40">
            <ProfileMenu
              profiles={profiles}
              activeProfileId={activeProfileId}
              onSelect={handleSelectProfile}
              onCreateNew={handleCreateNew}
              onEditName={handleEditName}
              onDelete={handleDeleteClick}
            />
          </div>
        )}
      </div>

      {/* 新規作成ダイアログ */}
      <ProfileNameDialog
        isOpen={dialogState.type === 'create'}
        mode="create"
        currentName=""
        onConfirm={handleCreateConfirm}
        onCancel={closeDialog}
      />

      {/* 名前編集ダイアログ */}
      <ProfileNameDialog
        isOpen={dialogState.type === 'edit'}
        mode="edit"
        currentName={dialogState.type === 'edit' ? dialogState.currentName : ''}
        onConfirm={handleEditConfirm}
        onCancel={closeDialog}
      />

      {/* 削除確認ダイアログ */}
      <ProfileDeleteConfirm
        isOpen={dialogState.type === 'delete'}
        profileName={dialogState.type === 'delete' ? dialogState.profileName : ''}
        onConfirm={handleDeleteConfirm}
        onCancel={closeDialog}
      />
    </>
  );
}
