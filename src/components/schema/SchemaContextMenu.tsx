/**
 * SchemaContextMenu.tsx
 *
 * スキーマノード右クリックメニュー
 */

import { useEffect, useRef } from 'react';

export interface SchemaContextMenuProps {
  /** 表示位置（null で非表示） */
  position: { x: number; y: number } | null;

  /** 対象ノード名（型名） */
  nodeName: string | null;

  /** 対象ノードタイプ */
  nodeType: 'struct' | 'enum' | null;

  /** ファイルパス */
  nodeFile: string | null;

  /** 行番号 */
  nodeLine: number | null;

  /** メニューを閉じる */
  onClose: () => void;

  /** 関連ノードのみ表示 */
  onShowRelated: (nodeName: string) => void;

  /** このノードを除外 */
  onExclude: (nodeName: string) => void;

  /** ツリーで表示 */
  onShowInTree?: (filePath: string) => void;
}

export function SchemaContextMenu({
  position,
  nodeName,
  nodeType,
  nodeFile,
  nodeLine,
  onClose,
  onShowRelated,
  onExclude,
  onShowInTree,
}: SchemaContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // クリック外でメニューを閉じる
  useEffect(() => {
    if (!position) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    // 少し遅延させてから登録
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [position, onClose]);

  const handleShowRelated = () => {
    if (nodeName) {
      onShowRelated(nodeName);
      onClose();
    }
  };

  const handleExclude = () => {
    if (nodeName) {
      onExclude(nodeName);
      onClose();
    }
  };

  const handleShowInTree = () => {
    if (nodeFile && onShowInTree) {
      onShowInTree(nodeFile);
      onClose();
    }
  };

  if (!position || !nodeName) {
    return null;
  }

  const typeColor =
    nodeType === 'struct'
      ? 'bg-teal-900/50 text-teal-400'
      : 'bg-amber-900/50 text-amber-400';

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-stone-800 border border-stone-600 rounded-lg shadow-lg min-w-[240px] max-w-[320px]"
      style={{
        left: position.x,
        top: position.y,
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* ヘッダー: 型名とタイプ */}
      <div className="px-3 py-2 border-b border-stone-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-stone-100">
            {nodeName}
          </span>
          {nodeType && (
            <span className={`px-1.5 py-0.5 text-xs rounded ${typeColor}`}>
              {nodeType}
            </span>
          )}
        </div>
      </div>

      {/* 詳細情報 */}
      <div className="px-3 py-2 border-b border-stone-700 space-y-1">
        {nodeFile && (
          <div className="flex items-start gap-2">
            <span className="text-xs text-stone-500 min-w-[3rem]">ファイル</span>
            <span className="text-xs text-stone-300 break-all">{nodeFile}</span>
          </div>
        )}
        {nodeLine !== null && (
          <div className="flex items-start gap-2">
            <span className="text-xs text-stone-500 min-w-[3rem]">行</span>
            <span className="text-xs text-stone-300">{nodeLine}</span>
          </div>
        )}
      </div>

      {/* アクション */}
      <div className="py-1">
        <button
          onClick={handleShowRelated}
          className="w-full px-3 py-2 text-sm text-stone-200 text-left hover:bg-stone-700 focus:bg-stone-700 focus:outline-none"
        >
          関連する型のみ表示
        </button>
        <button
          onClick={handleExclude}
          className="w-full px-3 py-2 text-sm text-stone-200 text-left hover:bg-stone-700 focus:bg-stone-700 focus:outline-none"
        >
          この型を除外
        </button>
        {onShowInTree && nodeFile && (
          <button
            onClick={handleShowInTree}
            className="w-full px-3 py-2 text-sm text-stone-200 text-left hover:bg-stone-700 focus:bg-stone-700 focus:outline-none"
          >
            ツリーで表示
          </button>
        )}
      </div>
    </div>
  );
}
