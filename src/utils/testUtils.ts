/**
 * テスト関連ユーティリティ
 */

/**
 * テストIDから表示名を抽出
 * 形式: "file.rs::test_function_name::test"
 * 例: "unit_collection.rs::test_new::test" → "test_new"
 */
export function extractTestName(testId: string): string {
  const parts = testId.split('::');
  // 最後から2番目のセグメント（テスト関数名）を取得
  return parts.length >= 2 ? parts[parts.length - 2] : testId;
}
