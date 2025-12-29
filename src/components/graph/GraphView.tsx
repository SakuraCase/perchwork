/**
 * GraphView - Cytoscape.js によるインタラクティブグラフ表示
 *
 * 役割:
 *   - Cytoscape.js の初期化と管理
 *   - レイアウト適用
 *   - フィルタリング
 *   - ノード選択・ホバー
 *   - 大規模対応（仮想化、クラスタリング）
 */

import { useEffect, useRef, useMemo, useCallback } from 'react';
import cytoscape, { type Core, type NodeSingular } from 'cytoscape';
import dagre from 'cytoscape-dagre';

import type {
  CytoscapeData,
  LayoutOptions,
  GraphFilter,
} from '../../types/graph';

// cytoscape-dagre レイアウトを登録
cytoscape.use(dagre);

// ============================================
// Props定義
// ============================================

export interface GraphViewProps {
  /** グラフデータ（ノードとエッジ） */
  data: CytoscapeData;

  /** レイアウトオプション */
  layout?: LayoutOptions;

  /** フィルタ設定 */
  filter?: GraphFilter;

  /** ノード選択時のコールバック */
  onSelectNode?: (id: string) => void;

  /** ノードホバー時のコールバック（null でホバー解除） */
  onHoverNode?: (id: string | null) => void;

  /** 中心に表示するノードのID（変更されると該当ノードを中心に表示） */
  centerOnNodeId?: string | null;

  /** カスタムクラス名 */
  className?: string;
}

// ============================================
// デフォルトレイアウトオプション
// ============================================

const DEFAULT_LAYOUT: LayoutOptions = {
  type: 'hierarchical',
  animate: true,
  animationDuration: 500,
  fit: true,
  padding: 30,
};

// ============================================
// メインコンポーネント
// ============================================

export function GraphView({
  data,
  layout = DEFAULT_LAYOUT,
  filter,
  onSelectNode,
  onHoverNode,
  centerOnNodeId,
  className = '',
}: GraphViewProps) {
  // Cytoscape インスタンスと描画コンテナへの参照
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  // ============================================
  // フィルタリング処理
  // ============================================

  /**
   * フィルタ条件に基づいてノード/エッジをフィルタリング
   */
  const filteredData = useMemo(() => {
    if (!filter) {
      return data;
    }

    let nodes = data.nodes;
    let edges = data.edges;

    // ディレクトリフィルタ
    if (filter.directories.length > 0) {
      nodes = nodes.filter((node) =>
        filter.directories.some((dir) => node.data.file.startsWith(dir))
      );
    }

    // タイプフィルタ
    if (filter.types.length > 0) {
      nodes = nodes.filter((node) => filter.types.includes(node.data.type));
    }

    // フィルタリングされたノードのIDセット
    const nodeIds = new Set(nodes.map((node) => node.data.id));

    // エッジをフィルタリング（両端のノードが存在するもののみ）
    edges = edges.filter(
      (edge) => nodeIds.has(edge.data.source) && nodeIds.has(edge.data.target)
    );

    // 孤立ノード除外
    if (!filter.includeIsolated) {
      const connectedNodeIds = new Set<string>();
      edges.forEach((edge) => {
        connectedNodeIds.add(edge.data.source);
        connectedNodeIds.add(edge.data.target);
      });
      nodes = nodes.filter((node) => connectedNodeIds.has(node.data.id));
    }

    return { nodes, edges };
  }, [data, filter]);

  // ============================================
  // Cytoscape スタイル定義
  // ============================================

  const cytoscapeStyle = useMemo(
    () => [
      // ノード基本スタイル
      {
        selector: 'node',
        style: {
          label: 'data(label)',
          'background-color': '#4f46e5',
          'text-valign': 'bottom',
          'text-margin-y': 5,
          width: 60,
          height: 60,
          'font-size': 12,
          color: '#374151',
        },
      },
      // 構造体ノード
      {
        selector: 'node[type="struct"]',
        style: {
          'background-color': '#059669',
          shape: 'round-rectangle',
        },
      },
      // 関数ノード
      {
        selector: 'node[type="fn"]',
        style: {
          'background-color': '#4f46e5',
          shape: 'ellipse',
        },
      },
      // トレイトノード
      {
        selector: 'node[type="trait"]',
        style: {
          'background-color': '#dc2626',
          shape: 'diamond',
        },
      },
      // 列挙型ノード
      {
        selector: 'node[type="enum"]',
        style: {
          'background-color': '#f59e0b',
          shape: 'round-octagon',
        },
      },
      // 型エイリアスノード
      {
        selector: 'node[type="type"]',
        style: {
          'background-color': '#8b5cf6',
          shape: 'round-tag',
        },
      },
      // エッジ基本スタイル
      {
        selector: 'edge',
        style: {
          width: 2,
          'line-color': '#9ca3af',
          'target-arrow-color': '#9ca3af',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
        },
      },
      // 選択状態
      {
        selector: ':selected',
        style: {
          'background-color': '#f59e0b',
          'line-color': '#f59e0b',
          'target-arrow-color': '#f59e0b',
          'border-width': 3,
          'border-color': '#f59e0b',
        },
      },
    ],
    []
  );

  // ============================================
  // レイアウト設定変換
  // ============================================

  /**
   * LayoutOptions を Cytoscape.js のレイアウト設定に変換
   */
  const getCytoscapeLayout = useCallback(
    (layoutOptions: LayoutOptions) => {
      const baseLayout = {
        animate: layoutOptions.animate,
        animationDuration: layoutOptions.animationDuration,
        fit: layoutOptions.fit,
        padding: layoutOptions.padding,
      };

      switch (layoutOptions.type) {
        case 'hierarchical':
          return {
            name: 'dagre',
            rankDir: 'TB', // Top to Bottom
            nodeSep: 50,
            rankSep: 100,
            ...baseLayout,
          };
        case 'force':
          return {
            name: 'cose',
            nodeRepulsion: 8000,
            idealEdgeLength: 100,
            edgeElasticity: 100,
            ...baseLayout,
          };
        case 'radial':
          return {
            name: 'concentric',
            minNodeSpacing: 50,
            ...baseLayout,
          };
        case 'grid':
          return {
            name: 'grid',
            rows: undefined,
            cols: undefined,
            ...baseLayout,
          };
        default:
          return {
            name: 'dagre',
            rankDir: 'TB',
            ...baseLayout,
          };
      }
    },
    []
  );

  // ============================================
  // コールバック参照（安定した参照を維持）
  // ============================================

  const onSelectNodeRef = useRef(onSelectNode);
  const onHoverNodeRef = useRef(onHoverNode);

  useEffect(() => {
    onSelectNodeRef.current = onSelectNode;
    onHoverNodeRef.current = onHoverNode;
  }, [onSelectNode, onHoverNode]);

  // ============================================
  // Cytoscape 初期化とクリーンアップ
  // ============================================

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    // Cytoscape インスタンスを初期化
    const cy = cytoscape({
      container: containerRef.current,
      elements: {
        nodes: filteredData.nodes.map((node) => ({
          data: node.data,
          position: node.position,
        })),
        edges: filteredData.edges.map((edge) => ({
          data: edge.data,
        })),
      },
      // Cytoscapeの型定義が厳密すぎるため、any経由で型アサーション
      // 実行時には正しく動作する
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style: cytoscapeStyle as any,
      // 大規模グラフ対応の仮想化設定
      hideEdgesOnViewport: true,
      textureOnViewport: true,
      // ユーザーインタラクション設定
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: true,
    });

    cyRef.current = cy;

    // イベントリスナー登録（refを使用して安定した参照を維持）
    cy.on('tap', 'node', (event: cytoscape.EventObject) => {
      const node = event.target as NodeSingular;
      const nodeId = node.data('id') as string;
      onSelectNodeRef.current?.(nodeId);
    });

    cy.on('mouseover', 'node', (event: cytoscape.EventObject) => {
      const node = event.target as NodeSingular;
      const nodeId = node.data('id') as string;
      onHoverNodeRef.current?.(nodeId);
    });

    cy.on('mouseout', 'node', () => {
      onHoverNodeRef.current?.(null);
    });

    // 初期レイアウト適用
    const layoutConfig = getCytoscapeLayout(layout);
    cy.layout(layoutConfig).run();

    // クリーンアップ
    return () => {
      // イベントリスナーを削除してからレイアウトを停止
      cy.removeAllListeners();
      // レイアウトアニメーションを停止してから破棄
      cy.stop();
      cy.destroy();
      cyRef.current = null;
    };
  }, [filteredData, cytoscapeStyle, layout, getCytoscapeLayout]);

  // ============================================
  // ノード中心表示
  // ============================================

  /**
   * centerOnNodeId が変更されたら、該当ノードを中心に表示
   */
  useEffect(() => {
    if (!cyRef.current || !centerOnNodeId) {
      return;
    }

    const cy = cyRef.current;
    const node = cy.$(`#${CSS.escape(centerOnNodeId)}`);

    if (node.length > 0) {
      // ノードを選択状態にする
      cy.elements().unselect();
      node.select();

      // ノードを中心に表示（アニメーション付き）
      cy.animate({
        center: { eles: node },
        zoom: 1.5,
        duration: 500,
      });
    }
  }, [centerOnNodeId]);

  // ============================================
  // レンダリング
  // ============================================

  return (
    <div
      ref={containerRef}
      className={`w-full h-full bg-gray-50 ${className}`}
      style={{ minHeight: '400px' }}
    />
  );
}
