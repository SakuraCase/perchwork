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
import { Badge } from '@/components/common/Badge';

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
      <div className="text-center text-stone-500 py-8">
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
            <span className="text-stone-500 font-normal">({grouped.enums.length})</span>
          </h3>
          {grouped.enums.map((group) => (
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
            <span className="text-stone-500 font-normal">({grouped.structs.length})</span>
          </h3>
          {grouped.structs.map((group) => (
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
            <span className="text-stone-500 font-normal">({grouped.traits.length})</span>
          </h3>
          <div className="space-y-2">
            {grouped.traits.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectItem(item.id)}
                className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded hover:bg-stone-750 text-left transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-200">{item.name}</span>
                  <Badge variant="trait" withBorder={false}>
                    trait
                  </Badge>
                  {item.visibility === 'pub' && (
                    <Badge variant="pub" withBorder={false}>
                      pub
                    </Badge>
                  )}
                </div>
                {item.summary && (
                  <p className="text-sm text-stone-500 mt-1">{item.summary}</p>
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
            <span className="text-stone-500 font-normal">
              ({grouped.functions.length})
            </span>
          </h3>
          <div className="space-y-2">
            {grouped.functions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectItem(item.id)}
                className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded hover:bg-stone-750 text-left transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400">{item.name}()</span>
                  <Badge variant="fn" withBorder={false}>
                    fn
                  </Badge>
                  {item.visibility === 'pub' && (
                    <Badge variant="pub" withBorder={false}>
                      pub
                    </Badge>
                  )}
                  {item.is_async && (
                    <Badge variant="async" withBorder={false}>
                      async
                    </Badge>
                  )}
                </div>
                {item.summary && (
                  <p className="text-sm text-stone-500 mt-1">{item.summary}</p>
                )}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
