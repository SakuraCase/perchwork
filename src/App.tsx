/**
 * App.tsx
 *
 * アプリケーションのルートコンポーネント
 * グラフ表示/ツリー表示の切り替えに対応
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { SourceFile, ItemId, SemanticTest, ItemType } from './types/schema';
import type { ViewTab } from './types/view';
import { useDataLoader } from './hooks/useDataLoader';
import { useGraphTraversal } from './hooks/useGraphTraversal';
import { useGraphLayout } from './hooks/useGraphLayout';
import { useSearchIndex } from './hooks/useSearchIndex';
import { useSequenceDiagram } from './hooks/useSequenceDiagram';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Loading } from './components/common/Loading';
import { Header } from './components/layout/Header';
import { MainContent } from './components/layout/MainContent';
import { SidePanel } from './components/layout/SidePanel';
import { DetailPanel } from './components/detail/DetailPanel';
import { TreeView } from './components/tree/TreeView';
import { GraphView } from './components/graph/GraphView';
import { GraphToolbar } from './components/graph/GraphToolbar';
import { NodeContextMenu } from './components/graph/NodeContextMenu';
import { SequenceView } from './components/sequence';
import { buildIndex } from './services/callersIndexer';
import type { CallersIndex } from './types/callers';
import { loadAllSummaries, type SummaryMap } from './services/semanticLoader';

/**
 * アプリケーションルートコンポーネント
 *
 * 状態管理:
 * - タブ切り替え（グラフ / ツリー / シーケンス図）
 * - index.json の読み込み（useDataLoader）
 * - グラフデータ読み込み（useGraphTraversal）
 * - グラフレイアウト設定（useGraphLayout）
 * - サイドパネル開閉状態
 * - 各ビューの選択状態（独立して管理）
 *
 * レイアウト:
 * - グラフ表示: サイドパネル(DetailPanel) + メイン(GraphView)
 * - ツリー表示: サイドパネル(TreeView) + メイン(DetailPanel)
 * - シーケンス図: 全画面(SequenceView)
 */
function App() {
  // データ読み込みとキャッシュ管理
  const { index, loadFileWithSemantic, isLoading, error } = useDataLoader();

  // 検索インデックス
  const { items: searchItems, isLoading: searchLoading } = useSearchIndex(index);

  // タブ状態
  const [activeTab, setActiveTab] = useState<ViewTab>('graph');

  // サイドパネル開閉状態
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);

  // グラフビュー用: ファイル・アイテム選択状態
  const [graphCurrentFile, setGraphCurrentFile] = useState<SourceFile | null>(null);
  const [graphSelectedItemId, setGraphSelectedItemId] = useState<ItemId | null>(null);
  const [graphSemanticTests, setGraphSemanticTests] = useState<SemanticTest[]>([]);

  // ツリービュー用: ファイル・アイテム選択状態
  const [treeSelectedFilePath, setTreeSelectedFilePath] = useState<string | null>(null);
  const [treeCurrentFile, setTreeCurrentFile] = useState<SourceFile | null>(null);
  const [treeSelectedItemId, setTreeSelectedItemId] = useState<ItemId | null>(null);
  const [treeSemanticTests, setTreeSemanticTests] = useState<SemanticTest[]>([]);

  // semantic情報（シーケンス図用）
  const [summaries, setSummaries] = useState<SummaryMap | undefined>(undefined);

  // semantic情報の読み込み
  useEffect(() => {
    loadAllSummaries()
      .then(setSummaries)
      .catch((err) => console.error('Failed to load summaries:', err));
  }, []);

  // グラフ関連のフック
  const { graphData, isLoading: graphLoading, error: graphError } = useGraphTraversal();
  const { layoutOptions, filter, setLayoutType, updateFilter, clearFocusNode, excludeNode, clearExcludedNodes } = useGraphLayout();

  // シーケンス図関連
  const sequenceDiagram = useSequenceDiagram(graphData, summaries);

  // ノード中心表示用の状態（変更されるとGraphViewが該当ノードを中心に表示）
  const [centerNodeId, setCenterNodeId] = useState<string | null>(null);

  // コンテキストメニュー状態
  const [contextMenu, setContextMenu] = useState<{
    position: { x: number; y: number };
    nodeId: string;
    nodeLabel: string;
    nodeType: ItemType;
    nodeFile: string;
    nodeLine: number;
  } | null>(null);

  // CallersIndex の構築
  const callersIndex = useMemo<CallersIndex | null>(() => {
    if (!graphData) return null;

    // CytoscapeData から CallGraphChunk 形式に変換
    const chunks = [{
      source_dirs: [],
      generated_at: new Date().toISOString(),
      nodes: graphData.nodes.map(node => ({
        id: node.data.id as ItemId,
        file: node.data.file,
        line: node.data.line,
      })),
      edges: graphData.edges.map(edge => ({
        from: edge.data.source as ItemId,
        to: edge.data.target as ItemId,
        call_site: {
          file: edge.data.callSite.file,
          line: edge.data.callSite.line,
        },
      })),
      external_refs: [],
    }];

    return buildIndex(chunks);
  }, [graphData]);

  /**
   * グラフノードクリック時のハンドラ
   * ノードのファイルをロードし、DetailPanelに表示
   */
  const handleGraphNodeClick = useCallback(
    async (nodeId: string, filePath: string) => {
      try {
        const { splitFile, semanticTests: tests } = await loadFileWithSemantic(filePath);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawData = splitFile as any;
        const sourceFile: SourceFile = {
          path: rawData.path || filePath,
          hash: '',
          last_modified: '',
          items: rawData.items || [],
        };
        setGraphCurrentFile(sourceFile);
        setGraphSemanticTests(tests);
        setGraphSelectedItemId(nodeId as ItemId);
      } catch (err) {
        console.error('Failed to load file:', err);
        setGraphCurrentFile(null);
        setGraphSemanticTests([]);
        setGraphSelectedItemId(null);
      }
    },
    [loadFileWithSemantic]
  );

  /**
   * グラフビューでのアイテム選択時のハンドラ
   */
  const handleGraphSelectItem = useCallback((id: ItemId) => {
    setGraphSelectedItemId(id);
  }, []);

  /**
   * ツリービューでのファイル選択時のハンドラ
   */
  const handleTreeSelectFile = useCallback(
    async (filePath: string) => {
      setTreeSelectedFilePath(filePath);
      setTreeSelectedItemId(null);

      try {
        const { splitFile, semanticTests: tests } = await loadFileWithSemantic(filePath);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawData = splitFile as any;
        const sourceFile: SourceFile = {
          path: rawData.path || filePath,
          hash: '',
          last_modified: '',
          items: rawData.items || [],
        };
        setTreeCurrentFile(sourceFile);
        setTreeSemanticTests(tests);
      } catch (err) {
        console.error('Failed to load file:', err);
        setTreeCurrentFile(null);
        setTreeSemanticTests([]);
      }
    },
    [loadFileWithSemantic]
  );

  /**
   * ツリービューでのアイテム選択時のハンドラ
   */
  const handleTreeSelectItem = useCallback((id: ItemId) => {
    setTreeSelectedItemId(id);
  }, []);

  /**
   * 検索からグラフノードを選択するハンドラ
   * ノードを中心表示し、詳細パネルにファイル情報を表示
   */
  const handleSearchSelectGraph = useCallback(
    async (nodeId: string, filePath: string) => {
      // ノードを中心表示
      setCenterNodeId(null);
      setTimeout(() => setCenterNodeId(nodeId), 0);

      // ファイル情報を読み込んで詳細パネルに表示
      await handleGraphNodeClick(nodeId, filePath);
    },
    [handleGraphNodeClick]
  );

  /**
   * 検索からツリーアイテムを選択するハンドラ
   * ファイルを選択し、アイテムを選択
   */
  const handleSearchSelectTree = useCallback(
    async (filePath: string, itemId: ItemId) => {
      await handleTreeSelectFile(filePath);
      setTreeSelectedItemId(itemId);
    },
    [handleTreeSelectFile]
  );

  /**
   * サイドパネル開閉トグル
   */
  const handleToggleSidePanel = useCallback(() => {
    setIsSidePanelOpen(prev => !prev);
  }, []);

  /**
   * ノードを中心に表示するハンドラ
   * コンテキストメニューの「このノードを中心に表示」から呼ばれる
   */
  const handleCenterOnNode = useCallback((nodeId: string) => {
    // 一旦nullにしてから設定することで、同じノードでもuseEffectがトリガーされる
    setCenterNodeId(null);
    setTimeout(() => {
      setCenterNodeId(nodeId);
      setContextMenu(null); // メニューを閉じる
    }, 0);
  }, []);

  /**
   * 関連ノードのみ表示するハンドラ
   * コンテキストメニューの「関連ノードのみ表示」から呼ばれる
   */
  const handleShowRelatedNodes = useCallback((nodeId: string) => {
    updateFilter({ focusNodeId: nodeId });
  }, [updateFilter]);

  /**
   * ノード右クリック時のハンドラ
   */
  const handleContextMenuNode = useCallback(
    (nodeId: string, label: string, position: { x: number; y: number }) => {
      // graphDataからノード詳細を取得
      const node = graphData?.nodes.find((n) => n.data.id === nodeId);
      setContextMenu({
        position,
        nodeId,
        nodeLabel: label,
        nodeType: (node?.data.type ?? 'fn') as ItemType,
        nodeFile: node?.data.file ?? '',
        nodeLine: node?.data.line ?? 0,
      });
    },
    [graphData]
  );

  /**
   * ノード除外ハンドラ（コンテキストメニューから呼ばれる）
   */
  const handleExcludeNode = useCallback(
    (nodeId: string) => {
      excludeNode(nodeId);
      setContextMenu(null);
    },
    [excludeNode]
  );

  /**
   * シーケンス図タブを開く
   */
  const { setRootFunction: setSequenceRootFunction } = sequenceDiagram;
  const handleOpenSequenceDiagram = useCallback(
    (functionId: ItemId) => {
      setSequenceRootFunction(functionId);
      setActiveTab('sequence');
    },
    [setSequenceRootFunction]
  );

  /**
   * コンテキストメニューからファイルを開くハンドラ
   */
  const handleOpenFileFromContext = useCallback(async (filePath: string) => {
    const nodeId = contextMenu?.nodeId;
    if (nodeId) {
      await handleGraphNodeClick(nodeId, filePath);
    }
    setContextMenu(null);
  }, [contextMenu, handleGraphNodeClick]);

  /**
   * フォーカスノードのラベルを取得（表示用）
   */
  const focusNodeLabel = useMemo(() => {
    if (!filter.focusNodeId || !graphData) return undefined;
    const node = graphData.nodes.find((n) => n.data.id === filter.focusNodeId);
    return node?.data.label;
  }, [filter.focusNodeId, graphData]);

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

  // データなし（/perchwork 未実行）
  if (!index) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Perchwork</h1>
          <p className="text-gray-400 mb-8">Code Structure Visualizer</p>
          <div className="bg-gray-800 rounded-lg p-6 max-w-md">
            <p className="text-yellow-400 mb-4">データがありません</p>
            <p className="text-sm text-gray-500">
              Claude Code で <code className="bg-gray-700 px-2 py-1 rounded">/perchwork</code> を実行して
              コードベースを解析してください。
            </p>
          </div>
        </div>
      </div>
    );
  }

  // メインレイアウト
  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen bg-gray-900 text-gray-100">
        {/* ヘッダー */}
        <Header
          projectName="Perchwork"
          activeTab={activeTab}
          onTabChange={setActiveTab}
          searchItems={searchItems}
          searchLoading={searchLoading}
          onSearchSelectGraph={handleSearchSelectGraph}
          onSearchSelectTree={handleSearchSelectTree}
        />

        {/* メインコンテンツエリア */}
        <div className="flex flex-1 overflow-hidden">
          {/* シーケンス図タブの場合はサイドパネルを表示しない */}
          {activeTab !== 'sequence' && (
            <>
              {/* サイドパネル（左側） */}
              <SidePanel isOpen={isSidePanelOpen} onToggle={handleToggleSidePanel}>
                {activeTab === 'graph' ? (
                  // グラフ表示: サイドパネルに DetailPanel
                  <DetailPanel
                    file={graphCurrentFile}
                    selectedItemId={graphSelectedItemId}
                    onSelectItem={handleGraphSelectItem}
                    callersIndex={callersIndex}
                    semanticTests={graphSemanticTests}
                  />
                ) : (
                  // ツリー表示: サイドパネルに TreeView
                  <TreeView
                    index={index}
                    selectedFilePath={treeSelectedFilePath}
                    onSelectFile={handleTreeSelectFile}
                  />
                )}
              </SidePanel>

              {/* メインエリア（右側） */}
              <MainContent>
                {activeTab === 'graph' ? (
                  // グラフ表示: メインエリアに GraphView
                  <>
                    {/* グラフツールバー */}
                    <GraphToolbar
                      layout={layoutOptions.type}
                      onLayoutChange={setLayoutType}
                      filter={filter}
                      onFilterChange={updateFilter}
                      focusNodeLabel={focusNodeLabel}
                      onClearFocus={clearFocusNode}
                      onClearExcluded={clearExcludedNodes}
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
                          onContextMenuNode={handleContextMenuNode}
                          onNodeClick={handleGraphNodeClick}
                          centerOnNodeId={centerNodeId}
                        />

                        {/* ノードコンテキストメニュー */}
                        <NodeContextMenu
                          position={contextMenu?.position ?? null}
                          nodeId={contextMenu?.nodeId ?? null}
                          nodeLabel={contextMenu?.nodeLabel ?? null}
                          nodeType={contextMenu?.nodeType ?? null}
                          nodeFile={contextMenu?.nodeFile ?? null}
                          nodeLine={contextMenu?.nodeLine ?? null}
                          onClose={() => setContextMenu(null)}
                          onExclude={handleExcludeNode}
                          onFocus={handleCenterOnNode}
                          onShowRelated={handleShowRelatedNodes}
                          onOpenFile={handleOpenFileFromContext}
                          onOpenSequenceDiagram={(nodeId) => handleOpenSequenceDiagram(nodeId as ItemId)}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  // ツリー表示: メインエリアに DetailPanel
                  <div className="flex-1 overflow-auto">
                    <DetailPanel
                      file={treeCurrentFile}
                      selectedItemId={treeSelectedItemId}
                      onSelectItem={handleTreeSelectItem}
                      callersIndex={null}
                      semanticTests={treeSemanticTests}
                    />
                  </div>
                )}
              </MainContent>
            </>
          )}

          {/* シーケンス図タブ */}
          {activeTab === 'sequence' && (
            <div className="flex-1">
              <SequenceView
                rootFunctionId={sequenceDiagram.state.rootFunctionId}
                functionDepths={sequenceDiagram.expandedFunctions}
                mermaidCode={sequenceDiagram.mermaidCode}
                onFunctionDepthChange={sequenceDiagram.setFunctionDepth}
                useActivation={sequenceDiagram.useActivation}
                onToggleActivation={sequenceDiagram.toggleActivation}
              />
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
