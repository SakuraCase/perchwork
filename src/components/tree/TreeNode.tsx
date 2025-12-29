/**
 * TreeNode コンポーネント
 *
 * ツリービューの個々のノード（ディレクトリまたはファイル）を表示する。
 * ネストレベルに応じたインデント、アイコン、展開/折りたたみ機能を提供。
 */

import type { TreeNode as TreeNodeType } from '@/types/ui';
import { FileNode } from './FileNode';

interface TreeNodeProps {
  /** ツリーノードのデータ */
  node: TreeNodeType;
  /** ネストの深さ（インデント計算用） */
  level: number;
  /** 選択中のファイルパス */
  selectedPath: string | null;
  /** 選択時のコールバック */
  onSelect: (path: string) => void;
  /** トグル時のコールバック（ディレクトリの展開/折りたたみ） */
  onToggle: (path: string) => void;
}

/**
 * TreeNodeコンポーネント
 *
 * ディレクトリとファイルの両方を表示できるツリーノード。
 * ディレクトリの場合は展開/折りたたみ機能を持ち、子ノードを再帰的に表示する。
 */
export function TreeNode({
  node,
  level,
  selectedPath,
  onSelect,
  onToggle
}: TreeNodeProps) {
  // 現在のノードが選択されているかどうか
  const isSelected = node.path === selectedPath;
  // インデント幅を計算（1レベルあたり16px）
  const indentStyle = { paddingLeft: `${level * 16}px` };

  // ディレクトリの場合
  if (node.type === 'directory') {
    return (
      <div>
        {/* ディレクトリノード */}
        <button
          type="button"
          onClick={() => onToggle(node.path)}
          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-800 transition-colors flex items-center gap-2 text-gray-300"
          style={indentStyle}
        >
          {/* 展開/折りたたみアイコン */}
          <span className="text-gray-500 w-4">
            {node.isExpanded ? '▼' : '▶'}
          </span>
          {/* フォルダアイコン */}
          <span className="text-yellow-500">📁</span>
          {/* ディレクトリ名 */}
          <span className="truncate">{node.name}</span>
        </button>

        {/* 子ノード（展開時のみ表示） */}
        {node.isExpanded && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                level={level + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
                onToggle={onToggle}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ファイルの場合
  return (
    <div style={indentStyle}>
      <FileNode
        name={node.name}
        itemCount={node.itemCount}
        isSelected={isSelected}
        onClick={() => onSelect(node.path)}
      />
    </div>
  );
}
