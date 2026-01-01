/**
 * Badge コンポーネント
 *
 * 統一されたバッジ表示を提供する。
 * タイプ、可視性、タグなど様々な用途で使用可能。
 */

import type { ReactNode } from 'react';
import { getBadgeClass, type BadgeVariant } from '@/utils/badgeStyles';

interface BadgeProps {
  /** バッジのバリアント */
  variant: BadgeVariant;
  /** 表示内容 */
  children: ReactNode;
  /** 追加のクラス名 */
  className?: string;
  /** ボーダーを表示するか（デフォルト: true） */
  withBorder?: boolean;
}

/**
 * 汎用バッジコンポーネント
 */
export function Badge({
  variant,
  children,
  className = '',
  withBorder = true,
}: BadgeProps) {
  return (
    <span className={`${getBadgeClass(variant, withBorder)} ${className}`}>
      {children}
    </span>
  );
}
