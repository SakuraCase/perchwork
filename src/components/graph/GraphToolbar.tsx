/**
 * GraphToolbar - グラフ操作UI
 *
 * 役割:
 *   - レイアウト選択（hierarchical, force, radial, grid）
 *   - フィルタパネル（孤立ノード表示）
 *   - エクスポートボタン（PNG, SVG）
 *   - ズームコントロール（+, -, フィット）
 */

import { useState } from 'react';
import type { LayoutType, GraphFilter, GraphLoadMeta, NodeColorRule, SavedGraphSettings } from '../../types/graph';
import { ColorRulesPanel } from './ColorRulesPanel';
import { GraphSaveDialog } from './GraphSaveDialog';
import { GraphOpenDialog } from './GraphOpenDialog';

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

  /** 除外リストクリア時のコールバック */
  onClearExcluded?: () => void;

  /** エクスポート時のコールバック（オプション） */
  onExport?: (format: 'png' | 'svg') => void;

  /** ズームイン時のコールバック（オプション） */
  onZoomIn?: () => void;

  /** ズームアウト時のコールバック（オプション） */
  onZoomOut?: () => void;

  /** 画面にフィット時のコールバック（オプション） */
  onFitToScreen?: () => void;

  /** 現在の色ルール */
  colorRules: NodeColorRule[];

  /** 色ルール変更時のコールバック */
  onColorRulesChange: (rules: NodeColorRule[]) => void;

  /** 保存済みグラフ設定一覧 */
  savedSettings: SavedGraphSettings[];

  /** 保存時のコールバック */
  onSave: (name: string, existingId?: string) => void;

  /** 設定を開く時のコールバック */
  onOpen: (saved: SavedGraphSettings) => void;

  /** 保存済み設定を削除する時のコールバック */
  onDeleteSaved: (id: string) => void;

  /** グラフ読み込み状況 */
  loadMeta?: GraphLoadMeta;

  /** 全件読み込み中かどうか */
  isLoadingFullGraph?: boolean;

  /** 全件読み込み時のコールバック */
  onLoadCompleteGraph?: () => void;

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
  onClearExcluded,
  onExport,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  colorRules,
  onColorRulesChange,
  savedSettings,
  onSave,
  onOpen,
  onDeleteSaved,
  loadMeta,
  isLoadingFullGraph = false,
  onLoadCompleteGraph,
  className = '',
}: GraphToolbarProps) {
  // フィルタパネルの表示/非表示状態
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  // カラーパネルの表示/非表示状態
  const [isColorOpen, setIsColorOpen] = useState(false);
  // 保存ダイアログの表示/非表示状態
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  // 開くダイアログの表示/非表示状態
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);

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
   * 孤立ノード表示トグルハンドラ
   */
  const handleIsolatedToggle = () => {
    onFilterChange({ ...filter, includeIsolated: !filter.includeIsolated });
  };

  /**
   * エッジ省略トグルハンドラ
   */
  const handleConsolidateToggle = () => {
    onFilterChange({ ...filter, consolidateEdges: !filter.consolidateEdges });
  };

  // ============================================
  // レンダリング
  // ============================================

  return (
    <div className={`relative bg-stone-800 border-b border-stone-700 p-3 ${className}`}>
      <div className="flex items-center justify-between gap-4">
        {/* 左側: レイアウト選択とフィルタ */}
        <div className="flex items-center gap-4">
          {/* レイアウトセレクター */}
          <div className="flex items-center gap-2">
            <label htmlFor="layout-select" className="text-sm text-stone-300">
              レイアウト:
            </label>
            <select
              id="layout-select"
              value={layout}
              onChange={handleLayoutChange}
              className="bg-stone-700 text-stone-100 border border-stone-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
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
            onClick={() => {
              setIsFilterOpen(!isFilterOpen);
              if (!isFilterOpen) setIsColorOpen(false);
            }}
            className="px-3 py-1 text-sm bg-stone-700 text-stone-100 border border-stone-600 rounded hover:bg-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
            aria-label="フィルタパネルの表示切り替え"
            aria-expanded={isFilterOpen}
          >
            フィルタ {isFilterOpen ? '▲' : '▼'}
          </button>

          {/* カラートグルボタン */}
          <button
            onClick={() => {
              setIsColorOpen(!isColorOpen);
              if (!isColorOpen) setIsFilterOpen(false);
            }}
            className="px-3 py-1 text-sm bg-stone-700 text-stone-100 border border-stone-600 rounded hover:bg-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
            aria-label="カラーパネルの表示切り替え"
            aria-expanded={isColorOpen}
          >
            カラー {isColorOpen ? '▲' : '▼'}
          </button>

          {loadMeta && (
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <span>
                {loadMeta.loadedEdges.toLocaleString()} / {loadMeta.totalEdges.toLocaleString()} edges
              </span>
              {loadMeta.isPartial && onLoadCompleteGraph && (
                <button
                  onClick={onLoadCompleteGraph}
                  disabled={isLoadingFullGraph}
                  className={`
                    px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-orange-500
                    ${
                      isLoadingFullGraph
                        ? 'bg-stone-800 text-stone-500 border-stone-700 cursor-wait'
                        : 'bg-stone-700 text-stone-100 border-stone-600 hover:bg-stone-600'
                    }
                  `}
                  title="全件グラフを読み込む"
                >
                  {isLoadingFullGraph ? '読み込み中...' : '全件読み込み'}
                </button>
              )}
            </div>
          )}

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

          {/* 除外インジケータ */}
          {filter.excludeNodeIds?.length > 0 && onClearExcluded && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-900 border border-red-700 rounded">
              <span className="text-sm text-red-300">
                除外: {filter.excludeNodeIds.length}件
              </span>
              <button
                onClick={onClearExcluded}
                className="text-red-400 hover:text-red-200 focus:outline-none"
                aria-label="除外をクリア"
                title="除外をクリア"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* 右側: 保存・開く、ズームコントロール、エクスポート */}
        <div className="flex items-center gap-2">
          {/* 保存・開くボタン */}
          <div className="flex items-center gap-1 border-r border-stone-700 pr-2">
            <button
              onClick={() => setIsSaveDialogOpen(true)}
              className="px-3 py-1 text-sm bg-stone-700 text-stone-100 border border-stone-600 rounded hover:bg-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
              aria-label="グラフ設定を保存"
              title="名前を付けて保存"
            >
              💾
            </button>
            <button
              onClick={() => setIsOpenDialogOpen(true)}
              disabled={savedSettings.length === 0}
              className={`
                px-3 py-1 text-sm rounded border focus:outline-none focus:ring-2 focus:ring-orange-500
                ${
                  savedSettings.length === 0
                    ? 'bg-stone-800 text-stone-500 border-stone-700 cursor-not-allowed'
                    : 'bg-stone-700 text-stone-100 border-stone-600 hover:bg-stone-600'
                }
              `}
              aria-label="保存済みグラフ設定を開く"
              title="保存済みグラフ設定を開く"
            >
              📂
            </button>
          </div>

          {/* ズームコントロール */}
          {(onZoomIn || onZoomOut || onFitToScreen) && (
            <div className="flex items-center gap-1 border-r border-stone-700 pr-2">
              {onZoomIn && (
                <button
                  onClick={onZoomIn}
                  className="w-8 h-8 bg-stone-700 text-stone-100 border border-stone-600 rounded hover:bg-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  aria-label="ズームイン"
                  title="ズームイン"
                >
                  +
                </button>
              )}
              {onZoomOut && (
                <button
                  onClick={onZoomOut}
                  className="w-8 h-8 bg-stone-700 text-stone-100 border border-stone-600 rounded hover:bg-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  aria-label="ズームアウト"
                  title="ズームアウト"
                >
                  -
                </button>
              )}
              {onFitToScreen && (
                <button
                  onClick={onFitToScreen}
                  className="px-2 h-8 bg-stone-700 text-stone-100 border border-stone-600 rounded hover:bg-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
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
                className="px-3 py-1 text-sm bg-stone-700 text-stone-100 border border-stone-600 rounded hover:bg-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                aria-label="PNG形式でエクスポート"
              >
                PNG
              </button>
              <button
                onClick={() => onExport('svg')}
                className="px-3 py-1 text-sm bg-stone-700 text-stone-100 border border-stone-600 rounded hover:bg-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                aria-label="SVG形式でエクスポート"
              >
                SVG
              </button>
            </div>
          )}
        </div>
      </div>

      {/* フィルタパネル（absolute 配置でツールバー高さに影響しない） */}
      {isFilterOpen && (
        <div className="absolute left-0 right-0 top-full z-40 bg-stone-800 border-b border-stone-700 p-3">
          {/* 表示オプション */}
          <div>
            <h3 className="text-sm font-semibold text-stone-300 mb-2">
              表示オプション
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleIsolatedToggle}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  filter.includeIsolated
                    ? 'bg-orange-600/30 border-orange-500 text-orange-300'
                    : 'bg-stone-700/50 border-stone-600 text-stone-500 hover:text-stone-300'
                }`}
              >
                孤立ノード表示
              </button>
              <button
                onClick={handleConsolidateToggle}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  filter.consolidateEdges
                    ? 'bg-orange-600/30 border-orange-500 text-orange-300'
                    : 'bg-stone-700/50 border-stone-600 text-stone-500 hover:text-stone-300'
                }`}
              >
                重複エッジ省略
              </button>
            </div>
          </div>
        </div>
      )}

      {/* カラーパネル（absolute 配置でツールバー高さに影響しない） */}
      {isColorOpen && (
        <div className="absolute left-0 right-0 top-full z-40 bg-stone-800 border-b border-stone-700 p-3 max-h-[80vh] overflow-y-auto">
          <div>
            <h3 className="text-sm font-semibold text-stone-300 mb-2">
              ノード色設定
            </h3>
            <ColorRulesPanel
              rules={colorRules}
              onRulesChange={onColorRulesChange}
            />
          </div>
        </div>
      )}

      {/* 保存ダイアログ */}
      <GraphSaveDialog
        isOpen={isSaveDialogOpen}
        existingSaves={savedSettings}
        onConfirm={(name, existingId) => {
          onSave(name, existingId);
          setIsSaveDialogOpen(false);
        }}
        onCancel={() => setIsSaveDialogOpen(false)}
      />

      {/* 開くダイアログ */}
      <GraphOpenDialog
        isOpen={isOpenDialogOpen}
        savedSettings={savedSettings}
        onSelect={(saved) => {
          onOpen(saved);
          setIsOpenDialogOpen(false);
        }}
        onDelete={onDeleteSaved}
        onCancel={() => setIsOpenDialogOpen(false)}
      />
    </div>
  );
}
