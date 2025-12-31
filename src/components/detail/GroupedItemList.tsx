/**
 * GroupedItemList コンポーネント
 *
 * ファイル内のアイテムをグループ化して表示する。
 * - Enum グループ
 * - Struct グループ
 * - Trait グループ
 * - Functions グループ
 */

import { useMemo } from 'react';
import type { CodeItem, ItemId, SemanticTest } from '@/types/schema';
import { groupItems } from '@/utils/itemGrouper';
import { StructGroupView } from './StructGroupView';

interface GroupedItemListProps {
  /** ファイル内のすべてのCodeItem */
  items: CodeItem[];
  /** セマンティックテスト情報 */
  semanticTests: SemanticTest[];
  /** アイテム選択時のコールバック */
  onSelectItem: (id: ItemId) => void;
}

/**
 * グループ化されたアイテム一覧コンポーネント
 */
export function GroupedItemList({
  items,
  semanticTests,
  onSelectItem,
}: GroupedItemListProps) {
  const grouped = useMemo(
    () => groupItems(items, semanticTests),
    [items, semanticTests]
  );

  if (items.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>このファイルにはアイテムがありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enum グループ */}
      {grouped.enums.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-orange-400 mb-2 flex items-center gap-2">
            <span>Enum</span>
            <span className="text-gray-500 font-normal">({grouped.enums.length})</span>
          </h3>
          {grouped.enums.map(group => (
            <StructGroupView
              key={group.item.id}
              group={group}
              onSelectItem={onSelectItem}
            />
          ))}
        </section>
      )}

      {/* Struct グループ */}
      {grouped.structs.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-cyan-400 mb-2 flex items-center gap-2">
            <span>Struct</span>
            <span className="text-gray-500 font-normal">({grouped.structs.length})</span>
          </h3>
          {grouped.structs.map(group => (
            <StructGroupView
              key={group.item.id}
              group={group}
              onSelectItem={onSelectItem}
            />
          ))}
        </section>
      )}

      {/* Trait グループ */}
      {grouped.traits.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-pink-400 mb-2 flex items-center gap-2">
            <span>Trait</span>
            <span className="text-gray-500 font-normal">({grouped.traits.length})</span>
          </h3>
          <div className="space-y-2">
            {grouped.traits.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectItem(item.id)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded hover:bg-gray-750 text-left transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-200">{item.name}</span>
                  <span className="px-2 py-0.5 text-xs font-medium bg-pink-600/20 text-pink-400 rounded">
                    trait
                  </span>
                  {item.visibility === 'pub' && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-600/20 text-green-400 rounded">
                      pub
                    </span>
                  )}
                </div>
                {item.summary && (
                  <p className="text-sm text-gray-500 mt-1">{item.summary}</p>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Functions グループ */}
      {grouped.functions.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-2">
            <span>Functions</span>
            <span className="text-gray-500 font-normal">({grouped.functions.length})</span>
          </h3>
          <div className="space-y-2">
            {grouped.functions.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectItem(item.id)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded hover:bg-gray-750 text-left transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400">{item.name}()</span>
                  <span className="px-2 py-0.5 text-xs font-medium bg-yellow-600/20 text-yellow-400 rounded">
                    fn
                  </span>
                  {item.visibility === 'pub' && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-600/20 text-green-400 rounded">
                      pub
                    </span>
                  )}
                  {item.is_async && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-purple-600/20 text-purple-400 rounded">
                      async
                    </span>
                  )}
                </div>
                {item.summary && (
                  <p className="text-sm text-gray-500 mt-1">{item.summary}</p>
                )}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
