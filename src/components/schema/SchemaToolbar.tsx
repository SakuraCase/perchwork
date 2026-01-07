/**
 * SchemaToolbar.tsx
 *
 * スキーマグラフのツールバー（グラフツールバー風）
 */

import { useState, useCallback } from 'react';
import type {
  SchemaFilter,
  SchemaGraphStats,
  SchemaLayoutType,
  SavedSchemaSettings,
} from '../../types/schemaGraph';
import { SchemaSaveDialog } from './SchemaSaveDialog';
import { SchemaOpenDialog } from './SchemaOpenDialog';

interface SchemaToolbarProps {
  filter: SchemaFilter;
  onFilterChange: (filter: SchemaFilter) => void;
  stats: SchemaGraphStats;
  layoutType: SchemaLayoutType;
  onLayoutChange: (layout: SchemaLayoutType) => void;
  onClearFocus?: () => void;
  onClearExclude?: () => void;
  /** 保存済み設定一覧 */
  savedSettings: SavedSchemaSettings[];
  /** 保存時のコールバック */
  onSave: (name: string, existingId?: string) => void;
  /** 設定を開く時のコールバック */
  onOpen: (saved: SavedSchemaSettings) => void;
  /** 保存済み設定を削除する時のコールバック */
  onDeleteSaved: (id: string) => void;
}

/** レイアウトタイプの選択肢 */
const LAYOUT_OPTIONS: { value: SchemaLayoutType; label: string }[] = [
  { value: 'hierarchy', label: '階層' },
  { value: 'force', label: '力学' },
  { value: 'grid', label: 'グリッド' },
];

export function SchemaToolbar({
  filter,
  onFilterChange,
  stats,
  layoutType,
  onLayoutChange,
  onClearFocus,
  onClearExclude,
  savedSettings,
  onSave,
  onOpen,
  onDeleteSaved,
}: SchemaToolbarProps) {
  // フィルタパネルの開閉状態
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  // 保存ダイアログの表示/非表示状態
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  // 開くダイアログの表示/非表示状態
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);

  // レイアウト変更ハンドラ
  const handleLayoutChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      onLayoutChange(event.target.value as SchemaLayoutType);
    },
    [onLayoutChange]
  );

  // 型フィルタの切り替え
  const toggleType = useCallback(
    (type: 'struct' | 'enum') => {
      const newTypes = filter.types.includes(type)
        ? filter.types.filter((t) => t !== type)
        : [...filter.types, type];
      // 最低1つは選択されている必要がある
      if (newTypes.length > 0) {
        onFilterChange({ ...filter, types: newTypes });
      }
    },
    [filter, onFilterChange]
  );

  // 可視性フィルタの切り替え
  const toggleVisibility = useCallback(
    (visibility: 'pub' | 'pub(crate)' | 'pub(super)' | 'private') => {
      const newVisibility = filter.visibility.includes(visibility)
        ? filter.visibility.filter((v) => v !== visibility)
        : [...filter.visibility, visibility];
      if (newVisibility.length > 0) {
        onFilterChange({ ...filter, visibility: newVisibility });
      }
    },
    [filter, onFilterChange]
  );

  // hideEmptyStructsトグル
  const toggleHideEmptyStructs = useCallback(() => {
    onFilterChange({ ...filter, hideEmptyStructs: !filter.hideEmptyStructs });
  }, [filter, onFilterChange]);

  // showIsolatedNodesトグル
  const toggleShowIsolatedNodes = useCallback(() => {
    onFilterChange({ ...filter, showIsolatedNodes: !filter.showIsolatedNodes });
  }, [filter, onFilterChange]);

  return (
    <div className="relative bg-stone-800 border-b border-stone-700 p-3">
      <div className="flex items-center justify-between gap-4">
        {/* 左側: 統計、レイアウト選択、フィルタ */}
        <div className="flex items-center gap-4">
          {/* 統計情報 */}
          <div className="flex items-center gap-3 text-xs text-stone-400">
            <span className="flex items-center gap-1">
              <span className="text-teal-400">◇</span>
              {stats.totalStructs} struct
            </span>
            <span className="flex items-center gap-1">
              <span className="text-amber-400">◆</span>
              {stats.totalEnums} enum
            </span>
          </div>

          {/* レイアウトセレクター */}
          <div className="flex items-center gap-2">
            <label htmlFor="schema-layout-select" className="text-sm text-stone-300">
              レイアウト:
            </label>
            <select
              id="schema-layout-select"
              value={layoutType}
              onChange={handleLayoutChange}
              className="bg-stone-700 text-stone-100 border border-stone-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
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
            className="px-3 py-1 text-sm bg-stone-700 text-stone-100 border border-stone-600 rounded hover:bg-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            フィルタ {isFilterOpen ? '▲' : '▼'}
          </button>

          {/* フォーカスインジケータ */}
          {filter.focusNodeId && onClearFocus && (
            <div className="flex items-center gap-2 px-3 py-1 bg-orange-900/50 border border-orange-700 rounded">
              <span className="text-sm text-orange-300">
                フォーカス: {filter.focusNodeId}
              </span>
              <button
                onClick={onClearFocus}
                className="text-orange-400 hover:text-orange-200 focus:outline-none"
                title="フォーカスを解除"
              >
                ✕
              </button>
            </div>
          )}

          {/* 除外インジケータ */}
          {filter.excludeNodeIds.length > 0 && onClearExclude && (
            <div className="flex items-center gap-2 px-3 py-1 bg-stone-700 border border-stone-600 rounded">
              <span className="text-sm text-stone-300">
                除外: {filter.excludeNodeIds.length}件
              </span>
              <button
                onClick={onClearExclude}
                className="text-stone-400 hover:text-stone-200 focus:outline-none"
                title="除外をクリア"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* 右側: 保存・開くボタン */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsSaveDialogOpen(true)}
            className="px-3 py-1 text-sm bg-stone-700 text-stone-100 border border-stone-600 rounded hover:bg-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
            aria-label="スキーマ設定を保存"
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
            aria-label="保存済みスキーマ設定を開く"
            title="保存済みスキーマ設定を開く"
          >
            📂
          </button>
        </div>
      </div>

      {/* フィルタパネル */}
      {isFilterOpen && (
        <div className="absolute left-0 right-0 top-full z-40 bg-stone-800 border-b border-stone-700 p-4">
          <div className="flex flex-wrap gap-6">
            {/* 型フィルタ */}
            <div>
              <h3 className="text-sm font-semibold text-stone-300 mb-2">型</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleType('struct')}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    filter.types.includes('struct')
                      ? 'bg-teal-600/30 border-teal-500 text-teal-300'
                      : 'bg-stone-700/50 border-stone-600 text-stone-500 hover:text-stone-300'
                  }`}
                >
                  <span className="text-teal-400 mr-1">◇</span>
                  struct
                </button>
                <button
                  onClick={() => toggleType('enum')}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    filter.types.includes('enum')
                      ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                      : 'bg-stone-700/50 border-stone-600 text-stone-500 hover:text-stone-300'
                  }`}
                >
                  <span className="text-amber-400 mr-1">◆</span>
                  enum
                </button>
              </div>
            </div>

            {/* 可視性フィルタ */}
            <div>
              <h3 className="text-sm font-semibold text-stone-300 mb-2">可視性</h3>
              <div className="flex flex-wrap gap-2">
                {(['pub', 'pub(crate)', 'pub(super)', 'private'] as const).map((vis) => (
                  <button
                    key={vis}
                    onClick={() => toggleVisibility(vis)}
                    className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                      filter.visibility.includes(vis)
                        ? 'bg-orange-600/30 border-orange-500 text-orange-300'
                        : 'bg-stone-700/50 border-stone-600 text-stone-500 hover:text-stone-300'
                    }`}
                  >
                    {vis}
                  </button>
                ))}
              </div>
            </div>

            {/* 表示オプション */}
            <div>
              <h3 className="text-sm font-semibold text-stone-300 mb-2">表示オプション</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={toggleHideEmptyStructs}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    filter.hideEmptyStructs
                      ? 'bg-orange-600/30 border-orange-500 text-orange-300'
                      : 'bg-stone-700/50 border-stone-600 text-stone-500 hover:text-stone-300'
                  }`}
                >
                  空struct非表示
                </button>
                <button
                  onClick={toggleShowIsolatedNodes}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    filter.showIsolatedNodes
                      ? 'bg-orange-600/30 border-orange-500 text-orange-300'
                      : 'bg-stone-700/50 border-stone-600 text-stone-500 hover:text-stone-300'
                  }`}
                >
                  孤立ノード表示
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 保存ダイアログ */}
      <SchemaSaveDialog
        isOpen={isSaveDialogOpen}
        existingSaves={savedSettings}
        onConfirm={(name, existingId) => {
          onSave(name, existingId);
          setIsSaveDialogOpen(false);
        }}
        onCancel={() => setIsSaveDialogOpen(false)}
      />

      {/* 開くダイアログ */}
      <SchemaOpenDialog
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
