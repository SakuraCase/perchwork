/**
 * TestList コンポーネント
 *
 * テストIDの一覧を、テスト内容（summary）と共に表示する。
 * 各テストはクリック可能で、将来的にテスト詳細へのジャンプ機能を実装予定。
 */

import type { ItemId, SemanticTest } from '@/types/schema';

interface TestListProps {
  /** テストIDの配列 */
  testIds: ItemId[];
  /** セマンティックテスト情報（summaryを取得するため） */
  semanticTests?: SemanticTest[];
}

/**
 * TestListコンポーネント
 *
 * テストIDとその内容（summary）をリスト形式で表示。
 * 各アイテムはホバー効果付きで、クリック可能なUI要素として提供。
 */
export function TestList({ testIds, semanticTests = [] }: TestListProps) {
  /**
   * テストアイテムクリック時の処理
   * 現在は未実装（将来的にテスト詳細表示やジャンプ機能を追加）
   */
  const handleTestClick = (testId: ItemId) => {
    // TODO: テスト詳細表示やジャンプ機能を実装
    console.log('Test clicked:', testId);
  };

  /**
   * テストIDからSemanticTestを検索
   */
  const findSemanticTest = (testId: ItemId): SemanticTest | undefined => {
    return semanticTests.find((t) => t.id === testId);
  };

  return (
    <div className="space-y-2">
      {testIds.map((testId) => {
        const semanticTest = findSemanticTest(testId);
        return (
          <button
            key={testId}
            type="button"
            onClick={() => handleTestClick(testId)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-left hover:bg-gray-750 hover:border-green-600/50 transition-colors"
          >
            <div className="text-sm font-mono text-green-400">{testId}</div>
            {semanticTest?.summary && (
              <div className="text-xs text-gray-400 mt-1">
                {semanticTest.summary}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
