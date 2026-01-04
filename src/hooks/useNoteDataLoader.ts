/**
 * useNoteDataLoader.ts
 *
 * ノート機能のデータ読み込みフック
 * sessions/index.ts と document/index.ts からメタデータを読み込む
 * import.meta.glob を使用してファイルが存在しない場合もエラーにならない
 */

import type { NoteSessionEntry, NoteDocumentCategory } from "../types/note";

interface SessionModule {
  sessions: NoteSessionEntry[];
}

interface DocumentModule {
  categories: NoteDocumentCategory[];
}

const sessionModules = import.meta.glob<SessionModule>(
  "../generated/sessions/index.ts",
  { eager: true }
);

const documentModules = import.meta.glob<DocumentModule>(
  "../generated/document/index.ts",
  { eager: true }
);

interface UseNoteDataLoaderResult {
  sessions: NoteSessionEntry[];
  categories: NoteDocumentCategory[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useNoteDataLoader(): UseNoteDataLoaderResult {
  const sessionModule = Object.values(sessionModules)[0];
  const documentModule = Object.values(documentModules)[0];

  const sessions = sessionModule?.sessions ?? [];
  const categories = documentModule?.categories ?? [];

  return {
    sessions,
    categories,
    isLoading: false,
    error: null,
    reload: async () => {
      // eager: true のため再読み込みは不要（HMRで自動更新）
    },
  };
}
