/**
 * App.tsx
 *
 * アプリケーションのルートコンポーネント
 * すべてのコンポーネントを統合し、グローバル状態とデータフローを管理する
 */

import { useState, useCallback } from 'react';
import type { SourceFile, ItemId } from './types/schema';
import { useDataLoader } from './hooks/useDataLoader';
import { useTreeState } from './hooks/useTreeState';
import { useGraphTraversal } from './hooks/useGraphTraversal';
import { useGraphLayout } from './hooks/useGraphLayout';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Loading } from './components/common/Loading';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MainContent } from './components/layout/MainContent';
import { DirectoryTree } from './components/tree/DirectoryTree';
import { DetailPanel } from './components/detail/DetailPanel';
import { GraphView } from './components/graph/GraphView';
import { GraphToolbar } from './components/graph/GraphToolbar';
import { NodePopup } from './components/graph/NodePopup';

/**
 * タブの種類
 */
type ViewTab = 'detail' | 'graph';

/**
 * アプリケーションルートコンポーネント
 *
 * 状態管理:
 * - index.json の読み込み（useDataLoader）
 * - ツリー構造の構築と展開状態（useTreeState）
 * - ファイル選択状態（selectedFilePath, currentFile）
 * - アイテム選択状態（selectedItemId）
 * - タブ選択状態（activeTab）
 * - グラフデータ読み込み（useGraphTraversal）
 * - グラフレイアウト設定（useGraphLayout）
 *
 * データフロー:
 * 1. 初期ロード: index.json を取得
 * 2. ツリー構築: ファイルパス配列から TreeNode[] を生成
 * 3. ファイル選択: DirectoryTree -> loadFile() -> DetailPanel
 * 4. アイテム選択: DetailPanel 内部で管理
 * 5. タブ切り替え: 詳細/グラフ
 * 6. グラフノード選択: GraphView -> NodePopup
 */
function App() {
  // データ読み込みとキャッシュ管理
  const { index, loadFile, isLoading, error } = useDataLoader();

  // ツリー構造と展開状態の管理
  const { nodes, toggleExpand } = useTreeState(index);

  // タブ選択状態
  const [activeTab, setActiveTab] = useState<ViewTab>('detail');

  // ファイル選択状態
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<SourceFile | null>(null);

  // アイテム選択状態
  const [selectedItemId, setSelectedItemId] = useState<ItemId | null>(null);

  // グラフ関連のフック
  const { graphData, isLoading: graphLoading, error: graphError } = useGraphTraversal();
  const { layoutOptions, filter, setLayoutType, updateFilter } = useGraphLayout();

  // グラフビュー用のノード選択状態（ポップアップ表示用）
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // ノード中心表示用の状態（変更されるとGraphViewが該当ノードを中心に表示）
  const [centerNodeId, setCenterNodeId] = useState<string | null>(null);

  /**
   * ファイル選択時のハンドラ
   * 選択されたファイルの詳細JSONを読み込む
   */
  const handleSelectFile = useCallback(
    async (path: string) => {
      setSelectedFilePath(path);
      setSelectedItemId(null); // ファイル切り替え時はアイテム選択をリセット

      try {
        const fileData = await loadFile(path);
        // Phase 1の実際の出力形式: { path, language, items } を直接 SourceFile として扱う
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawData = fileData as any;
        const sourceFile: SourceFile = {
          path: rawData.path || path,
          hash: '',
          last_modified: '',
          items: rawData.items || [],
        };
        setCurrentFile(sourceFile);
      } catch (err) {
        console.error('Failed to load file:', err);
        setCurrentFile(null);
      }
    },
    [loadFile]
  );

  /**
   * アイテム選択時のハンドラ
   */
  const handleSelectItem = useCallback((id: ItemId) => {
    setSelectedItemId(id);
  }, []);

  /**
   * グラフノード選択時のハンドラ
   */
  const handleSelectGraphNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  /**
   * ノードを中心に表示するハンドラ
   * NodePopupの「このノードを中心に表示」ボタンから呼ばれる
   */
  const handleCenterOnNode = useCallback((nodeId: string) => {
    // 一旦nullにしてから設定することで、同じノードでもuseEffectがトリガーされる
    setCenterNodeId(null);
    setTimeout(() => {
      setCenterNodeId(nodeId);
      setSelectedNodeId(null); // ポップアップを閉じる
    }, 0);
  }, []);

  /**
   * グラフノードホバー時のハンドラ
   * 現在は未使用だが、将来的にホバー時のプレビュー機能に使用予定
   */
  const handleHoverGraphNode = useCallback(() => {
    // 将来的にホバー時の詳細表示に使用
  }, []);

  // 初期ロード中の表示
  if (isLoading && !index) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <Loading message="index.json を読み込んでいます..." />
      </div>
    );
  }

  // エラー表示
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">エラーが発生しました</h1>
          <p className="text-gray-400 mb-8">{error}</p>
        </div>
      </div>
    );
  }

  // データなし（/tracelight 未実行）
  if (!index) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Tracelight</h1>
          <p className="text-gray-400 mb-8">Code Structure Visualizer</p>
          <div className="bg-gray-800 rounded-lg p-6 max-w-md">
            <p className="text-yellow-400 mb-4">データがありません</p>
            <p className="text-sm text-gray-500">
              Claude Code で <code className="bg-gray-700 px-2 py-1 rounded">/tracelight</code> を実行して
              コードベースを解析してください。
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 選択ノードの詳細を取得（ポップアップ表示用）
  const selectedNode = selectedNodeId
    ? graphData?.nodes.find((node) => node.data.id === selectedNodeId) || null
    : null;

  // メインレイアウト
  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen bg-gray-900 text-gray-100">
        {/* ヘッダー */}
        <Header projectName="Tracelight" />

        {/* メインコンテンツエリア */}
        <div className="flex flex-1 overflow-hidden">
          {/* サイドバー: ディレクトリツリー */}
          <Sidebar width={300}>
            <DirectoryTree
              nodes={nodes}
              selectedPath={selectedFilePath}
              onSelectFile={handleSelectFile}
              onToggleExpand={toggleExpand}
            />
          </Sidebar>

          {/* メインコンテンツ: タブ切り替えUI */}
          <MainContent>
            {/* タブバー */}
            <div className="flex border-b border-gray-700 bg-gray-800">
              <button
                onClick={() => setActiveTab('detail')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'detail'
                    ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                詳細
              </button>
              <button
                onClick={() => setActiveTab('graph')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'graph'
                    ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                グラフ
              </button>
            </div>

            {/* タブコンテンツ */}
            <div className="flex-1 overflow-hidden">
              {/* 詳細タブ */}
              {activeTab === 'detail' && (
                <DetailPanel
                  file={currentFile}
                  selectedItemId={selectedItemId}
                  onSelectItem={handleSelectItem}
                />
              )}

              {/* グラフタブ */}
              {activeTab === 'graph' && (
                <div className="flex flex-col h-full">
                  {/* グラフツールバー */}
                  <GraphToolbar
                    layout={layoutOptions.type}
                    onLayoutChange={setLayoutType}
                    filter={filter}
                    onFilterChange={updateFilter}
                  />

                  {/* グラフビュー */}
                  {graphLoading && (
                    <div className="flex-1 flex items-center justify-center">
                      <Loading message="グラフデータを読み込んでいます..." />
                    </div>
                  )}

                  {graphError && (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-red-400 mb-4">グラフデータの読み込みに失敗しました</p>
                        <p className="text-sm text-gray-500">{graphError.message}</p>
                      </div>
                    </div>
                  )}

                  {!graphLoading && !graphError && graphData && (
                    <div className="flex-1 relative">
                      <GraphView
                        data={graphData}
                        layout={layoutOptions}
                        filter={filter}
                        onSelectNode={handleSelectGraphNode}
                        onHoverNode={handleHoverGraphNode}
                        centerOnNodeId={centerNodeId}
                      />

                      {/* ノード詳細ポップアップ */}
                      <NodePopup
                        node={selectedNode}
                        onClose={() => setSelectedNodeId(null)}
                        onNavigate={handleCenterOnNode}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </MainContent>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
