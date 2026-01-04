/**
 * NoteSidePanel.tsx
 *
 * ノート機能用サイドパネル
 * セッション一覧とドキュメントツリーをタブで切り替え表示
 */

import type {
  NoteSidePanelTab,
  NoteSessionEntry,
  NoteDocumentEntry,
  NoteDocumentCategory,
} from "../../types/note";
import { NoteSessionList } from "./NoteSessionList";
import { NoteDocumentTree } from "./NoteDocumentTree";

interface NoteSidePanelProps {
  sessions: NoteSessionEntry[];
  categories: NoteDocumentCategory[];
  activeTab: NoteSidePanelTab;
  onTabChange: (tab: NoteSidePanelTab) => void;
  selectedId: string | null;
  onSelectSession: (session: NoteSessionEntry) => void;
  onSelectDocument: (entry: NoteDocumentEntry) => void;
}

export function NoteSidePanel({
  sessions,
  categories,
  activeTab,
  onTabChange,
  selectedId,
  onSelectSession,
  onSelectDocument,
}: NoteSidePanelProps) {
  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* タブ切り替え */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => onTabChange("sessions")}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            activeTab === "sessions"
              ? "text-white border-b-2 border-blue-500"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          セッション
        </button>
        <button
          onClick={() => onTabChange("document")}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            activeTab === "document"
              ? "text-white border-b-2 border-blue-500"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          ドキュメント
        </button>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-auto">
        {activeTab === "sessions" ? (
          <NoteSessionList
            sessions={sessions}
            selectedId={selectedId}
            onSelect={onSelectSession}
          />
        ) : (
          <NoteDocumentTree
            categories={categories}
            selectedId={selectedId}
            onSelect={onSelectDocument}
          />
        )}
      </div>
    </div>
  );
}
