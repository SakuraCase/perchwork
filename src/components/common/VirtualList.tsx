import React, { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

/**
 * VirtualList コンポーネント
 *
 * 大量の項目を効率的に表示するための仮想スクロールリスト。
 * 表示領域外の項目は描画せず、スクロール位置に応じて動的に描画する。
 */

interface VirtualListProps<T> {
  /** 表示する項目の配列 */
  items: T[];
  /** 各項目の高さ（ピクセル） */
  itemHeight: number;
  /** 項目を描画する関数 */
  renderItem: (item: T, index: number) => ReactNode;
  /** コンテナの高さ（ピクセル） */
  containerHeight: number;
}

/**
 * VirtualListコンポーネント
 *
 * 仮想スクロールを実装し、大量データを扱う際のパフォーマンスを最適化。
 * 実際に表示される項目のみをDOMに配置することでメモリ使用量を削減。
 *
 * @typeParam T - リスト項目の型
 */
export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  containerHeight
}: VirtualListProps<T>): React.ReactElement {
  // スクロール位置を管理
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // リスト全体の高さを計算
  const totalHeight = items.length * itemHeight;

  // 表示領域に収まる項目数を計算（前後にバッファを持たせる）
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const bufferCount = 3; // 前後に余分に描画する項目数

  // 現在のスクロール位置から表示開始インデックスを計算
  const startIndex = Math.max(
    0,
    Math.floor(scrollTop / itemHeight) - bufferCount
  );

  // 表示終了インデックスを計算
  const endIndex = Math.min(
    items.length,
    startIndex + visibleCount + bufferCount * 2
  );

  // 表示する項目を抽出
  const visibleItems = items.slice(startIndex, endIndex);

  // スクロールイベントハンドラ
  const handleScroll = (e: React.UIEvent<HTMLDivElement>): void => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);
  };

  // コンテナの高さが変更されたときにスクロール位置を再計算
  useEffect(() => {
    if (containerRef.current) {
      const currentScrollTop = containerRef.current.scrollTop;
      setScrollTop(currentScrollTop);
    }
  }, [containerHeight]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="overflow-y-auto"
      style={{ height: `${containerHeight}px` }}
    >
      {/* スクロール可能な領域全体のスペーサー */}
      <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
        {/* 表示される項目のみをレンダリング */}
        <div
          style={{
            position: 'absolute',
            top: `${startIndex * itemHeight}px`,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, relativeIndex) => {
            const absoluteIndex = startIndex + relativeIndex;
            return (
              <div
                key={absoluteIndex}
                style={{ height: `${itemHeight}px` }}
                className="overflow-hidden"
              >
                {renderItem(item, absoluteIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
