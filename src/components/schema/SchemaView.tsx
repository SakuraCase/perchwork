/**
 * SchemaView.tsx
 *
 * スキーマグラフのメインビュー（ReactFlow使用）
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type NodeTypes,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import * as d3 from 'd3';

import { useSchemaLoader } from '../../hooks/useSchemaLoader';
import type {
  SchemaNodeData,
  SchemaEdgeData,
  SchemaLayoutType,
  SchemaFilter,
  SavedSchemaSettings,
} from '../../types/schemaGraph';
import { DEFAULT_SCHEMA_FILTER } from '../../types/schemaGraph';
import { SchemaNode } from './SchemaNode';
import { SchemaToolbar } from './SchemaToolbar';
import { SchemaContextMenu } from './SchemaContextMenu';

/** カスタムノードタイプ */
const nodeTypes: NodeTypes = {
  schema: SchemaNode,
};

/** ReactFlow用ノード型（ReactFlowの型制約に合わせてRecord<string, unknown>を拡張） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SchemaFlowNode = Node<any, 'schema'>;

/** ノードの高さを計算（フィールド数に応じて動的に） */
function calculateNodeHeight(fieldsCount: number): number {
  const headerHeight = 44;
  const fieldHeight = 20;
  const footerHeight = 30;
  const padding = 10;
  return headerHeight + (fieldsCount * fieldHeight) + footerHeight + padding;
}

/** 共通データを付加 */
function enrichNodeData(
  schemaNodes: SchemaNodeData[],
  schemaEdges: SchemaEdgeData[]
): { nodes: SchemaNodeData[]; referencedTypesMap: Map<string, Set<string>>; maxInDegree: number } {
  // 参照先の型名セットを作成
  const referencedTypesMap = new Map<string, Set<string>>();
  for (const edge of schemaEdges) {
    if (!referencedTypesMap.has(edge.sourceId)) {
      referencedTypesMap.set(edge.sourceId, new Set());
    }
    referencedTypesMap.get(edge.sourceId)!.add(edge.fieldName);
  }

  // 最大inDegree
  const sortedNodes = [...schemaNodes].sort((a, b) => b.inDegree - a.inDegree);
  const maxInDegree = sortedNodes.length > 0 ? sortedNodes[0].inDegree : 0;

  return { nodes: sortedNodes, referencedTypesMap, maxInDegree };
}

/** グリッドレイアウト */
function layoutNodesGrid(
  schemaNodes: SchemaNodeData[],
  schemaEdges: SchemaEdgeData[]
): SchemaFlowNode[] {
  const { nodes: sortedNodes, referencedTypesMap, maxInDegree } = enrichNodeData(schemaNodes, schemaEdges);

  // グリッド配置
  const cols = Math.ceil(Math.sqrt(sortedNodes.length * 1.5));
  const nodeWidth = 220;
  const gapX = 80;
  const gapY = 60;

  // 各行の最大高さを計算
  const rowMaxHeights: number[] = [];
  sortedNodes.forEach((node, index) => {
    const row = Math.floor(index / cols);
    const height = calculateNodeHeight(node.fields?.length || 0);
    if (rowMaxHeights[row] === undefined || height > rowMaxHeights[row]) {
      rowMaxHeights[row] = height;
    }
  });

  // 各行のY座標を累積計算
  const rowYPositions: number[] = [0];
  for (let i = 0; i < rowMaxHeights.length - 1; i++) {
    rowYPositions.push(rowYPositions[i] + rowMaxHeights[i] + gapY);
  }

  return sortedNodes.map((node, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);

    return {
      id: node.name,
      type: 'schema',
      position: {
        x: col * (nodeWidth + gapX),
        y: rowYPositions[row] || 0,
      },
      data: {
        ...node,
        referencedTypes: referencedTypesMap.get(node.name) || new Set(),
        maxInDegree,
      },
    };
  });
}

/** 力学レイアウト（d3-force） */
function layoutNodesForce(
  schemaNodes: SchemaNodeData[],
  schemaEdges: SchemaEdgeData[]
): SchemaFlowNode[] {
  const { nodes: sortedNodes, referencedTypesMap, maxInDegree } = enrichNodeData(schemaNodes, schemaEdges);

  if (sortedNodes.length === 0) return [];

  // d3-force用のノードとリンクを準備
  interface D3Node extends d3.SimulationNodeDatum {
    id: string;
    originalNode: SchemaNodeData;
  }

  interface D3Link extends d3.SimulationLinkDatum<D3Node> {
    source: string | D3Node;
    target: string | D3Node;
  }

  const d3Nodes: D3Node[] = sortedNodes.map((node) => ({
    id: node.name,
    originalNode: node,
  }));

  // エッジを重複除去（同じsource-targetペアは1つに）
  const uniqueEdges = new Map<string, SchemaEdgeData>();
  for (const edge of schemaEdges) {
    const key = `${edge.sourceId}-${edge.targetId}`;
    if (!uniqueEdges.has(key)) {
      uniqueEdges.set(key, edge);
    }
  }

  const d3Links: D3Link[] = Array.from(uniqueEdges.values()).map((edge) => ({
    source: edge.sourceId,
    target: edge.targetId,
  }));

  // シミュレーションを実行
  const nodeWidth = 220;

  // 各ノードの衝突半径を計算（重ならない最小限のサイズ）
  const getCollisionRadius = (d: D3Node) => {
    const height = calculateNodeHeight(d.originalNode.fields?.length || 0);
    return Math.sqrt(nodeWidth * nodeWidth + height * height) / 2 + 5;
  };

  // リンク距離を動的に計算（両端のノードサイズに基づく）
  const getLinkDistance = (link: D3Link) => {
    const sourceNode = typeof link.source === 'string'
      ? d3Nodes.find(n => n.id === link.source)
      : link.source;
    const targetNode = typeof link.target === 'string'
      ? d3Nodes.find(n => n.id === link.target)
      : link.target;
    const sourceRadius = sourceNode ? getCollisionRadius(sourceNode) : 100;
    const targetRadius = targetNode ? getCollisionRadius(targetNode) : 100;
    return sourceRadius + targetRadius + 30; // 最小限の間隔
  };

  const simulation = d3.forceSimulation(d3Nodes)
    .force('link', d3.forceLink<D3Node, D3Link>(d3Links)
      .id((d) => d.id)
      .distance(getLinkDistance)
      .strength(0.8))  // リンク力を強く（接続ノードを引き寄せる）
    .force('charge', d3.forceManyBody()
      .strength(-600)  // 反発力を弱める
      .distanceMax(500))
    .force('center', d3.forceCenter(600, 400))
    .force('collision', d3.forceCollide<D3Node>()
      .radius(getCollisionRadius)
      .iterations(2)
      .strength(1))
    .stop();

  // シミュレーションを同期的に実行
  for (let i = 0; i < 400; i++) {
    simulation.tick();
  }

  // 結果をReactFlowノードに変換
  return d3Nodes.map((d3Node) => ({
    id: d3Node.id,
    type: 'schema' as const,
    position: {
      x: d3Node.x ?? 0,
      y: d3Node.y ?? 0,
    },
    data: {
      ...d3Node.originalNode,
      referencedTypes: referencedTypesMap.get(d3Node.id) || new Set(),
      maxInDegree,
    },
  }));
}

/** 階層レイアウト（左から右へ依存フロー、フィールド順で配置） */
function layoutNodesHierarchy(
  schemaNodes: SchemaNodeData[],
  schemaEdges: SchemaEdgeData[]
): SchemaFlowNode[] {
  const { nodes: sortedNodes, referencedTypesMap, maxInDegree } = enrichNodeData(schemaNodes, schemaEdges);

  if (sortedNodes.length === 0) return [];

  const nodeNames = new Set(sortedNodes.map(n => n.name));

  // 入次数と出辺を計算（フィールド順序を保持）
  const inDegreeMap = new Map<string, number>();
  const outEdgesOrdered = new Map<string, string[]>(); // フィールド順

  for (const node of sortedNodes) {
    inDegreeMap.set(node.name, 0);
    // フィールド順に子ノードを取得
    const children: string[] = [];
    if (node.fields) {
      for (const field of node.fields) {
        // このフィールドが参照する型を探す
        for (const edge of schemaEdges) {
          if (edge.sourceId === node.name && edge.fieldName === field.name && nodeNames.has(edge.targetId)) {
            if (!children.includes(edge.targetId)) {
              children.push(edge.targetId);
            }
          }
        }
      }
    }
    outEdgesOrdered.set(node.name, children);
  }

  // 入次数を計算
  for (const children of outEdgesOrdered.values()) {
    for (const child of children) {
      inDegreeMap.set(child, (inDegreeMap.get(child) || 0) + 1);
    }
  }

  // BFSでレベルを割り当て
  const levels = new Map<string, number>();
  const rootNodes: string[] = [];

  for (const node of sortedNodes) {
    if ((inDegreeMap.get(node.name) || 0) === 0) {
      rootNodes.push(node.name);
      levels.set(node.name, 0);
    }
  }

  if (rootNodes.length === 0) {
    // 循環参照のみの場合、outDegreeが最も高いノードをルートに
    let maxOutDegree = -1;
    let bestRoot: string | null = null;
    for (const node of sortedNodes) {
      const outDegree = outEdgesOrdered.get(node.name)?.length || 0;
      if (outDegree > maxOutDegree) {
        maxOutDegree = outDegree;
        bestRoot = node.name;
      }
    }
    if (bestRoot) {
      rootNodes.push(bestRoot);
      levels.set(bestRoot, 0);
    }
  }

  // BFSでレベルを伝播
  const queue = [...rootNodes];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLevel = levels.get(current) || 0;
    const children = outEdgesOrdered.get(current) || [];

    for (const child of children) {
      const existingLevel = levels.get(child);
      const newLevel = currentLevel + 1;
      if (existingLevel === undefined || newLevel > existingLevel) {
        levels.set(child, newLevel);
        queue.push(child);
      }
    }
  }

  // 未訪問ノードを処理
  for (const node of sortedNodes) {
    if (!levels.has(node.name)) {
      levels.set(node.name, 0);
    }
  }

  // 各ノードのY座標順序を決定（親のフィールド順に基づく）
  const nodeOrder = new Map<string, number>();
  let orderCounter = 0;

  // ルートノードから順序を割り当て
  const assignOrder = (nodeName: string) => {
    if (nodeOrder.has(nodeName)) return;
    nodeOrder.set(nodeName, orderCounter++);
    const children = outEdgesOrdered.get(nodeName) || [];
    for (const child of children) {
      assignOrder(child);
    }
  };

  // ルートノードをoutDegree順にソートしてから順序を割り当て
  rootNodes.sort((a, b) => (outEdgesOrdered.get(b)?.length || 0) - (outEdgesOrdered.get(a)?.length || 0));
  for (const root of rootNodes) {
    assignOrder(root);
  }

  // 未割当ノードに順序を割り当て
  for (const node of sortedNodes) {
    if (!nodeOrder.has(node.name)) {
      nodeOrder.set(node.name, orderCounter++);
    }
  }

  // レベルごとにノードをグループ化
  const levelGroups = new Map<number, SchemaNodeData[]>();
  for (const node of sortedNodes) {
    const level = levels.get(node.name) || 0;
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)!.push(node);
  }

  // レイアウト計算
  const nodeWidth = 220;
  const gapX = 150;
  const gapY = 40;

  const nodePositions = new Map<string, { x: number; y: number }>();
  const sortedLevels = [...levelGroups.keys()].sort((a, b) => a - b);

  for (const level of sortedLevels) {
    const nodesAtLevel = levelGroups.get(level) || [];
    // 親のフィールド順に基づいてソート
    nodesAtLevel.sort((a, b) => (nodeOrder.get(a.name) || 0) - (nodeOrder.get(b.name) || 0));

    const nodeHeights = nodesAtLevel.map(node => calculateNodeHeight(node.fields?.length || 0));
    const totalHeight = nodeHeights.reduce((sum, h) => sum + h, 0) + (nodesAtLevel.length - 1) * gapY;
    const startY = -totalHeight / 2;

    const x = level * (nodeWidth + gapX);
    let currentY = startY;

    nodesAtLevel.forEach((node, index) => {
      nodePositions.set(node.name, { x, y: currentY });
      currentY += nodeHeights[index] + gapY;
    });
  }

  // ReactFlowノードを生成
  return sortedNodes.map((node) => ({
    id: node.name,
    type: 'schema' as const,
    position: nodePositions.get(node.name) || { x: 0, y: 0 },
    data: {
      ...node,
      referencedTypes: referencedTypesMap.get(node.name) || new Set(),
      maxInDegree,
    },
  }));
}

/** レイアウトタイプに応じてノードを配置 */
function layoutNodes(
  schemaNodes: SchemaNodeData[],
  schemaEdges: SchemaEdgeData[],
  layoutType: SchemaLayoutType
): SchemaFlowNode[] {
  switch (layoutType) {
    case 'force':
      return layoutNodesForce(schemaNodes, schemaEdges);
    case 'hierarchy':
      return layoutNodesHierarchy(schemaNodes, schemaEdges);
    case 'grid':
    default:
      return layoutNodesGrid(schemaNodes, schemaEdges);
  }
}

/** エッジを生成 */
function createEdges(schemaEdges: SchemaEdgeData[], layoutType: SchemaLayoutType): Edge[] {
  // レイアウトに応じたエッジタイプを選択
  const edgeType = layoutType === 'hierarchy' ? 'smoothstep' : 'default';

  return schemaEdges.map((edge) => ({
    id: edge.id,
    source: edge.sourceId,
    target: edge.targetId,
    sourceHandle: `field-${edge.fieldName}`,
    type: edgeType,
    animated: false,
    style: {
      stroke: '#78716c', // stone-500
      strokeWidth: 1.5,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#78716c',
      width: 12,
      height: 12,
    },
    labelStyle: {
      fill: '#a8a29e', // stone-400
      fontSize: 10,
    },
    labelBgStyle: {
      fill: '#1c1917', // stone-900
    },
  }));
}

/** コンテキストメニュー状態 */
interface ContextMenuState {
  position: { x: number; y: number } | null;
  nodeName: string | null;
  nodeType: 'struct' | 'enum' | null;
  nodeFile: string | null;
  nodeLine: number | null;
}

const initialContextMenuState: ContextMenuState = {
  position: null,
  nodeName: null,
  nodeType: null,
  nodeFile: null,
  nodeLine: null,
};

/** 内部ビューコンポーネントのprops */
interface SchemaViewInnerProps {
  focusTypeName?: string | null;
  onClearFocusTypeName?: () => void;
  onShowInTree?: (filePath: string) => void;
  savedSettings: SavedSchemaSettings[];
  onSave: (name: string, existingId?: string) => void;
  onOpen: (saved: SavedSchemaSettings) => void;
  onDeleteSaved: (id: string) => void;
  /** 外部管理のフィルタ状態 */
  filter: SchemaFilter;
  /** 外部管理のフィルタ更新関数 */
  onFilterChange: (filter: SchemaFilter) => void;
  /** 外部管理のレイアウトタイプ */
  layoutType: SchemaLayoutType;
  /** レイアウトタイプ更新関数 */
  onLayoutTypeChange: (layoutType: SchemaLayoutType) => void;
}

/** 内部ビューコンポーネント */
function SchemaViewInner({
  focusTypeName,
  onClearFocusTypeName,
  onShowInTree,
  savedSettings,
  onSave,
  onOpen,
  onDeleteSaved,
  filter,
  onFilterChange,
  layoutType,
  onLayoutTypeChange,
}: SchemaViewInnerProps) {
  const { rawData, filteredData, isLoading, error, reload } = useSchemaLoader({
    externalFilter: filter,
    onFilterChange,
  });
  const { fitView } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<SchemaFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(initialContextMenuState);

  // フィルタ適用後のデータからノードとエッジを生成
  useEffect(() => {
    if (filteredData) {
      const newNodes = layoutNodes(filteredData.nodes, filteredData.edges, layoutType);
      const newEdges = createEdges(filteredData.edges, layoutType);
      setNodes(newNodes);
      setEdges(newEdges);
    }
  }, [filteredData, layoutType, setNodes, setEdges]);

  // ノード配置後にフィット
  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => {
        fitView({ padding: 0.1, duration: 300 });
      }, 100);
    }
  }, [nodes.length, fitView]);

  // 検索からのフォーカス設定
  useEffect(() => {
    if (focusTypeName && rawData) {
      // 指定された型名が存在するか確認
      const exists = rawData.nodes.some(node => node.name === focusTypeName);
      if (exists) {
        onFilterChange({
          ...filter,
          focusNodeId: focusTypeName,
        });
      }
      // フォーカス設定後、親のステートをクリア
      onClearFocusTypeName?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filterを依存に含めると無限ループになるため除外
  }, [focusTypeName, rawData, onFilterChange, onClearFocusTypeName]);

  // ノードクリックハンドラ
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    console.log('Node clicked:', node.data);
  }, []);

  // ノード右クリックハンドラ
  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = node.data as any;
    setContextMenu({
      position: { x: event.clientX, y: event.clientY },
      nodeName: data.name || node.id,
      nodeType: data.type || null,
      nodeFile: data.filePath || null,
      nodeLine: data.line || null,
    });
  }, []);

  // コンテキストメニューを閉じる
  const closeContextMenu = useCallback(() => {
    setContextMenu(initialContextMenuState);
  }, []);

  // 背景クリックでコンテキストメニューを閉じる
  const onPaneClick = useCallback(() => {
    closeContextMenu();
  }, [closeContextMenu]);

  // 背景の右クリックを無効化
  const onPaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
    event.preventDefault();
  }, []);

  // 関連ノードのみ表示
  const handleShowRelated = useCallback((nodeName: string) => {
    onFilterChange({
      ...filter,
      focusNodeId: nodeName,
    });
  }, [filter, onFilterChange]);

  // ノードを除外
  const handleExclude = useCallback((nodeName: string) => {
    onFilterChange({
      ...filter,
      excludeNodeIds: [...filter.excludeNodeIds, nodeName],
    });
  }, [filter, onFilterChange]);

  // フォーカスを解除
  const handleClearFocus = useCallback(() => {
    onFilterChange({
      ...filter,
      focusNodeId: undefined,
    });
  }, [filter, onFilterChange]);

  // 除外をリセット
  const handleClearExclude = useCallback(() => {
    onFilterChange({
      ...filter,
      excludeNodeIds: [],
    });
  }, [filter, onFilterChange]);

  // ローディング表示
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-stone-900">
        <div className="text-stone-400 flex items-center gap-3">
          <div className="animate-spin w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full" />
          <span>スキーマデータを読み込み中...</span>
        </div>
      </div>
    );
  }

  // エラー表示
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-stone-900 gap-4">
        <div className="text-rose-400">{error}</div>
        <button
          onClick={reload}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
        >
          再読み込み
        </button>
      </div>
    );
  }

  // 空のstats（フィルタ結果が空の場合に使用）
  const emptyStats = {
    totalStructs: 0,
    totalEnums: 0,
    totalEdges: 0,
    maxInDegree: null,
  };

  // データなし判定
  const hasNoData = !filteredData || filteredData.nodes.length === 0;
  const isEmptySource = rawData?.nodes.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* ツールバー（常に表示） */}
      <SchemaToolbar
        filter={filter}
        onFilterChange={onFilterChange}
        stats={filteredData?.stats ?? emptyStats}
        layoutType={layoutType}
        onLayoutChange={onLayoutTypeChange}
        onClearFocus={handleClearFocus}
        onClearExclude={handleClearExclude}
        savedSettings={savedSettings}
        onSave={onSave}
        onOpen={onOpen}
        onDeleteSaved={onDeleteSaved}
      />

      {/* グラフまたはデータなしメッセージ */}
      {hasNoData ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-stone-900 gap-4">
          <div className="text-stone-400">
            {isEmptySource
              ? 'struct/enum が見つかりません'
              : 'フィルタ条件に一致するデータがありません'}
          </div>
          {rawData && rawData.nodes.length > 0 && (
            <button
              onClick={() => onFilterChange(DEFAULT_SCHEMA_FILTER)}
              className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-white rounded-lg transition-colors"
            >
              フィルタをリセット
            </button>
          )}
        </div>
      ) : (
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onNodeContextMenu={onNodeContextMenu}
            onPaneClick={onPaneClick}
            onPaneContextMenu={onPaneContextMenu}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.1}
            maxZoom={2}
            defaultEdgeOptions={{
              type: 'default',
            }}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#44403c" gap={20} />
            <Controls showInteractive={false} />
            <MiniMap
              className="!bg-stone-800 !border-stone-600 !rounded-lg"
              nodeColor={(node) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const data = node.data as any;
                return data?.type === 'struct' ? '#14b8a6' : '#f59e0b';
              }}
              maskColor="rgba(28, 25, 23, 0.8)"
            />
          </ReactFlow>
        </div>
      )}

      {/* コンテキストメニュー */}
      <SchemaContextMenu
        position={contextMenu.position}
        nodeName={contextMenu.nodeName}
        nodeType={contextMenu.nodeType}
        nodeFile={contextMenu.nodeFile}
        nodeLine={contextMenu.nodeLine}
        onClose={closeContextMenu}
        onShowRelated={handleShowRelated}
        onExclude={handleExclude}
        onShowInTree={onShowInTree}
      />
    </div>
  );
}

/** SchemaViewのprops */
export interface SchemaViewProps {
  /** 検索からフォーカスする型名 */
  focusTypeName?: string | null;
  /** フォーカス型名をクリア */
  onClearFocusTypeName?: () => void;
  /** ツリーで表示 */
  onShowInTree?: (filePath: string) => void;
  /** 保存済み設定一覧 */
  savedSettings: SavedSchemaSettings[];
  /** 保存時のコールバック */
  onSave: (name: string, existingId?: string) => void;
  /** 設定を開く時のコールバック */
  onOpen: (saved: SavedSchemaSettings) => void;
  /** 保存済み設定を削除する時のコールバック */
  onDeleteSaved: (id: string) => void;
  /** 外部管理のフィルタ状態 */
  filter: SchemaFilter;
  /** 外部管理のフィルタ更新関数 */
  onFilterChange: (filter: SchemaFilter) => void;
  /** 外部管理のレイアウトタイプ */
  layoutType: SchemaLayoutType;
  /** レイアウトタイプ更新関数 */
  onLayoutTypeChange: (layoutType: SchemaLayoutType) => void;
}

/** メインコンポーネント（Provider付き） */
export function SchemaView({
  focusTypeName,
  onClearFocusTypeName,
  onShowInTree,
  savedSettings,
  onSave,
  onOpen,
  onDeleteSaved,
  filter,
  onFilterChange,
  layoutType,
  onLayoutTypeChange,
}: SchemaViewProps) {
  return (
    <ReactFlowProvider>
      <SchemaViewInner
        focusTypeName={focusTypeName}
        onClearFocusTypeName={onClearFocusTypeName}
        onShowInTree={onShowInTree}
        savedSettings={savedSettings}
        onSave={onSave}
        onOpen={onOpen}
        onDeleteSaved={onDeleteSaved}
        filter={filter}
        onFilterChange={onFilterChange}
        layoutType={layoutType}
        onLayoutTypeChange={onLayoutTypeChange}
      />
    </ReactFlowProvider>
  );
}
