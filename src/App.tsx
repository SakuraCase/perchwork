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
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Loading } from './components/common/Loading';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MainContent } from './components/layout/MainContent';
import { DirectoryTree } from './components/tree/DirectoryTree';
import { DetailPanel } from './components/detail/DetailPanel';

/**
 * アプリケーションルートコンポーネント
 *
 * 状態管理:
 * - index.json の読み込み（useDataLoader）
 * - ツリー構造の構築と展開状態（useTreeState）
 * - ファイル選択状態（selectedFilePath, currentFile）
 * - アイテム選択状態（selectedItemId）
 *
 * データフロー:
 * 1. 初期ロード: index.json を取得
 * 2. ツリー構築: ファイルパス配列から TreeNode[] を生成
 * 3. ファイル選択: DirectoryTree -> loadFile() -> DetailPanel
 * 4. アイテム選択: DetailPanel 内部で管理
 */
function App() {
  // データ読み込みとキャッシュ管理
  const { index, loadFile, isLoading, error } = useDataLoader();

  // ツリー構造と展開状態の管理
  const { nodes, toggleExpand } = useTreeState(index);

  // ファイル選択状態
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<SourceFile | null>(null);

  // アイテム選択状態
  const [selectedItemId, setSelectedItemId] = useState<ItemId | null>(null);

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

          {/* メインコンテンツ: 詳細パネル */}
          <MainContent>
            <DetailPanel
              file={currentFile}
              selectedItemId={selectedItemId}
              onSelectItem={handleSelectItem}
            />
          </MainContent>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
