/**
 * CallersTree コンポーネント
 *
 * Callers のツリー構造を再帰的に表示するコンポーネント。
 * ノードの展開/折りたたみとクリック選択をサポート。
 */

import type { CallersTreeNode } from '@/types/callers';
import type { ItemId } from '@/types/schema';

interface CallersTreeProps {
  /** ツリーノード */
  node: CallersTreeNode;
  /** Caller選択時のコールバック */
  onSelectCaller: (callerId: ItemId) => void;
  /** 展開/折りたたみトグル時のコールバック */
  onToggleExpand: (callerId: ItemId) => void;
}

/**
 * CallersTreeコンポーネント
 *
 * 再帰的にツリー構造を描画し、インデント表示と展開/折りたたみを提供。
 */
export function CallersTree({
  node,
  onSelectCaller,
  onToggleExpand
}: CallersTreeProps) {
  // インデント幅を計算（1レベルあたり16px）
  const indentStyle = { paddingLeft: `${node.depth * 16}px` };

  // 子ノードがある場合は展開/折りたたみ可能
  const hasChildren = node.children.length > 0;

  return (
    <div>
      {/* 現在のノード */}
      <div
        style={indentStyle}
        className="flex items-start gap-2 px-3 py-2 text-sm hover:bg-gray-800 transition-colors"
      >
        {/* 展開/折りたたみアイコン（子がある場合のみ） */}
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggleExpand(node.caller.id)}
            className="text-gray-500 w-4 flex-shrink-0 pt-0.5"
          >
            {node.isExpanded ? '▼' : '▶'}
          </button>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        {/* Caller 情報 */}
        <button
          type="button"
          onClick={() => onSelectCaller(node.caller.id)}
          className="flex-1 text-left"
        >
          {/* Caller 名 */}
          <div className="text-gray-200 font-medium">{node.caller.name}</div>
          {/* 呼び出し位置 */}
          <div className="text-xs text-gray-500">
            {node.caller.callSite.file}:{node.caller.callSite.line}
          </div>
        </button>
      </div>

      {/* 子ノード（展開時のみ表示） */}
      {hasChildren && node.isExpanded && (
        <div>
          {node.children.map((child) => (
            <CallersTree
              key={child.caller.id}
              node={child}
              onSelectCaller={onSelectCaller}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}
