/**
 * StructGroupView コンポーネント
 *
 * Struct/Enum のグループ表示。
 * フィールド、メソッド、各メソッドに紐づくテストを階層的に表示する。
 */

import { useState } from 'react';
import type { StructGroup, MethodWithTests } from '@/utils/itemGrouper';
import type { ItemId } from '@/types/schema';
import { Badge } from '@/components/common/Badge';
import { CompactTestItem } from '@/components/common/TestItem';
import { typeToVariant } from '@/utils/badgeStyles';

interface StructGroupViewProps {
  /** Struct/Enum グループデータ */
  group: StructGroup;
  /** アイテム選択時のコールバック */
  onSelectItem: (id: ItemId) => void;
}

/**
 * Struct/Enum のグループ表示コンポーネント
 */
export function StructGroupView({ group, onSelectItem }: StructGroupViewProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border border-gray-700 rounded mb-2">
      {/* ヘッダー: Struct/Enum 名 + バッジ */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-750 rounded-t flex items-center gap-2 text-left transition-colors"
      >
        <span
          className={`transform transition-transform text-gray-400 text-xs ${
            expanded ? 'rotate-90' : ''
          }`}
        >
          ▶
        </span>
        <span className="font-semibold text-gray-200">{group.item.name}</span>
        <Badge variant={typeToVariant(group.item.type)} withBorder={false}>
          {group.item.type}
        </Badge>
        {group.item.visibility === 'pub' && (
          <Badge variant="pub" withBorder={false}>
            pub
          </Badge>
        )}
        {group.methods.length > 0 && (
          <span className="text-xs text-gray-500 ml-auto">
            {group.methods.length} メソッド
          </span>
        )}
      </button>

      {/* 概要（ヘッダー直下、展開状態に関係なく表示） */}
      {group.item.summary && (
        <p className="px-4 py-1 text-sm text-gray-500">
          {group.item.summary}
        </p>
      )}

      {expanded && (
        <div className="px-4 py-3 space-y-3 bg-gray-850">
          {/* 責務 */}
          {group.item.responsibility && (
            <div className="text-sm">
              <div className="text-gray-500 mb-1">責務:</div>
              <p className="text-gray-300">{group.item.responsibility}</p>
            </div>
          )}

          {/* フィールド/バリアント */}
          {group.fields.length > 0 && (
            <div className="text-sm">
              <div className="text-gray-500 mb-1">
                {group.item.type === 'enum' ? 'バリアント:' : 'フィールド:'}
              </div>
              <div className="space-y-0.5">
                {group.fields.map((field, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-gray-300">{field.name}</span>
                    {field.type && (
                      <>
                        <span className="text-gray-500">:</span>
                        <span className="text-cyan-400 font-mono text-xs">
                          {field.type}
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 直接テスト（struct/enum自体をテストするもの） */}
          {group.directTests.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-gray-500 mb-1">直接テスト:</div>
              {group.directTests.map((test) => (
                <CompactTestItem key={test.id} testId={test.id} summary={test.summary} showName={false} />
              ))}
            </div>
          )}

          {/* メソッド一覧 */}
          {group.methods.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-gray-500 mb-1">関数一覧:</div>
              {group.methods.map((method) => (
                <MethodView
                  key={method.item.id}
                  method={method}
                  onSelectItem={onSelectItem}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface MethodViewProps {
  method: MethodWithTests;
  onSelectItem: (id: ItemId) => void;
}

/**
 * メソッド表示コンポーネント
 */
function MethodView({ method, onSelectItem }: MethodViewProps) {
  const [expanded, setExpanded] = useState(true);
  const hasTests = method.tests.length > 0;

  return (
    <div>
      <div className="flex items-center gap-1 py-1.5 px-2 hover:bg-gray-800 rounded transition-colors">
        {/* メソッド名（クリックで詳細へ遷移） */}
        <button
          type="button"
          onClick={() => onSelectItem(method.item.id)}
          className="flex items-center gap-2 hover:underline"
          title="詳細を表示"
        >
          <span className="text-blue-400">{method.item.name}()</span>
        </button>

        {/* バッジ類 */}
        {method.item.visibility === 'pub' && (
          <span className="text-xs text-gray-400">[pub]</span>
        )}
        {method.item.trait_name && (
          <span className="text-xs text-pink-400">[{method.item.trait_name}]</span>
        )}
        {method.item.is_async && (
          <span className="text-xs text-purple-400">[async]</span>
        )}

        {/* テスト数と展開アイコン（右側） */}
        {hasTests && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="ml-auto flex items-center gap-1 p-1 hover:bg-gray-700 rounded transition-colors"
            title="テストを展開/折りたたみ"
          >
            <span className="text-xs text-gray-500">({method.tests.length} テスト)</span>
            <span
              className={`text-xs text-gray-400 transform transition-transform inline-block ${
                expanded ? 'rotate-180' : ''
              }`}
            >
              ▼
            </span>
          </button>
        )}
      </div>

      {/* メソッド概要（常に表示） */}
      {method.item.summary && (
        <p className="pl-4 text-sm text-gray-500">{method.item.summary}</p>
      )}

      {/* 関連テスト */}
      {expanded && hasTests && (
        <div className="pl-4 space-y-1 mt-1">
          {method.tests.map((test) => (
            <CompactTestItem
              key={test.id}
              testId={test.id}
              summary={test.summary}
              showName={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
