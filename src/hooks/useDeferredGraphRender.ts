/**
 * useDeferredGraphRender - グラフ描画の遅延制御
 *
 * タブ切り替え時にUIの応答性を優先し、グラフ描画を遅延させるフック。
 * useTransition + requestIdleCallback のハイブリッドアプローチを使用。
 */

import { useState, useEffect, useTransition } from 'react';

interface UseDeferredGraphRenderResult {
  /** グラフを実際にレンダリングすべきか */
  shouldRender: boolean;
  /** 遅延処理中か（ローディング表示用） */
  isPending: boolean;
}

/**
 * グラフ描画の遅延レンダリングを制御するフック
 *
 * @param isActive - タブがアクティブかどうか
 * @returns shouldRender: レンダリング可能か, isPending: 準備中か
 */
export function useDeferredGraphRender(
  isActive: boolean
): UseDeferredGraphRenderResult {
  const [shouldRender, setShouldRender] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isActive && !shouldRender) {
      // タブがアクティブになったら、低優先度でレンダリングを開始
      startTransition(() => {
        // requestIdleCallback でブラウザのアイドル時にレンダリング開始
        if ('requestIdleCallback' in window) {
          requestIdleCallback(
            () => {
              setShouldRender(true);
            },
            { timeout: 1000 } // 最大1秒待機
          );
        } else {
          // Safari等のフォールバック
          setTimeout(() => {
            setShouldRender(true);
          }, 50);
        }
      });
    }
  }, [isActive, shouldRender]);

  // タブ切り替え時はコンポーネント自体がunmountされるため、
  // リセット処理は不要（再マウント時に初期値falseから始まる）

  return {
    shouldRender,
    isPending,
  };
}
