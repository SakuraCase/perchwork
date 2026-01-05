/**
 * Header.tsx
 *
 * アプリケーションヘッダーコンポーネント
 * ロゴ/プロジェクトタイトル、ビュー切り替えタブ、検索ボックスを表示
 */
import type { ItemId } from "../../types/schema";
import type { ViewTab } from "../../types/view";
import type { SearchIndexItem } from "../../hooks/useSearchIndex";
import { SearchBox } from "./SearchBox";

interface HeaderProps {
  /** プロジェクト名（デフォルト: "Perchwork"） */
  projectName?: string;
  /** アクティブなタブ */
  activeTab: ViewTab;
  /** タブ変更時のコールバック */
  onTabChange: (tab: ViewTab) => void;
  /** 検索候補データ */
  searchItems: SearchIndexItem[];
  /** 検索インデックスローディング中かどうか */
  searchLoading: boolean;
  /** グラフモード: ノード選択時のコールバック */
  onSearchSelectGraph: (nodeId: string, filePath: string) => void;
  /** ツリーモード: アイテム選択時のコールバック */
  onSearchSelectTree: (filePath: string, itemId: ItemId) => void;
  /** シーケンスモード: メソッド/関数選択時のコールバック */
  onSearchSelectSequence?: (methodId: ItemId) => void;
}

/**
 * アプリケーションヘッダー
 * @param props - ヘッダーのプロパティ
 */
export function Header({
  projectName = "Perchwork",
  activeTab,
  onTabChange,
  searchItems,
  searchLoading,
  onSearchSelectGraph,
  onSearchSelectTree,
  onSearchSelectSequence,
}: HeaderProps) {
  return (
    <header className="h-14 border-b border-gray-700 bg-gray-900 flex items-center px-6">
      <h1 className="text-xl font-bold text-white">{projectName}</h1>

      {/* タブ切り替え */}
      <div className="ml-8 flex gap-1">
        <button
          onClick={() => onTabChange("ai")}
          className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
            activeTab === "ai"
              ? "bg-gray-800 text-white border-b-2 border-blue-500"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
          }`}
        >
          ノート
        </button>
        <button
          onClick={() => onTabChange("metrics")}
          className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
            activeTab === "metrics"
              ? "bg-gray-800 text-white border-b-2 border-blue-500"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
          }`}
        >
          メトリクス
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
          onClick={() => onTabChange("sequence")}
          className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
            activeTab === "sequence"
              ? "bg-gray-800 text-white border-b-2 border-blue-500"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
          }`}
        >
          シーケンス
        </button>
      </div>

      {/* 検索ボックス（右寄せ） */}
      <div className="ml-auto flex items-center gap-3">
        <SearchBox
          items={searchItems}
          isLoading={searchLoading}
          activeTab={activeTab}
          onSelectGraphNode={onSearchSelectGraph}
          onSelectTreeItem={onSearchSelectTree}
          onSelectSequenceMethod={onSearchSelectSequence}
        />
      </div>
    </header>
  );
}
