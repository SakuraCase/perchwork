/**
 * TreeView.tsx
 *
 * ディレクトリ構造をツリー形式で表示するコンポーネント
 * サイドパネル内でファイル一覧をナビゲート
 */
import { useState, useMemo } from "react";
import type { IndexFile, IndexFileEntry } from "../../types/schema";
import type { DirectoryGroup } from "../../types/view";

interface TreeViewProps {
  /** インデックスデータ */
  index: IndexFile;
  /** 選択されたファイルパス */
  selectedFilePath: string | null;
  /** ファイル選択時のコールバック */
  onSelectFile: (filePath: string) => void;
}

/**
 * ファイル一覧をディレクトリごとにグループ化
 */
function groupByDirectory(files: IndexFileEntry[]): DirectoryGroup[] {
  const groups: Record<string, IndexFileEntry[]> = {};
  const rootFiles: IndexFileEntry[] = [];

  for (const file of files) {
    // mod.json は除外
    if (file.path === "mod.json") continue;

    const parts = file.path.split("/");
    if (parts.length === 1) {
      // ルート直下のファイル
      rootFiles.push(file);
    } else {
      // ディレクトリ内のファイル
      const dir = parts[0];
      if (!groups[dir]) {
        groups[dir] = [];
      }
      groups[dir].push(file);
    }
  }

  const result: DirectoryGroup[] = [];

  // ディレクトリグループを追加（ソート済み）
  const sortedDirs = Object.keys(groups).sort();
  for (const dir of sortedDirs) {
    result.push({
      name: dir,
      files: groups[dir]
        .filter((f) => !f.path.endsWith("/mod.json")) // mod.json は除外
        .map((f) => ({
          path: f.path,
          items: f.items,
          tests: f.tests,
        })),
    });
  }

  // ルートファイルがあれば追加
  if (rootFiles.length > 0) {
    result.push({
      name: "(root)",
      files: rootFiles.map((f) => ({
        path: f.path,
        items: f.items,
        tests: f.tests,
      })),
    });
  }

  return result;
}

/**
 * ファイル名を取得（パスから）
 */
function getFileName(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1].replace(".json", "");
}

/**
 * ディレクトリ名の表示用ラベル
 */
function getDirectoryLabel(name: string): string {
  const labels: Record<string, string> = {
    entity: "Entity",
    service: "Service",
    value_object: "Value Object",
    master: "Master",
    "(root)": "Root",
  };
  return labels[name] || name;
}

/**
 * ディレクトリツリーコンポーネント
 */
export function TreeView({
  index,
  selectedFilePath,
  onSelectFile,
}: TreeViewProps) {
  // 展開されているディレクトリの状態
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(
    new Set(["entity", "service", "value_object", "master"])
  );

  // ディレクトリグループを生成
  const groups = useMemo(
    () => groupByDirectory(index.files),
    [index.files]
  );

  // ディレクトリの展開/折りたたみ切り替え
  const toggleDir = (dir: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dir)) {
        next.delete(dir);
      } else {
        next.add(dir);
      }
      return next;
    });
  };

  return (
    <div className="p-4">
      {/* 統計情報 */}
      <div className="mb-4 text-sm text-gray-400">
        <span>{index.stats.total_files} files</span>
        <span className="mx-2">|</span>
        <span>{index.stats.total_items} items</span>
        <span className="mx-2">|</span>
        <span>{index.stats.total_tests} tests</span>
      </div>

      {/* ディレクトリツリー */}
      <div className="space-y-1">
        {groups.map((group) => (
          <div key={group.name}>
            {/* ディレクトリヘッダー */}
            <button
              onClick={() => toggleDir(group.name)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-gray-300 hover:bg-gray-700 rounded transition-colors"
            >
              {/* 展開アイコン */}
              <svg
                className={`w-4 h-4 transition-transform ${
                  expandedDirs.has(group.name) ? "rotate-90" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>

              {/* フォルダアイコン */}
              <svg
                className="w-4 h-4 text-yellow-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>

              <span className="font-medium">{getDirectoryLabel(group.name)}</span>
              <span className="text-gray-500 text-xs">
                ({group.files.length})
              </span>
            </button>

            {/* ファイル一覧 */}
            {expandedDirs.has(group.name) && (
              <div className="ml-6 space-y-0.5">
                {group.files.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => onSelectFile(file.path)}
                    className={`w-full flex items-center gap-2 px-2 py-1 text-left text-sm rounded transition-colors ${
                      selectedFilePath === file.path
                        ? "bg-blue-600 text-white"
                        : "text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                    }`}
                  >
                    {/* ファイルアイコン */}
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>

                    <span className="flex-1 truncate">
                      {getFileName(file.path)}
                    </span>

                    {/* アイテム数 */}
                    {file.items > 0 && (
                      <span
                        className={`text-xs ${
                          selectedFilePath === file.path
                            ? "text-blue-200"
                            : "text-gray-500"
                        }`}
                      >
                        {file.items}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
