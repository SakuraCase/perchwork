/**
 * AffectedTestList コンポーネント
 *
 * 影響を受けるテストの一覧を表示するコンポーネント。
 * 直接テストと間接テストを区別して表示する。
 */

import type { ItemId } from '@/types/schema';
import type { TestInfo } from '@/types/callers';

interface AffectedTestListProps {
  /** 直接テスト（対象自身のテスト） */
  directTests: TestInfo[];
  /** 間接テスト（Callersのテスト） */
  indirectTests: TestInfo[];
  /** テスト選択時のコールバック */
  onSelectTest: (id: ItemId) => void;
}

/**
 * 個別テストアイテムのコンポーネント
 */
function TestItem({
  test,
  onSelect,
}: {
  test: TestInfo;
  onSelect: (id: ItemId) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(test.id)}
      className="w-full px-3 py-2 text-left text-sm bg-gray-800 border border-gray-700 rounded hover:bg-gray-750 hover:border-green-600/50 transition-colors"
    >
      {/* テスト名 */}
      <div className="flex items-center gap-2 mb-1">
        <span className="font-semibold text-green-400">{test.name}</span>
        {test.isDirect && (
          <span className="px-1.5 py-0.5 bg-green-600/20 text-green-400 text-xs font-medium rounded border border-green-600/30">
            直接
          </span>
        )}
      </div>

      {/* ファイル:行番号 */}
      <div className="text-xs text-gray-500 mb-1">
        {test.file}:{test.line}
      </div>

      {/* 紐づくソースアイテム（間接テストの場合） */}
      {!test.isDirect && (
        <div className="text-xs text-gray-600 font-mono">
          via: {test.sourceItem}
        </div>
      )}
    </button>
  );
}

/**
 * AffectedTestListコンポーネント
 *
 * 影響を受けるテストの一覧を表示。
 * 直接テストと間接テストを視覚的に区別し、テスト詳細へのナビゲーションを提供。
 */
export function AffectedTestList({
  directTests,
  indirectTests,
  onSelectTest,
}: AffectedTestListProps) {
  const totalTests = directTests.length + indirectTests.length;

  if (totalTests === 0) {
    return (
      <div className="p-4 bg-gray-800 border border-gray-700 rounded text-center">
        <p className="text-sm text-gray-500">影響を受けるテストはありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 直接テスト */}
      {directTests.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
            <span>直接テスト</span>
            <span className="px-2 py-0.5 bg-green-600/20 text-green-400 text-xs font-medium rounded border border-green-600/30">
              {directTests.length}
            </span>
          </h4>
          <div className="space-y-1">
            {directTests.map((test) => (
              <TestItem key={test.id} test={test} onSelect={onSelectTest} />
            ))}
          </div>
        </div>
      )}

      {/* 間接テスト */}
      {indirectTests.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
            <span>間接テスト（Callers経由）</span>
            <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-xs font-medium rounded border border-blue-600/30">
              {indirectTests.length}
            </span>
          </h4>
          <div className="space-y-1">
            {indirectTests.map((test) => (
              <TestItem key={test.id} test={test} onSelect={onSelectTest} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
