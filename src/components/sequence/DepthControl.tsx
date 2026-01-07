/**
 * DepthControl コンポーネント
 *
 * 関数ごとの深さ設定を調整するUI
 */

import type { FunctionDepthSetting, HoverTarget } from '@/types/sequence';
import type { ItemId } from '@/types/schema';

interface DepthControlProps {
  /** 関数深さ設定のリスト */
  functionDepths: FunctionDepthSetting[];
  /** 深さ変更時のコールバック */
  onDepthChange: (functionId: ItemId, depth: number) => void;
  /** ホバー変更時のコールバック（シーケンス図ハイライト用） */
  onHoverChange?: (target: HoverTarget) => void;
}

/**
 * 深さ調整コンポーネント
 */
export function DepthControl({
  functionDepths,
  onDepthChange,
  onHoverChange,
}: DepthControlProps) {
  if (functionDepths.length === 0) {
    return (
      <div className="text-sm text-stone-500">
        関数が選択されていません
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {functionDepths.map((setting, index) => (
        <div
          key={setting.functionId}
          className="px-3 py-2 bg-stone-800 rounded border border-stone-700 transition-colors hover:border-stone-600"
          onMouseEnter={() =>
            onHoverChange?.({ type: 'function', functionId: setting.functionId })
          }
          onMouseLeave={() => onHoverChange?.(null)}
        >
          {/* 1行目: 関数名 */}
          <div className="flex items-center gap-2 mb-2">
            {/* インデント表示 */}
            {index > 0 && (
              <span className="text-stone-600 text-sm flex-shrink-0">
                {'└'.padStart(Math.min(index, 3) * 2, ' ')}
              </span>
            )}
            <span className="text-sm text-stone-300 font-mono truncate">
              {setting.displayName}
            </span>
          </div>

          {/* 2行目: 深さ調整ボタン */}
          <div className="flex items-center justify-end gap-1">
            <span className="text-xs text-stone-500 mr-2">深さ:</span>
            <button
              type="button"
              onClick={() =>
                onDepthChange(setting.functionId, setting.depth - 1)
              }
              disabled={setting.depth <= 0}
              className="w-6 h-6 flex items-center justify-center text-sm bg-stone-700 hover:bg-stone-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            >
              -
            </button>
            <span className="w-8 text-center text-sm text-stone-200">
              {setting.depth}
            </span>
            <button
              type="button"
              onClick={() =>
                onDepthChange(setting.functionId, setting.depth + 1)
              }
              disabled={setting.depth >= setting.maxExpandableDepth}
              className="w-6 h-6 flex items-center justify-center text-sm bg-stone-700 hover:bg-stone-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            >
              +
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
