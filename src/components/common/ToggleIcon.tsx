/**
 * ToggleIcon コンポーネント
 *
 * 展開/折りたたみ状態を示すアイコン。
 * 統一されたアニメーション付きのシェブロンアイコンを提供。
 */

interface ToggleIconProps {
  /** 展開状態 */
  expanded: boolean;
  /** アイコンの向き（デフォルト: 'down'） */
  direction?: 'down' | 'right';
  /** アイコンのサイズ（デフォルト: 'md'） */
  size?: 'sm' | 'md' | 'lg';
  /** 追加のクラス名 */
  className?: string;
}

/** サイズごとのクラス */
const SIZE_CLASSES = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

/**
 * 展開/折りたたみアイコンコンポーネント
 *
 * SVGシェブロンアイコンで、expanded状態に応じて回転する。
 */
export function ToggleIcon({
  expanded,
  direction = 'down',
  size = 'md',
  className = '',
}: ToggleIconProps) {
  // 回転角度の計算
  const rotation = direction === 'down' ? (expanded ? 'rotate-180' : '') : (expanded ? 'rotate-90' : '');

  return (
    <svg
      className={`${SIZE_CLASSES[size]} text-stone-400 transition-transform ${rotation} ${className}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      {direction === 'down' ? (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      ) : (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      )}
    </svg>
  );
}

/**
 * テキスト形式の展開アイコン（軽量版）
 *
 * SVGの代わりにテキスト文字を使用した軽量な代替品。
 */
export function ToggleIconText({
  expanded,
  direction = 'down',
  className = '',
}: Omit<ToggleIconProps, 'size'>) {
  const rotation =
    direction === 'down'
      ? expanded
        ? 'rotate-180'
        : ''
      : expanded
        ? 'rotate-90'
        : '';

  const icon = direction === 'down' ? '▼' : '▶';

  return (
    <span
      className={`inline-block text-xs text-stone-400 transform transition-transform ${rotation} ${className}`}
    >
      {icon}
    </span>
  );
}
