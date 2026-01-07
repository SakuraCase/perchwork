/**
 * ItemSummary コンポーネント
 *
 * 選択されたコードアイテムの詳細情報を表示する。
 * 概要、責務、シグネチャ、テスト参照、フィールド、依存関係を視覚的に提示。
 * childrenはテストセクションの後に挿入される（Callers等）。
 */

import type { ReactNode } from 'react';
import type { CodeItem, SemanticTest } from '@/types/schema';
import type { TestInfo } from '@/utils/itemGrouper';
import { Badge } from '@/components/common/Badge';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import { TestItem } from '@/components/common/TestItem';
import { typeToVariant, visibilityToVariant } from '@/utils/badgeStyles';

interface ItemSummaryProps {
  /** 表示対象のコードアイテム */
  item: CodeItem;
  /** セマンティックテスト情報 */
  semanticTests?: SemanticTest[];
  /** テストセクションの後に挿入されるコンテンツ（Callers等） */
  children?: ReactNode;
  /** テストセクションの展開状態 */
  testsExpanded?: boolean;
  /** テストセクションの展開切り替えコールバック */
  onToggleTests?: () => void;
}

/**
 * ItemSummaryコンポーネント
 *
 * コードアイテムの詳細情報を階層的に表示。
 * シグネチャはコードブロック風に、テスト・依存関係はセクション化して提示。
 * 表示順序: 概要 → 責務 → シグネチャ → テスト → children(Callers) → フィールド → 依存関係
 */
export function ItemSummary({
  item,
  semanticTests = [],
  children,
  testsExpanded = true,
  onToggleTests,
}: ItemSummaryProps) {
  // semanticTestsからこのアイテムに紐づくテストを検索
  const itemTests: TestInfo[] = semanticTests
    .filter((test) => test.tested_item === item.id)
    .map((test) => ({ id: test.id, summary: test.summary }));

  return (
    <div className="space-y-4">
      {/* ヘッダー: バッジと名前 */}
      <div className="border-b border-stone-700 pb-4 overflow-hidden">
        {/* タグ（上段） */}
        <div className="flex items-center gap-2 mb-2">
          {/* タイプバッジ */}
          <Badge variant={typeToVariant(item.type)}>{item.type}</Badge>
          {/* 可視性バッジ */}
          {item.visibility && (
            <Badge variant={visibilityToVariant(item.visibility)}>
              {item.visibility}
            </Badge>
          )}
        </div>
        {/* 名前（下段、長い場合は省略） */}
        <h2 className="text-xl font-bold text-stone-100 truncate" title={item.name}>
          {item.name}
        </h2>
        {/* 行番号 */}
        <p className="text-sm text-stone-500">
          行: {item.line_start}
          {item.line_end && ` - ${item.line_end}`}
        </p>
      </div>

      {/* 概要（存在する場合のみ） */}
      {item.summary && (
        <div>
          <h3 className="text-sm font-semibold text-stone-400 mb-2">概要</h3>
          <p className="text-stone-300 text-sm leading-relaxed">{item.summary}</p>
        </div>
      )}

      {/* 責務（存在する場合のみ） */}
      {item.responsibility && (
        <div>
          <h3 className="text-sm font-semibold text-stone-400 mb-2">責務</h3>
          <p className="text-stone-300 text-sm leading-relaxed">{item.responsibility}</p>
        </div>
      )}

      {/* シグネチャ */}
      <div>
        <h3 className="text-sm font-semibold text-stone-400 mb-2">シグネチャ</h3>
        <pre
          className="bg-stone-800 border border-stone-700 rounded p-3 overflow-hidden"
          title={item.signature}
        >
          <code className="text-sm font-mono text-stone-300 whitespace-nowrap truncate block">
            {item.signature}
          </code>
        </pre>
      </div>

      {/* テスト参照（semanticTestsから直接取得） */}
      {itemTests.length > 0 && onToggleTests && (
        <CollapsibleSection
          title="テスト"
          count={itemTests.length}
          expanded={testsExpanded}
          onToggle={onToggleTests}
        >
          <div className="space-y-2">
            {itemTests.map((test) => (
              <TestItem key={test.id} testId={test.id} summary={test.summary} />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* children: Callersセクション等 */}
      {children}

      {/* フィールド一覧（struct/enumのみ） */}
      {item.fields && item.fields.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-stone-400 mb-2">
            {item.type === 'enum' ? 'バリアント' : 'フィールド'} ({item.fields.length})
          </h3>
          <div className="bg-stone-800 border border-stone-700 rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-750 border-b border-stone-700">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-stone-400">名前</th>
                  <th className="px-3 py-2 text-left font-medium text-stone-400">型</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-700">
                {item.fields.map((field) => (
                  <tr key={field.name} className="hover:bg-stone-750 transition-colors">
                    <td className="px-3 py-2 font-mono text-cyan-400">{field.name}</td>
                    <td className="px-3 py-2 font-mono text-stone-300">
                      {field.type || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 依存関係（存在する場合のみ） */}
      {item.depends_on && item.depends_on.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-stone-400 mb-2">
            依存関係 ({item.depends_on.length})
          </h3>
          <div className="space-y-1">
            {item.depends_on.map((dep) => (
              <div
                key={dep}
                className="px-3 py-2 bg-stone-800 border border-stone-700 rounded text-sm font-mono text-stone-400 hover:bg-stone-750 hover:border-stone-600 transition-colors cursor-pointer"
              >
                {dep}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
