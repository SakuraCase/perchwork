/**
 * Header.tsx
 *
 * アプリケーションヘッダーコンポーネント
 * ロゴ/プロジェクトタイトルとビュー切り替えタブを表示
 */
import type { ViewTab } from "../../types/view";

interface HeaderProps {
  /** プロジェクト名（デフォルト: "Perchwork"） */
  projectName?: string;
  /** アクティブなタブ */
  activeTab: ViewTab;
  /** タブ変更時のコールバック */
  onTabChange: (tab: ViewTab) => void;
}

/**
 * アプリケーションヘッダー
 * @param props - ヘッダーのプロパティ
 */
export function Header({
  projectName = "Perchwork",
  activeTab,
  onTabChange,
}: HeaderProps) {
  return (
    <header className="h-14 border-b border-gray-700 bg-gray-900 flex items-center px-6">
      <h1 className="text-xl font-bold text-white">{projectName}</h1>

      {/* タブ切り替え */}
      <div className="ml-8 flex gap-1">
        <button
          onClick={() => onTabChange("graph")}
          className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
            activeTab === "graph"
              ? "bg-gray-800 text-white border-b-2 border-blue-500"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
          }`}
        >
          グラフ
        </button>
        <button
          onClick={() => onTabChange("tree")}
          className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
            activeTab === "tree"
              ? "bg-gray-800 text-white border-b-2 border-blue-500"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
          }`}
        >
          ツリー
        </button>
      </div>
    </header>
  );
}
