/**
 * TestItem コンポーネント
 *
 * テストアイテムの表示を提供する。
 * コンパクト表示と詳細表示の2つのバリアントをサポート。
 */

import { extractTestName } from '@/utils/testUtils';

interface TestItemProps {
  /** テストID（フルパス） */
  testId: string;
  /** 表示名（省略時はtestIdから抽出） */
  displayName?: string;
  /** クリック時のコールバック */
  onClick?: () => void;
}

/**
 * テストアイテム表示コンポーネント
 *
 * コンパクトな表示形式でテスト情報を表示する。
 */
export function TestItem({ testId, displayName, onClick }: TestItemProps) {
  const testName = displayName || extractTestName(testId);

  // クリック可能な場合はボタンとして表示
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded text-left hover:bg-stone-750 hover:border-green-600/50 transition-colors overflow-hidden"
        title={testId}
      >
        <div className="text-sm font-mono text-green-400 truncate">{testName}</div>
      </button>
    );
  }

  // クリック不可の場合は静的表示
  return (
    <div
      className="px-3 py-2 bg-stone-800 border border-stone-700 rounded text-left hover:bg-stone-750 hover:border-green-600/50 transition-colors overflow-hidden"
      title={testId}
    >
      <div className="text-sm font-mono text-green-400 truncate">{testName}</div>
    </div>
  );
}

interface CompactTestItemProps {
  /** テストID（フルパス） */
  testId: string;
  /** 表示名（省略時はtestIdから抽出） */
  displayName?: string;
  /** テスト名を表示するか（デフォルト: true） */
  showName?: boolean;
}

/**
 * コンパクトなテストアイテム表示コンポーネント
 *
 * StructGroupView等で使用される簡易表示形式。
 */
export function CompactTestItem({
  testId,
  displayName,
  showName = true,
}: CompactTestItemProps) {
  const testName = displayName || extractTestName(testId);

  return (
    <div className="text-sm text-stone-300 py-0.5" title={testId}>
      {showName && <span>• {testName}</span>}
    </div>
  );
}
