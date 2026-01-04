/**
 * Header.tsx
 *
 * アプリケーションヘッダーコンポーネント
 * ロゴ/プロジェクトタイトル、ビュー切り替えタブ、プロファイル選択、検索ボックスを表示
 */
import type { ItemId } from "../../types/schema";
import type { ViewTab } from "../../types/view";
import type { Profile } from "../../types/profile";
import type { SearchIndexItem } from "../../hooks/useSearchIndex";
import { SearchBox } from "./SearchBox";
import { ProfileSelector } from "../profile";

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
  /** プロファイル一覧 */
  profiles: Profile[];
  /** 現在選択中のプロファイルID */
  activeProfileId: string;
  /** 現在のプロファイル名 */
  activeProfileName: string;
  /** プロファイル選択時 */
  onProfileSelect: (profileId: string) => void;
  /** プロファイル作成 */
  onProfileCreate: (name: string) => void;
  /** プロファイル名変更 */
  onProfileRename: (profileId: string, newName: string) => void;
  /** プロファイル削除 */
  onProfileDelete: (profileId: string) => void;
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
  profiles,
  activeProfileId,
  activeProfileName,
  onProfileSelect,
  onProfileCreate,
  onProfileRename,
  onProfileDelete,
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

      {/* プロファイル選択と検索ボックス（右寄せ） */}
      <div className="ml-auto flex items-center gap-3">
        <ProfileSelector
          profiles={profiles}
          activeProfileId={activeProfileId}
          activeProfileName={activeProfileName}
          onSelect={onProfileSelect}
          onCreate={onProfileCreate}
          onRename={onProfileRename}
          onDelete={onProfileDelete}
        />
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
