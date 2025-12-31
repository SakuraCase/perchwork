/**
 * NodeContextMenu - ノード右クリックメニュー
 *
 * 役割:
 *   - ノードを右クリックした際に表示されるコンテキストメニュー
 *   - ノード詳細情報の表示（タイプ、ファイル、行番号）
 *   - アクション（ファイルを開く、関連ノード表示、除外）を提供
 */

import { useEffect, useRef } from 'react';
import type { ItemType } from '../../types/schema';

// ============================================
// Props定義
// ============================================

export interface NodeContextMenuProps {
  /** 表示位置（null で非表示） */
  position: { x: number; y: number } | null;

  /** 対象ノードID */
  nodeId: string | null;

  /** 対象ノードラベル */
  nodeLabel: string | null;

  /** 対象ノードタイプ */
  nodeType: ItemType | null;

  /** 対象ノードファイルパス */
  nodeFile: string | null;

  /** 対象ノード行番号 */
  nodeLine: number | null;

  /** メニューを閉じる */
  onClose: () => void;

  /** ノードを除外する */
  onExclude: (nodeId: string) => void;

  /** このノードを中心に表示 */
  onFocus?: (nodeId: string) => void;

  /** 関連ノードのみ表示 */
  onShowRelated?: (nodeId: string) => void;

  /** ファイルを開く */
  onOpenFile?: (filePath: string) => void;
}

// ============================================
// ヘルパー関数
// ============================================

/**
 * アイテムタイプの日本語表示名を取得
 */
const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    struct: '構造体',
    fn: '関数',
    trait: 'トレイト',
    enum: '列挙型',
    type: '型エイリアス',
    impl: '実装',
    mod: 'モジュール',
    const: '定数',
    method: 'メソッド',
  };
  return labels[type] || type;
};

/**
 * アイテムタイプに応じた色クラスを取得
 */
const getTypeColorClass = (type: string): string => {
  const colors: Record<string, string> = {
    struct: 'bg-green-600 text-white',
    fn: 'bg-indigo-600 text-white',
    trait: 'bg-red-600 text-white',
    enum: 'bg-amber-600 text-white',
    type: 'bg-purple-600 text-white',
    impl: 'bg-blue-600 text-white',
    mod: 'bg-gray-600 text-white',
    const: 'bg-teal-600 text-white',
    method: 'bg-cyan-600 text-white',
  };
  return colors[type] || 'bg-gray-600 text-white';
};

// ============================================
// メインコンポーネント
// ============================================

export function NodeContextMenu({
  position,
  nodeId,
  nodeLabel,
  nodeType,
  nodeFile,
  nodeLine,
  onClose,
  onExclude,
  onFocus,
  onShowRelated,
  onOpenFile,
}: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // ============================================
  // クリック外でメニューを閉じる
  // ============================================

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

    // 少し遅延させてから登録（右クリック自体で閉じないように）
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

  // ============================================
  // イベントハンドラ
  // ============================================

  const handleExclude = () => {
    if (nodeId) {
      onExclude(nodeId);
      onClose();
    }
  };

  const handleFocus = () => {
    if (nodeId && onFocus) {
      onFocus(nodeId);
      onClose();
    }
  };

  const handleShowRelated = () => {
    if (nodeId && onShowRelated) {
      onShowRelated(nodeId);
      onClose();
    }
  };

  const handleOpenFile = () => {
    if (nodeFile && onOpenFile) {
      onOpenFile(nodeFile);
      onClose();
    }
  };

  // ============================================
  // レンダリング
  // ============================================

  if (!position || !nodeId) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-lg min-w-[280px] max-w-[350px]"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {/* ヘッダー: ノードラベルとタイプ */}
      <div className="px-3 py-2 border-b border-gray-700">
        <div className="text-sm font-semibold text-gray-100 break-all">
          {nodeLabel || nodeId}
        </div>
        {nodeType && (
          <div className="mt-1">
            <span
              className={`inline-block px-2 py-0.5 text-xs rounded ${getTypeColorClass(nodeType)}`}
            >
              {getTypeLabel(nodeType)}
            </span>
          </div>
        )}
      </div>

      {/* 詳細情報 */}
      <div className="px-3 py-2 border-b border-gray-700 space-y-1">
        {/* ファイル */}
        {nodeFile && (
          <div className="flex items-start gap-2">
            <span className="text-xs text-gray-500 min-w-[3rem]">ファイル</span>
            <span className="text-xs text-gray-300 break-all">{nodeFile}</span>
          </div>
        )}
        {/* 行番号 */}
        {nodeLine !== null && (
          <div className="flex items-start gap-2">
            <span className="text-xs text-gray-500 min-w-[3rem]">行</span>
            <span className="text-xs text-gray-300">{nodeLine}</span>
          </div>
        )}
      </div>

      {/* アクション */}
      <div className="py-1">
        {/* ファイルを開く */}
        {onOpenFile && nodeFile && (
          <button
            onClick={handleOpenFile}
            className="w-full px-3 py-2 text-sm text-blue-400 text-left hover:bg-gray-700 focus:bg-gray-700 focus:outline-none"
          >
            ファイルを開く
          </button>
        )}

        {/* このノードを中心に表示 */}
        {onFocus && (
          <button
            onClick={handleFocus}
            className="w-full px-3 py-2 text-sm text-gray-200 text-left hover:bg-gray-700 focus:bg-gray-700 focus:outline-none"
          >
            このノードを中心に表示
          </button>
        )}

        {/* 関連ノードのみ表示 */}
        {onShowRelated && (
          <button
            onClick={handleShowRelated}
            className="w-full px-3 py-2 text-sm text-green-400 text-left hover:bg-gray-700 focus:bg-gray-700 focus:outline-none"
          >
            関連ノードのみ表示
          </button>
        )}

        {/* このノードを除外 */}
        <button
          onClick={handleExclude}
          className="w-full px-3 py-2 text-sm text-red-400 text-left hover:bg-gray-700 focus:bg-gray-700 focus:outline-none"
        >
          このノードを除外
        </button>
      </div>
    </div>
  );
}
