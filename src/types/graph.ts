/**
 * グラフ描画に関する型定義
 */

import type { ItemType } from './schema';
import type { CallContext } from './sequence';

// ============================================
// Cytoscape.js 用のノード/エッジ型
// ============================================

/**
 * Cytoscape.js グラフノード
 *
 * 各ノードはコードアイテム（関数、構造体など）を表現する
 */
export interface CytoscapeNode {
  data: {
    /** ノードID（ItemIdと同じ） */
    id: string;

    /** 表示用ラベル */
    label: string;

    /** アイテムの種類 */
    type: ItemType;

    /** ソースファイルパス */
    file: string;

    /** 行番号 */
    line: number;

    /** 親ノードID（クラスタリング用） */
    parent?: string;

    /** メソッドの所属struct名 */
    implFor?: string;
  };

  /** ノード座標（レイアウト計算後に設定される） */
  position?: { x: number; y: number };
}

/**
 * Cytoscape.js グラフエッジ
 *
 * 各エッジはアイテム間の呼び出し関係を表現する
 */
export interface CytoscapeEdge {
  data: {
    /** エッジID（一意な文字列） */
    id: string;

    /** 呼び出し元ノードID */
    source: string;

    /** 呼び出し先ノードID */
    target: string;

    /** 呼び出し位置情報 */
    callSite: {
      file: string;
      line: number;
    };

    /** 呼び出しコンテキスト（制御構造情報） */
    context?: CallContext;
  };
}

/**
 * Cytoscape.js グラフデータ
 */
export interface CytoscapeData {
  /** ノード配列 */
  nodes: CytoscapeNode[];

  /** エッジ配列 */
  edges: CytoscapeEdge[];
}

// ============================================
// レイアウト設定
// ============================================

/**
 * グラフレイアウトの種類
 *
 * - hierarchical: 階層的レイアウト（DAGREアルゴリズム）
 * - force: 力学ベースレイアウト（スプリングモデル）
 * - radial: 放射状レイアウト（中心ノードから放射）
 * - grid: グリッドレイアウト（整列配置）
 */
export type LayoutType = 'hierarchical' | 'force' | 'radial' | 'grid';

/**
 * レイアウトオプション
 */
export interface LayoutOptions {
  /** レイアウトの種類 */
  type: LayoutType;

  /** アニメーション有効化 */
  animate: boolean;

  /** アニメーション時間（ミリ秒） */
  animationDuration: number;

  /** 表示領域にフィットさせるか */
  fit: boolean;

  /** パディング（ピクセル） */
  padding: number;
}

// ============================================
// フィルタ設定
// ============================================

/**
 * グラフフィルタ設定
 *
 * 特定の条件に基づいてノード/エッジを絞り込む
 */
export interface GraphFilter {
  /** 対象ディレクトリ（空配列ですべて表示） */
  directories: string[];

  /** 孤立ノード（エッジなし）を含めるか */
  includeIsolated: boolean;

  /** フォーカスノードID（設定時はこのノードに関連するノードのみ表示） */
  focusNodeId?: string;

  /** 除外ノードID配列 */
  excludeNodeIds: string[];

  /** 同一ノード間の複数エッジを1本に省略するか */
  consolidateEdges: boolean;
}

// ============================================
// call_graph データ形式
// ============================================

/**
 * call_graph/edges.json の形式
 *
 * エッジ（呼び出し関係）の配列を含む
 */
export interface CallGraphEdgesData {
  /** 生成日時 */
  generated_at: string;

  /** 総エッジ数 */
  total_edges: number;

  /** エッジ配列 */
  edges: CallGraphEdgeData[];
}

/**
 * エッジデータ（呼び出し関係）
 */
export interface CallGraphEdgeData {
  /** 呼び出し元のアイテムID */
  from: string;

  /** 呼び出し先の関数/メソッド名 */
  to: string;

  /** 呼び出しが発生したファイル名 */
  file: string;

  /** 呼び出しが発生した行番号 */
  line: number;

  /** 呼び出しコンテキスト（制御構造情報） */
  context?: CallContext;
}

// ============================================
// グラフ分析用の型定義
// ============================================

/**
 * クラスタデータ
 *
 * グラフのノードをグループ化した情報を表現する
 */
export interface ClusterData {
  /** クラスタ配列 */
  clusters: {
    /** クラスタID */
    id: string;

    /** クラスタ表示名 */
    label: string;

    /** クラスタに含まれるノードID配列 */
    nodes: string[];
  }[];
}

/**
 * グラフ統計情報
 *
 * グラフの全体的なメトリクスを提供する
 */
export interface GraphMetrics {
  /** ノード総数 */
  nodeCount: number;

  /** エッジ総数 */
  edgeCount: number;

  /** 平均次数（各ノードの平均接続数） */
  avgDegree: number;

  /** 最大入次数を持つノード */
  maxInDegree: {
    /** ノードID */
    nodeId: string;
    /** 入次数 */
    count: number;
  };

  /** 最大出次数を持つノード */
  maxOutDegree: {
    /** ノードID */
    nodeId: string;
    /** 出次数 */
    count: number;
  };

  /** 孤立ノード（エッジを持たないノード）のID配列 */
  isolatedNodes: string[];

  /** 循環参照の数 */
  cycleCount: number;
}
