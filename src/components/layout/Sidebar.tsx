/**
 * Sidebar.tsx
 *
 * サイドバーのラッパーコンポーネント
 * 固定幅でスクロール可能な左側のナビゲーションエリア
 */
import type { ReactNode } from "react";

interface SidebarProps {
  /** サイドバーの内容 */
  children: ReactNode;
  /** サイドバーの幅（ピクセル単位、デフォルト: 300） */
  width?: number;
}

/**
 * サイドバーコンポーネント
 * @param props - サイドバーのプロパティ
 */
export function Sidebar({ children, width = 300 }: SidebarProps) {
  return (
    <aside
      className="border-r border-gray-700 bg-gray-900 overflow-y-auto"
      style={{ width: `${width}px` }}
    >
      {children}
    </aside>
  );
}
