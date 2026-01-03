/**
 * TreeView.tsx
 *
 * ディレクトリ構造をツリー形式で表示するコンポーネント
 * サイドパネル内でファイル一覧をナビゲート
 */
import { useState, useMemo } from "react";
import type { IndexFile, IndexFileEntry } from "../../types/schema";
import type { TreeNode } from "../../types/view";

interface TreeViewProps {
  /** インデックスデータ */
  index: IndexFile;
  /** 選択されたファイルパス */
  selectedFilePath: string | null;
  /** ファイル選択時のコールバック */
  onSelectFile: (filePath: string) => void;
}

/**
 * フラットなファイルリストから再帰的なツリー構造を構築
 */
function buildTree(files: IndexFileEntry[]): TreeNode {
  const root: TreeNode = {
    name: "",
    path: "",
    children: [],
    files: [],
  };

  for (const file of files) {
    // mod.json は除外
    if (file.path === "mod.json" || file.path.endsWith("/mod.json")) continue;

    const parts = file.path.split("/");
    let current = root;

    // ディレクトリ部分を辿る
    for (let i = 0; i < parts.length - 1; i++) {
      const dirName = parts[i];
      const dirPath = parts.slice(0, i + 1).join("/");

      let child = current.children.find((c) => c.name === dirName);
      if (!child) {
        child = {
          name: dirName,
          path: dirPath,
          children: [],
          files: [],
        };
        current.children.push(child);
      }
      current = child;
    }

    // ファイルを追加
    current.files.push({
      path: file.path,
      items: file.items,
      tests: file.tests,
    });
  }

  // 子ディレクトリをソート
  function sortChildren(node: TreeNode) {
    node.children.sort((a, b) => a.name.localeCompare(b.name));
    node.files.sort((a, b) => a.path.localeCompare(b.path));
    for (const child of node.children) {
      sortChildren(child);
    }
  }
  sortChildren(root);

  return root;
}

/**
 * 1階層目のディレクトリパスを取得（デフォルト展開用）
 */
function getFirstLevelDirs(node: TreeNode): Set<string> {
  const dirs = new Set<string>();
  for (const child of node.children) {
    dirs.add(child.path);
  }
  return dirs;
}

/**
 * ファイル名を取得（パスから）
 */
function getFileName(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1].replace(".json", "");
}

interface TreeNodeComponentProps {
  node: TreeNode;
  level: number;
  expandedDirs: Set<string>;
  toggleDir: (path: string) => void;
  selectedFilePath: string | null;
  onSelectFile: (filePath: string) => void;
}

/**
 * ツリーノードコンポーネント（再帰的）
 */
function TreeNodeComponent({
  node,
  level,
  expandedDirs,
  toggleDir,
  selectedFilePath,
  onSelectFile,
}: TreeNodeComponentProps) {
  const isExpanded = expandedDirs.has(node.path);
  const hasChildren = node.children.length > 0 || node.files.length > 0;

  return (
    <div>
      {/* ディレクトリヘッダー（ルート以外） */}
      {node.name && (
        <button
          onClick={() => toggleDir(node.path)}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-gray-300 hover:bg-gray-700 rounded transition-colors"
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          {/* 展開アイコン */}
          {hasChildren && (
            <svg
              className={`w-4 h-4 transition-transform flex-shrink-0 ${
                isExpanded ? "rotate-90" : ""
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
          )}

          {/* フォルダアイコン */}
          <svg
            className="w-4 h-4 text-yellow-500 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>

          <span className="font-medium">{node.name}</span>
          <span className="text-gray-500 text-xs">
            ({node.children.length + node.files.length})
          </span>
        </button>
      )}

      {/* 子要素（展開時またはルート） */}
      {(isExpanded || !node.name) && (
        <div>
          {/* 子ディレクトリ */}
          {node.children.map((child) => (
            <TreeNodeComponent
              key={child.path}
              node={child}
              level={node.name ? level + 1 : level}
              expandedDirs={expandedDirs}
              toggleDir={toggleDir}
              selectedFilePath={selectedFilePath}
              onSelectFile={onSelectFile}
            />
          ))}

          {/* ファイル一覧 */}
          {node.files.map((file) => (
            <button
              key={file.path}
              onClick={() => onSelectFile(file.path)}
              className={`w-full flex items-center gap-2 py-1 text-left text-sm rounded transition-colors ${
                selectedFilePath === file.path
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:bg-gray-700 hover:text-gray-200"
              }`}
              style={{ paddingLeft: `${(node.name ? level + 1 : level) * 12 + 8}px`, paddingRight: "8px" }}
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

              <span className="flex-1 truncate">{getFileName(file.path)}</span>

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
  );
}

/**
 * ディレクトリツリーコンポーネント
 */
export function TreeView({
  index,
  selectedFilePath,
  onSelectFile,
}: TreeViewProps) {
  // ツリー構造を構築
  const tree = useMemo(() => buildTree(index.files), [index.files]);

  // 1階層目をデフォルトで展開
  const defaultExpanded = useMemo(() => getFirstLevelDirs(tree), [tree]);

  // 展開されているディレクトリの状態
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(defaultExpanded);

  // ディレクトリの展開/折りたたみ切り替え
  const toggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
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
      <div className="space-y-0.5">
        <TreeNodeComponent
          node={tree}
          level={0}
          expandedDirs={expandedDirs}
          toggleDir={toggleDir}
          selectedFilePath={selectedFilePath}
          onSelectFile={onSelectFile}
        />
      </div>
    </div>
  );
}
