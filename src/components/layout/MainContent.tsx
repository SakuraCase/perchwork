/**
 * MainContent.tsx
 *
 * メインコンテンツエリアコンポーネント
 * フレックスレイアウトで残りの幅を占め、オーバーフロースクロール可能
 */
import type { ReactNode } from "react";

interface MainContentProps {
  /** メインコンテンツの内容 */
  children: ReactNode;
}

/**
 * メインコンテンツエリア
 * @param props - メインコンテンツのプロパティ
 */
export function MainContent({ children }: MainContentProps) {
  return (
    <main className="flex-1 flex flex-col bg-gray-800 overflow-hidden">
      {children}
    </main>
  );
}
