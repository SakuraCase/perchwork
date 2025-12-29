/**
 * TestList コンポーネント
 *
 * テストIDの一覧を表示する。
 * 各テストはクリック可能で、将来的にテスト詳細へのジャンプ機能を実装予定。
 */

import type { ItemId } from '@/types/schema';

interface TestListProps {
  /** テストIDの配列 */
  testIds: ItemId[];
}

/**
 * TestListコンポーネント
 *
 * テストIDをリスト形式で表示。
 * 各アイテムはホバー効果付きで、クリック可能なUI要素として提供。
 */
export function TestList({ testIds }: TestListProps) {
  /**
   * テストアイテムクリック時の処理
   * 現在は未実装（将来的にテスト詳細表示やジャンプ機能を追加）
   */
  const handleTestClick = (testId: ItemId) => {
    // TODO: テスト詳細表示やジャンプ機能を実装
    console.log('Test clicked:', testId);
  };

  return (
    <div className="space-y-1">
      {testIds.map((testId) => (
        <button
          key={testId}
          type="button"
          onClick={() => handleTestClick(testId)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm font-mono text-left text-green-400 hover:bg-gray-750 hover:border-green-600/50 transition-colors"
        >
          {testId}
        </button>
      ))}
    </div>
  );
}
