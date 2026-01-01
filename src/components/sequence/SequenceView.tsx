/**
 * SequenceView コンポーネント
 *
 * シーケンス図タブのメインビュー
 * Mermaidを使用してシーケンス図をレンダリングする
 */

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import type { ItemId } from '@/types/schema';
import type { FunctionDepthSetting } from '@/types/sequence';
import { extractDisplayName } from '@/services/mermaidGenerator';
import { DepthControl } from './DepthControl';

interface SequenceViewProps {
  /** 起点関数ID */
  rootFunctionId: ItemId | null;
  /** 関数ごとの深さ設定（ルート関数は除外済み） */
  functionDepths: FunctionDepthSetting[];
  /** 生成されたMermaidコード */
  mermaidCode: string | null;
  /** 関数深さ変更時のコールバック */
  onFunctionDepthChange: (functionId: ItemId, depth: number) => void;
}

// Mermaid初期化
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  sequence: {
    diagramMarginX: 50,
    diagramMarginY: 10,
    actorMargin: 50,
    width: 150,
    height: 65,
    boxMargin: 10,
    boxTextMargin: 5,
    noteMargin: 10,
    messageMargin: 35,
  },
});

/**
 * シーケンス図ビューコンポーネント
 */
export function SequenceView({
  rootFunctionId,
  functionDepths,
  mermaidCode,
  onFunctionDepthChange,
}: SequenceViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [isContainerReady, setIsContainerReady] = useState(false);

  // containerRef が準備できたらフラグを立てる
  useEffect(() => {
    if (containerRef.current) {
      setIsContainerReady(true);
    }
  }, []);

  // Mermaid図をレンダリング
  useEffect(() => {
    if (!mermaidCode || !containerRef.current || !isContainerReady) return;

    const renderDiagram = async () => {
      setIsRendering(true);
      setError(null);

      try {
        // 一意のIDを生成
        const id = `mermaid-${Date.now()}`;

        // コンテナをクリア
        containerRef.current!.innerHTML = '';

        // Mermaidでレンダリング
        const { svg } = await mermaid.render(id, mermaidCode);

        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        console.error('Mermaid render error:', err);
        setError(err instanceof Error ? err.message : 'レンダリングに失敗しました');
      } finally {
        setIsRendering(false);
      }
    };

    renderDiagram();
  }, [mermaidCode, isContainerReady]);

  // 起点関数が未選択の場合
  if (!rootFunctionId) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-center text-gray-500">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
            />
          </svg>
          <p className="text-lg mb-2">シーケンス図がありません</p>
          <p className="text-sm">グラフビューで関数を選択し、「シーケンス図表示」ボタンをクリックしてください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-900">
      {/* サイドバー: 設定 */}
      <div className="w-72 flex-shrink-0 border-r border-gray-700 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* 起点関数 */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">起点:</label>
            <div className="px-3 py-2 bg-gray-800 rounded border border-gray-700 text-sm text-blue-400 font-mono truncate">
              {extractDisplayName(rootFunctionId)}
            </div>
          </div>

          {/* 関数ごとの深さ設定 */}
          {functionDepths.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm text-gray-400">関数の深さ設定:</label>
              <DepthControl
                functionDepths={functionDepths}
                onDepthChange={onFunctionDepthChange}
              />
            </div>
          )}
        </div>
      </div>

      {/* メインエリア: 図の表示 */}
      <div className="flex-1 overflow-auto p-4 relative">
        {isRendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
            <div className="text-gray-500">レンダリング中...</div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-red-400">
              <p className="mb-2">レンダリングエラー</p>
              <p className="text-sm text-gray-500">{error}</p>
            </div>
          </div>
        )}

        {!error && (
          <div
            ref={containerRef}
            className="flex justify-center items-start min-h-full"
          />
        )}
      </div>
    </div>
  );
}
