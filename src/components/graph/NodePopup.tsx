/**
 * NodePopup - ノード詳細ポップアップ
 *
 * 役割:
 *   - ノード情報の表示（名前、型、ファイル、行番号）
 *   - ファイルへのリンク
 *   - 関連ノードへのナビゲーション
 */

import { useEffect } from 'react';
import type { CytoscapeNode } from '../../types/graph';

// ============================================
// Props定義
// ============================================

export interface NodePopupProps {
  /** 表示するノード（null の場合は非表示） */
  node: CytoscapeNode | null;

  /** ポップアップの表示位置（省略時は画面中央） */
  position?: { x: number; y: number };

  /** 閉じるボタンクリック時のコールバック */
  onClose: () => void;

  /** 関連ノードへのナビゲーション時のコールバック（オプション） */
  onNavigate?: (nodeId: string) => void;

  /** カスタムクラス名 */
  className?: string;
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

export function NodePopup({
  node,
  position,
  onClose,
  onNavigate,
  className = '',
}: NodePopupProps) {
  // ============================================
  // エフェクト
  // ============================================

  /**
   * Escapeキーでポップアップを閉じる
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (node) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [node, onClose]);

  // ============================================
  // イベントハンドラ
  // ============================================

  /**
   * 背景クリックでポップアップを閉じる
   */
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  /**
   * ファイルリンククリック時のハンドラ
   */
  const handleFileClick = () => {
    if (!node) return;

    // 実際の実装では、IDEやエディタで該当ファイルを開く処理を実行
    // ここでは、コンソールログで代用
    console.log(`Open file: ${node.data.file}:${node.data.line}`);
  };

  // ============================================
  // レンダリング
  // ============================================

  // ノードが null の場合は何も表示しない
  if (!node) {
    return null;
  }

  // ポップアップの位置スタイルを計算
  const popupStyle: React.CSSProperties = position
    ? {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)',
        marginTop: '-10px', // ノードとの間隔
      }
    : {
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      };

  return (
    <>
      {/* 背景オーバーレイ */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* ポップアップ本体 */}
      <div
        className={`z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl min-w-[300px] max-w-[500px] ${className}`}
        style={popupStyle}
        role="dialog"
        aria-labelledby="node-popup-title"
        aria-modal="true"
      >
        {/* ヘッダー */}
        <div className="flex items-start justify-between p-4 border-b border-gray-700">
          <div className="flex-1">
            <h2
              id="node-popup-title"
              className="text-lg font-semibold text-gray-100 break-all"
            >
              {node.data.label}
            </h2>
            <div className="mt-1">
              <span
                className={`inline-block px-2 py-1 text-xs rounded ${getTypeColorClass(
                  node.data.type
                )}`}
              >
                {getTypeLabel(node.data.type)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-gray-400 hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            aria-label="閉じる"
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
        <div className="p-4 space-y-3">
          {/* ファイル情報 */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-1">
              ファイル
            </h3>
            <button
              onClick={handleFileClick}
              className="text-sm text-blue-400 hover:text-blue-300 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded text-left break-all"
              title="クリックでファイルを開く"
            >
              {node.data.file}
            </button>
          </div>

          {/* 行番号 */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-1">
              行番号
            </h3>
            <p className="text-sm text-gray-300">{node.data.line}</p>
          </div>

          {/* ノードID（デバッグ用） */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-1">
              ID
            </h3>
            <p className="text-xs text-gray-500 font-mono break-all">
              {node.data.id}
            </p>
          </div>

          {/* ナビゲーションボタン（オプション） */}
          {onNavigate && (
            <div className="pt-2 border-t border-gray-700">
              <button
                onClick={() => onNavigate(node.data.id)}
                className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                このノードを中心に表示
              </button>
            </div>
          )}
        </div>

        {/* フッター（キーボードヒント） */}
        <div className="px-4 py-2 bg-gray-900 rounded-b-lg">
          <p className="text-xs text-gray-500">
            <kbd className="px-1 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-400">
              Esc
            </kbd>{' '}
            キーで閉じる
          </p>
        </div>
      </div>
    </>
  );
}
