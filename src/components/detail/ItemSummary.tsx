/**
 * ItemSummary コンポーネント
 *
 * 選択されたコードアイテムの詳細情報を表示する。
 * 概要、責務、シグネチャ、テスト参照、フィールド、依存関係を視覚的に提示。
 * childrenはテストセクションの後に挿入される（Callers等）。
 */

import type { ReactNode } from 'react';
import type { CodeItem, SemanticTest } from '@/types/schema';
import { normalizeId, type TestInfo } from '@/utils/itemGrouper';

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
 * 可視性バッジのスタイルを取得
 * @param visibility - アイテムの可視性
 * @returns Tailwind CSSクラス文字列
 */
const getVisibilityBadgeClass = (visibility?: string): string => {
  switch (visibility) {
    case 'pub':
      return 'bg-green-600/20 text-green-400 border-green-600/30';
    case 'pub(crate)':
      return 'bg-blue-600/20 text-blue-400 border-blue-600/30';
    case 'pub(super)':
      return 'bg-purple-600/20 text-purple-400 border-purple-600/30';
    case 'private':
      return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
    default:
      return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
  }
};

/**
 * アイテムタイプバッジのスタイルを取得
 * @param type - アイテムのタイプ
 * @returns Tailwind CSSクラス文字列
 */
const getTypeBadgeClass = (type: string): string => {
  switch (type) {
    case 'fn':
      return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30';
    case 'struct':
      return 'bg-cyan-600/20 text-cyan-400 border-cyan-600/30';
    case 'enum':
      return 'bg-orange-600/20 text-orange-400 border-orange-600/30';
    case 'trait':
      return 'bg-pink-600/20 text-pink-400 border-pink-600/30';
    case 'impl':
      return 'bg-indigo-600/20 text-indigo-400 border-indigo-600/30';
    case 'method':
      return 'bg-lime-600/20 text-lime-400 border-lime-600/30';
    default:
      return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
  }
};

/**
 * ItemSummaryコンポーネント
 *
 * コードアイテムの詳細情報を階層的に表示。
 * シグネチャはコードブロック風に、テスト・依存関係はセクション化して提示。
 * 表示順序: 概要 → 責務 → シグネチャ → テスト → children(Callers) → フィールド → 依存関係
 */
/**
 * テストIDから表示名を抽出
 * 形式: "file.rs::test_function_name::test"
 * 例: "unit_collection.rs::test_new::test" → "test_new"
 */
function extractTestName(testId: string): string {
  const parts = testId.split('::');
  // 最後から2番目のセグメント（テスト関数名）を取得
  return parts.length >= 2 ? parts[parts.length - 2] : testId;
}

export function ItemSummary({
  item,
  semanticTests = [],
  children,
  testsExpanded = true,
  onToggleTests
}: ItemSummaryProps) {
  // semanticTestsからこのアイテムに紐づくテストを検索
  const normalizedItemId = normalizeId(item.id);
  const itemTests: TestInfo[] = semanticTests
    .filter((test) => test.tested_item && normalizeId(test.tested_item) === normalizedItemId)
    .map((test) => ({ id: test.id, summary: test.summary }));

  return (
    <div className="space-y-4">
      {/* ヘッダー: バッジと名前 */}
      <div className="border-b border-gray-700 pb-4 overflow-hidden">
        {/* タグ（上段） */}
        <div className="flex items-center gap-2 mb-2">
          {/* タイプバッジ */}
          <span
            className={`px-2 py-1 text-xs font-medium rounded border ${getTypeBadgeClass(item.type)}`}
          >
            {item.type}
          </span>
          {/* 可視性バッジ */}
          {item.visibility && (
            <span
              className={`px-2 py-1 text-xs font-medium rounded border ${getVisibilityBadgeClass(item.visibility)}`}
            >
              {item.visibility}
            </span>
          )}
        </div>
        {/* 名前（下段、長い場合は省略） */}
        <h2 className="text-xl font-bold text-gray-100 truncate" title={item.name}>
          {item.name}
        </h2>
        {/* 行番号 */}
        <p className="text-sm text-gray-500">
          行: {item.line_start}
          {item.line_end && ` - ${item.line_end}`}
        </p>
      </div>

      {/* 概要（存在する場合のみ） */}
      {item.summary && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-2">概要</h3>
          <p className="text-gray-300 text-sm leading-relaxed">{item.summary}</p>
        </div>
      )}

      {/* 責務（存在する場合のみ） */}
      {item.responsibility && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-2">責務</h3>
          <p className="text-gray-300 text-sm leading-relaxed">{item.responsibility}</p>
        </div>
      )}

      {/* シグネチャ */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 mb-2">シグネチャ</h3>
        <pre className="bg-gray-800 border border-gray-700 rounded p-3 overflow-x-auto">
          <code className="text-sm font-mono text-gray-300 whitespace-pre">
            {item.signature}
          </code>
        </pre>
      </div>

      {/* テスト参照（semanticTestsから直接取得） */}
      {itemTests.length > 0 && (
        <div>
          <button
            type="button"
            onClick={onToggleTests}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-750 rounded transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-200">
                テスト
              </span>
              <span className="text-xs text-gray-500">
                ({itemTests.length}件)
              </span>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${
                testsExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {testsExpanded && (
            <div className="mt-2 space-y-2">
              {itemTests.map((test) => (
                <div
                  key={test.id}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-left hover:bg-gray-750 hover:border-green-600/50 transition-colors overflow-hidden"
                  title={test.id}
                >
                  <div className="text-sm font-mono text-green-400 truncate">
                    {extractTestName(test.id)}
                  </div>
                  {test.summary && (
                    <div className="text-xs text-gray-400 mt-1 truncate">
                      {test.summary}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* children: Callersセクション等 */}
      {children}

      {/* フィールド一覧（struct/enumのみ） */}
      {item.fields && item.fields.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-2">
            {item.type === 'enum' ? 'バリアント' : 'フィールド'} ({item.fields.length})
          </h3>
          <div className="bg-gray-800 border border-gray-700 rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-750 border-b border-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-400">名前</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-400">型</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {item.fields.map((field) => (
                  <tr key={field.name} className="hover:bg-gray-750 transition-colors">
                    <td className="px-3 py-2 font-mono text-cyan-400">{field.name}</td>
                    <td className="px-3 py-2 font-mono text-gray-300">{field.type || '-'}</td>
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
          <h3 className="text-sm font-semibold text-gray-400 mb-2">
            依存関係 ({item.depends_on.length})
          </h3>
          <div className="space-y-1">
            {item.depends_on.map((dep) => (
              <div
                key={dep}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm font-mono text-gray-400 hover:bg-gray-750 hover:border-gray-600 transition-colors cursor-pointer"
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
