/**
 * FileNode コンポーネント
 *
 * ファイルノードの表示を担当する。
 * ファイル名、アイテム数のバッジ、選択状態のハイライトを提供。
 */

interface FileNodeProps {
  /** ファイル名 */
  name: string;
  /** ファイルに含まれるアイテム数（オプション） */
  itemCount?: number;
  /** 選択状態 */
  isSelected: boolean;
  /** クリック時のコールバック */
  onClick: () => void;
}

/**
 * FileNodeコンポーネント
 *
 * ツリービューのファイルノードを表示する。
 * 選択状態に応じて背景色を変更し、アイテム数がある場合はバッジを表示する。
 */
export function FileNode({
  name,
  itemCount,
  isSelected,
  onClick
}: FileNodeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full px-3 py-2 text-left text-sm rounded
        hover:bg-gray-800 transition-colors
        flex items-center justify-between
        ${isSelected ? 'bg-blue-900 text-blue-100' : 'text-gray-300'}
      `}
    >
      <span className="flex items-center gap-2">
        {/* ファイルアイコン */}
        <span className="text-gray-500">○</span>
        {/* ファイル名 */}
        <span className="truncate">{name}</span>
      </span>

      {/* アイテム数バッジ（存在する場合のみ表示） */}
      {itemCount !== undefined && itemCount > 0 && (
        <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded-full">
          {itemCount}
        </span>
      )}
    </button>
  );
}
