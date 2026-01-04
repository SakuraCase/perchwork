/**
 * NoteEmptyState.tsx
 *
 * ノート機能のデータが空の時に表示するコンポーネント
 */

interface NoteEmptyStateProps {
  /** 表示するメッセージの種類 */
  type: "no-data" | "no-selection";
}

export function NoteEmptyState({ type }: NoteEmptyStateProps) {
  if (type === "no-data") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <div className="text-6xl mb-4">📝</div>
        <p className="text-lg mb-2">ノートデータがありません</p>
        <p className="text-sm text-gray-500">
          Claude Code で{" "}
          <code className="bg-gray-700 px-2 py-1 rounded">/i</code>{" "}
          を実行して調査を開始し、
          <code className="bg-gray-700 px-2 py-1 rounded">/w</code> でドキュメントを生成してください。
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center text-gray-500">
        <p className="text-lg mb-2">コンテンツが選択されていません</p>
        <p className="text-sm">左のパネルからセッションまたはドキュメントを選択してください</p>
      </div>
    </div>
  );
}
