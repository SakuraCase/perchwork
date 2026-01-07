/**
 * DeferredGraphView - 遅延読み込み対応のグラフビュー
 *
 * タブ切り替え時にUIの応答性を優先し、グラフ描画を遅延させるラッパーコンポーネント。
 */

import { useDeferredGraphRender } from '@/hooks/useDeferredGraphRender';
import { Loading } from '@/components/common/Loading';
import { GraphView, type GraphViewProps } from './GraphView';

interface DeferredGraphViewProps extends GraphViewProps {
  /** タブがアクティブかどうか */
  isActive: boolean;
}

/**
 * 遅延読み込み対応のグラフビューコンポーネント
 *
 * isActiveがtrueになると、ブラウザのアイドル時間を待ってからGraphViewを描画する。
 * これにより、タブ切り替え時のUIフリーズを防ぐ。
 */
export function DeferredGraphView({
  isActive,
  ...graphViewProps
}: DeferredGraphViewProps) {
  const { shouldRender, isPending } = useDeferredGraphRender(isActive);

  // まだレンダリングすべきでない、または遅延処理中
  if (!shouldRender || isPending) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-stone-900">
        <Loading message="読み込み中..." />
      </div>
    );
  }

  return <GraphView {...graphViewProps} />;
}
