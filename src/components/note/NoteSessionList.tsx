/**
 * NoteSessionList.tsx
 *
 * セッション一覧を表示するコンポーネント
 */

import type { NoteSessionEntry } from "../../types/note";

interface NoteSessionListProps {
  sessions: NoteSessionEntry[];
  selectedId: string | null;
  onSelect: (session: NoteSessionEntry) => void;
}

export function NoteSessionList({ sessions, selectedId, onSelect }: NoteSessionListProps) {
  if (sessions.length === 0) {
    return <div className="p-4 text-gray-500 text-sm">セッションがありません</div>;
  }

  return (
    <div className="flex flex-col">
      {sessions.map((session) => (
        <button
          key={session.id}
          onClick={() => onSelect(session)}
          className={`text-left px-4 py-3 border-b border-gray-700 hover:bg-gray-800 transition-colors ${
            selectedId === session.id
              ? "bg-gray-800 border-l-2 border-l-blue-500"
              : ""
          }`}
        >
          <div className="font-medium text-gray-200">{session.title}</div>
          <div className="text-xs text-gray-500 mt-1">
            {new Date(session.createdAt).toLocaleDateString("ja-JP")}
          </div>
        </button>
      ))}
    </div>
  );
}
