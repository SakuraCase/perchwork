/**
 * ClusterNode - クラスタ表示コンポーネント
 *
 * 役割:
 *   - クラスタ（折りたたみ可能なノードグループ）の表示
 *   - クラスタの展開/折りたたみ
 *   - クラスタ内のノード一覧表示
 *   - ノード数のバッジ表示
 */

import { useState } from 'react';

// ============================================
// Props定義
// ============================================

export interface ClusterNodeProps {
  /** クラスタ情報 */
  cluster: {
    /** クラスタID（ディレクトリパスなど） */
    id: string;
    /** クラスタ表示名（ディレクトリ名など） */
    label: string;
    /** クラスタ内のノードIDリスト */
    nodes: string[];
    /** 展開状態（true: 展開、false: 折りたたみ） */
    expanded: boolean;
  };

  /** クラスタの展開/折りたたみトグル時のコールバック */
  onToggle: (clusterId: string) => void;

  /** クラスタ内のノード選択時のコールバック（オプション） */
  onSelectNode?: (nodeId: string) => void;

  /** カスタムクラス名 */
  className?: string;
}

// ============================================
// メインコンポーネント
// ============================================

export function ClusterNode({
  cluster,
  onToggle,
  onSelectNode,
  className = '',
}: ClusterNodeProps) {
  // ホバー状態を管理
  const [isHovered, setIsHovered] = useState(false);

  // ============================================
  // イベントハンドラ
  // ============================================

  /**
   * クラスタヘッダーのクリック処理（展開/折りたたみ）
   */
  const handleToggle = () => {
    onToggle(cluster.id);
  };

  /**
   * ノードアイテムのクリック処理
   */
  const handleNodeClick = (nodeId: string) => {
    onSelectNode?.(nodeId);
  };

  /**
   * マウスホバー開始
   */
  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  /**
   * マウスホバー終了
   */
  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  // ============================================
  // レンダリング
  // ============================================

  return (
    <div
      className={`border border-gray-700 rounded-lg bg-gray-800 transition-all duration-200 ${
        isHovered ? 'border-gray-600 shadow-lg' : ''
      } ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* クラスタヘッダー */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-750 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-t-lg transition-colors"
        aria-expanded={cluster.expanded}
        aria-label={`${cluster.label}クラスタを${cluster.expanded ? '折りたたむ' : '展開する'}`}
      >
        {/* 左側: 展開/折りたたみアイコン + クラスタ名 */}
        <div className="flex items-center space-x-2">
          {/* 展開/折りたたみアイコン */}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              cluster.expanded ? 'rotate-90' : ''
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

          {/* クラスタ名 */}
          <span className="text-sm font-semibold text-gray-100">
            {cluster.label}
          </span>
        </div>

        {/* 右側: ノード数バッジ */}
        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-gray-100 bg-gray-700 rounded-full min-w-[24px]">
          {cluster.nodes.length}
        </span>
      </button>

      {/* クラスタ内のノード一覧（展開時のみ表示） */}
      {cluster.expanded && (
        <div className="border-t border-gray-700">
          {/* ノードがない場合 */}
          {cluster.nodes.length === 0 && (
            <div className="p-3 text-sm text-gray-500 text-center">
              ノードがありません
            </div>
          )}

          {/* ノードリスト */}
          {cluster.nodes.length > 0 && (
            <ul className="divide-y divide-gray-700">
              {cluster.nodes.map((nodeId) => (
                <li key={nodeId}>
                  <button
                    onClick={() => handleNodeClick(nodeId)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-750 hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    title={`${nodeId}を選択`}
                  >
                    {/* ノードIDを表示（必要に応じてノード名に変更可能） */}
                    <span className="font-mono text-xs">{nodeId}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
