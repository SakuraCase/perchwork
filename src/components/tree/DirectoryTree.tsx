/**
 * DirectoryTree コンポーネント
 *
 * ディレクトリ構造を再帰的なツリービューとして表示する。
 * ファイルの選択、ディレクトリの展開/折りたたみを管理。
 */

import type { TreeNode as TreeNodeType } from '@/types/ui';
import { TreeNode } from './TreeNode';

interface DirectoryTreeProps {
  /** ツリーのルートノード配列 */
  nodes: TreeNodeType[];
  /** 選択中のファイルパス（null = 未選択） */
  selectedPath: string | null;
  /** ファイル選択時のコールバック */
  onSelectFile: (path: string) => void;
  /** ディレクトリの展開/折りたたみ時のコールバック */
  onToggleExpand: (path: string) => void;
}

/**
 * DirectoryTreeコンポーネント
 *
 * ディレクトリとファイルの階層構造をツリー形式で表示する。
 * 各ノードの選択状態と展開状態を管理し、ユーザー操作に応じてコールバックを呼び出す。
 */
export function DirectoryTree({
  nodes,
  selectedPath,
  onSelectFile,
  onToggleExpand
}: DirectoryTreeProps) {
  // ノードが空の場合は「データなし」メッセージを表示
  if (nodes.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        データがありません
      </div>
    );
  }

  return (
    <div className="py-2">
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          level={0}
          selectedPath={selectedPath}
          onSelect={onSelectFile}
          onToggle={onToggleExpand}
        />
      ))}
    </div>
  );
}
