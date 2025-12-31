/**
 * GraphToolbar - グラフ操作UI
 *
 * 役割:
 *   - レイアウト選択（hierarchical, force, radial, grid）
 *   - フィルタパネル（タイプ、孤立ノード、深度制限）
 *   - エクスポートボタン（PNG, SVG）
 *   - ズームコントロール（+, -, フィット）
 */

import { useState } from 'react';
import type { LayoutType, GraphFilter } from '../../types/graph';
import type { ItemType } from '../../types/schema';

// ============================================
// Props定義
// ============================================

export interface GraphToolbarProps {
  /** 現在のレイアウトタイプ */
  layout: LayoutType;

  /** レイアウト変更時のコールバック */
  onLayoutChange: (type: LayoutType) => void;

  /** 現在のフィルタ設定 */
  filter: GraphFilter;

  /** フィルタ変更時のコールバック */
  onFilterChange: (filter: GraphFilter) => void;

  /** フォーカス中のノードラベル（表示用） */
  focusNodeLabel?: string;

  /** フォーカス解除時のコールバック */
  onClearFocus?: () => void;

  /** エクスポート時のコールバック（オプション） */
  onExport?: (format: 'png' | 'svg') => void;

  /** ズームイン時のコールバック（オプション） */
  onZoomIn?: () => void;

  /** ズームアウト時のコールバック（オプション） */
  onZoomOut?: () => void;

  /** 画面にフィット時のコールバック（オプション） */
  onFitToScreen?: () => void;

  /** カスタムクラス名 */
  className?: string;
}

// ============================================
// 定数定義
// ============================================

/** レイアウトタイプの選択肢 */
const LAYOUT_OPTIONS: { value: LayoutType; label: string }[] = [
  { value: 'hierarchical', label: '階層' },
  { value: 'force', label: '力学' },
  { value: 'radial', label: '放射' },
  { value: 'grid', label: 'グリッド' },
];

/** フィルタ対象となるアイテムタイプ */
const FILTER_TYPES: ItemType[] = ['struct', 'fn', 'trait', 'enum', 'type'];

// ============================================
// メインコンポーネント
// ============================================

export function GraphToolbar({
  layout,
  onLayoutChange,
  filter,
  onFilterChange,
  focusNodeLabel,
  onClearFocus,
  onExport,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  className = '',
}: GraphToolbarProps) {
  // フィルタパネルの表示/非表示状態
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // ============================================
  // イベントハンドラ
  // ============================================

  /**
   * レイアウトタイプ変更ハンドラ
   */
  const handleLayoutChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onLayoutChange(event.target.value as LayoutType);
  };

  /**
   * タイプフィルタトグルハンドラ
   */
  const handleTypeToggle = (type: ItemType) => {
    const newTypes = filter.types.includes(type)
      ? filter.types.filter((t) => t !== type)
      : [...filter.types, type];

    onFilterChange({ ...filter, types: newTypes });
  };

  /**
   * 孤立ノード表示トグルハンドラ
   */
  const handleIsolatedToggle = () => {
    onFilterChange({ ...filter, includeIsolated: !filter.includeIsolated });
  };

  /**
   * 深度制限変更ハンドラ
   */
  const handleMaxDepthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    onFilterChange({ ...filter, maxDepth: value });
  };

  // ============================================
  // レンダリング
  // ============================================

  return (
    <div className={`bg-gray-800 border-b border-gray-700 p-3 ${className}`}>
      <div className="flex items-center justify-between gap-4">
        {/* 左側: レイアウト選択とフィルタ */}
        <div className="flex items-center gap-4">
          {/* レイアウトセレクター */}
          <div className="flex items-center gap-2">
            <label htmlFor="layout-select" className="text-sm text-gray-300">
              レイアウト:
            </label>
            <select
              id="layout-select"
              value={layout}
              onChange={handleLayoutChange}
              className="bg-gray-700 text-gray-100 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="グラフレイアウトの選択"
            >
              {LAYOUT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* フィルタトグルボタン */}
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="px-3 py-1 text-sm bg-gray-700 text-gray-100 border border-gray-600 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="フィルタパネルの表示切り替え"
            aria-expanded={isFilterOpen}
          >
            フィルタ {isFilterOpen ? '▲' : '▼'}
          </button>

          {/* フォーカスインジケータ */}
          {filter.focusNodeId && onClearFocus && (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-900 border border-green-700 rounded">
              <span className="text-sm text-green-300">
                フォーカス: {focusNodeLabel || filter.focusNodeId}
              </span>
              <button
                onClick={onClearFocus}
                className="text-green-400 hover:text-green-200 focus:outline-none"
                aria-label="フォーカスを解除"
                title="フォーカスを解除"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* 右側: ズームコントロールとエクスポート */}
        <div className="flex items-center gap-2">
          {/* ズームコントロール */}
          {(onZoomIn || onZoomOut || onFitToScreen) && (
            <div className="flex items-center gap-1 border-r border-gray-700 pr-2">
              {onZoomIn && (
                <button
                  onClick={onZoomIn}
                  className="w-8 h-8 bg-gray-700 text-gray-100 border border-gray-600 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="ズームイン"
                  title="ズームイン"
                >
                  +
                </button>
              )}
              {onZoomOut && (
                <button
                  onClick={onZoomOut}
                  className="w-8 h-8 bg-gray-700 text-gray-100 border border-gray-600 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="ズームアウト"
                  title="ズームアウト"
                >
                  -
                </button>
              )}
              {onFitToScreen && (
                <button
                  onClick={onFitToScreen}
                  className="px-2 h-8 bg-gray-700 text-gray-100 border border-gray-600 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  aria-label="画面にフィット"
                  title="画面にフィット"
                >
                  フィット
                </button>
              )}
            </div>
          )}

          {/* エクスポートボタン */}
          {onExport && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onExport('png')}
                className="px-3 py-1 text-sm bg-gray-700 text-gray-100 border border-gray-600 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="PNG形式でエクスポート"
              >
                PNG
              </button>
              <button
                onClick={() => onExport('svg')}
                className="px-3 py-1 text-sm bg-gray-700 text-gray-100 border border-gray-600 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="SVG形式でエクスポート"
              >
                SVG
              </button>
            </div>
          )}
        </div>
      </div>

      {/* フィルタパネル（折りたたみ可能） */}
      {isFilterOpen && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* タイプフィルタ */}
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2">
                アイテムタイプ
              </h3>
              <div className="space-y-1">
                {FILTER_TYPES.map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-gray-100"
                  >
                    <input
                      type="checkbox"
                      checked={filter.types.includes(type)}
                      onChange={() => handleTypeToggle(type)}
                      className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                    <span>{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 孤立ノード表示 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2">
                表示オプション
              </h3>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-gray-100">
                <input
                  type="checkbox"
                  checked={filter.includeIsolated}
                  onChange={handleIsolatedToggle}
                  className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-2 focus:ring-blue-500"
                />
                <span>孤立ノードを表示</span>
              </label>
            </div>

            {/* 深度制限 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2">
                深度制限
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={filter.maxDepth}
                  onChange={handleMaxDepthChange}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  aria-label="最大深度の設定"
                />
                <span className="text-sm text-gray-300 min-w-[3rem]">
                  {filter.maxDepth === 0 ? '無制限' : filter.maxDepth}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                0 = 制限なし、1-10 = 指定深度まで
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
