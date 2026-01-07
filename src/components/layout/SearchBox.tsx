/**
 * SearchBox.tsx
 *
 * ヘッダー検索ボックスコンポーネント
 * ID部分一致で候補をプルダウン表示
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { ItemId } from '../../types/schema';
import type { ViewTab } from '../../types/view';
import type { SearchIndexItem } from '../../hooks/useSearchIndex';
import { useDebounce } from '../../hooks/useDebounce';

/** 最大表示候補数 */
const MAX_CANDIDATES = 10;

/** 同一structの最大表示数 */
const MAX_PER_STRUCT = 3;

/** デバウンス遅延（ミリ秒） */
const DEBOUNCE_DELAY = 150;

interface SearchBoxProps {
  /** 検索候補データ */
  items: SearchIndexItem[];
  /** ローディング中かどうか */
  isLoading: boolean;
  /** 現在のビュータブ */
  activeTab: ViewTab;
  /** グラフモード: ノード選択時のコールバック */
  onSelectGraphNode: (nodeId: string, filePath: string) => void;
  /** ツリーモード: アイテム選択時のコールバック */
  onSelectTreeItem: (filePath: string, itemId: ItemId) => void;
  /** シーケンスモード: メソッド/関数選択時のコールバック */
  onSelectSequenceMethod?: (methodId: ItemId) => void;
}

/**
 * アイテムタイプに対応するバッジカラーを取得
 */
function getTypeBadgeColor(type: string): string {
  switch (type) {
    case 'struct':
      return 'bg-emerald-600';
    case 'enum':
      return 'bg-amber-600';
    case 'fn':
      return 'bg-indigo-600';
    case 'method':
      return 'bg-orange-600';
    case 'trait':
      return 'bg-red-600';
    case 'impl':
      return 'bg-purple-600';
    default:
      return 'bg-stone-600';
  }
}

/**
 * ヘッダー検索ボックス
 */
export function SearchBox({
  items,
  isLoading,
  activeTab,
  onSelectGraphNode,
  onSelectTreeItem,
  onSelectSequenceMethod,
}: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // デバウンス処理
  const debouncedQuery = useDebounce(query, DEBOUNCE_DELAY);

  // 候補のフィルタリング（同一struct制限付き）
  const candidates = useMemo(() => {
    if (!debouncedQuery.trim()) return [];

    const lowerQuery = debouncedQuery.toLowerCase();
    const result: SearchIndexItem[] = [];
    const structCount = new Map<string, number>();

    for (const item of items) {
      if (!item.id.toLowerCase().includes(lowerQuery)) continue;

      // シーケンスタブではメソッド/関数のみ表示
      if (activeTab === 'sequence') {
        if (item.type !== 'method' && item.type !== 'fn') continue;
      }

      // 同一structの制限チェック
      if (item.structName) {
        const count = structCount.get(item.structName) ?? 0;
        if (count >= MAX_PER_STRUCT) continue;
        structCount.set(item.structName, count + 1);
      }

      result.push(item);
      if (result.length >= MAX_CANDIDATES) break;
    }

    return result;
  }, [debouncedQuery, items, activeTab]);

  // 選択インデックスを候補数内に収める
  const safeSelectedIndex = Math.min(selectedIndex, Math.max(0, candidates.length - 1));

  // 外部クリックでドロップダウンを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 候補選択時の処理
  const handleSelect = useCallback(
    (item: SearchIndexItem) => {
      if (activeTab === 'graph') {
        onSelectGraphNode(item.id, item.filePath);
      } else if (activeTab === 'sequence') {
        onSelectSequenceMethod?.(item.id);
      } else {
        onSelectTreeItem(item.filePath, item.id);
      }

      // 検索をクリア
      setQuery('');
      setIsOpen(false);
    },
    [activeTab, onSelectGraphNode, onSelectTreeItem, onSelectSequenceMethod]
  );

  // キーボードナビゲーション
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen || candidates.length === 0) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev < candidates.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          event.preventDefault();
          if (candidates[safeSelectedIndex]) {
            handleSelect(candidates[safeSelectedIndex]);
          }
          break;
        case 'Escape':
          event.preventDefault();
          setIsOpen(false);
          inputRef.current?.blur();
          break;
      }
    },
    [isOpen, candidates, safeSelectedIndex, handleSelect]
  );

  return (
    <div className="relative" ref={containerRef}>
      {/* 検索入力欄 */}
      <div className="flex items-center bg-stone-800 border border-stone-700 rounded px-3 py-1.5 focus-within:border-orange-500 transition-colors">
        {/* 検索アイコン */}
        <svg
          className="w-4 h-4 text-stone-400 mr-2 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="ID検索..."
          className="bg-transparent text-stone-100 text-sm focus:outline-none w-48 placeholder-stone-500"
        />

        {/* ローディングスピナー */}
        {isLoading && (
          <svg
            className="w-4 h-4 text-stone-400 animate-spin ml-2 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
      </div>

      {/* ドロップダウン候補リスト */}
      {isOpen && query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-stone-800 border border-stone-700 rounded shadow-lg z-50 max-h-80 overflow-y-auto">
          {candidates.length > 0 ? (
            candidates.map((item, index) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full px-3 py-2 text-left flex items-center justify-between transition-colors ${
                  index === safeSelectedIndex
                    ? 'bg-stone-700'
                    : 'hover:bg-stone-700/50'
                }`}
              >
                <span className="text-sm text-stone-100 truncate flex-1 mr-2">
                  {item.displayName}
                </span>
                <span
                  className={`text-xs text-white px-1.5 py-0.5 rounded ${getTypeBadgeColor(item.type)}`}
                >
                  {item.type}
                </span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-stone-500">
              候補が見つかりません
            </div>
          )}
        </div>
      )}
    </div>
  );
}
