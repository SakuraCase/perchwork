/**
 * schemaGraph.ts
 *
 * スキーマグラフ（型参照関係）用の型定義
 */

import type { FieldInfo, ItemId } from './schema';

/** スキーマノードデータ（ReactFlow用） */
export interface SchemaNodeData {
  /** アイテムID */
  id: ItemId;

  /** 型名（struct/enum名） */
  name: string;

  /** 型の種別 */
  type: 'struct' | 'enum';

  /** フィールド情報 */
  fields: FieldInfo[];

  /** ソースファイルパス */
  filePath: string;

  /** 行番号 */
  line: number;

  /** 被参照数（重要度） */
  inDegree: number;

  /** 参照数 */
  outDegree: number;

  /** 可視性 */
  visibility: 'pub' | 'pub(crate)' | 'pub(super)' | 'private';
}

/** スキーマエッジデータ（ReactFlow用） */
export interface SchemaEdgeData {
  /** エッジID */
  id: string;

  /** 参照元ノードID */
  sourceId: string;

  /** 参照先ノードID */
  targetId: string;

  /** 参照しているフィールド名 */
  fieldName: string;

  /** フィールドの型文字列 */
  fieldType: string;
}

/** スキーマグラフ全体 */
export interface SchemaGraphData {
  /** ノード一覧 */
  nodes: SchemaNodeData[];

  /** エッジ一覧 */
  edges: SchemaEdgeData[];

  /** 統計情報 */
  stats: SchemaGraphStats;
}

/** スキーマグラフ統計 */
export interface SchemaGraphStats {
  /** struct数 */
  totalStructs: number;

  /** enum数 */
  totalEnums: number;

  /** エッジ数（参照関係数） */
  totalEdges: number;

  /** 最大被参照の型 */
  maxInDegree: {
    name: string;
    count: number;
  } | null;
}

/** スキーマフィルタ */
export interface SchemaFilter {
  /** 表示する型の種別 */
  types: ('struct' | 'enum')[];

  /** 表示する可視性 */
  visibility: ('pub' | 'pub(crate)' | 'pub(super)' | 'private')[];

  /** 検索クエリ */
  searchQuery: string;

  /** フォーカス対象のノードID（この型と関連する型のみ表示） */
  focusNodeId?: string;

  /** 除外するノードIDの配列 */
  excludeNodeIds: string[];

  /** フィールドなしstructを非表示（タプル構造体は除く） */
  hideEmptyStructs: boolean;

  /** 孤立ノード（参照も被参照もない）を表示 */
  showIsolatedNodes: boolean;
}

/** デフォルトフィルタ */
export const DEFAULT_SCHEMA_FILTER: SchemaFilter = {
  types: ['struct', 'enum'],
  visibility: ['pub', 'pub(crate)', 'pub(super)', 'private'],
  searchQuery: '',
  focusNodeId: undefined,
  excludeNodeIds: [],
  hideEmptyStructs: true,
  showIsolatedNodes: false,
};

/** スキーマレイアウトタイプ */
export type SchemaLayoutType = 'hierarchy' | 'force' | 'grid';

/** スキーマ設定 */
export interface SchemaSettings {
  /** レイアウトタイプ */
  layoutType: SchemaLayoutType;

  /** フィルタ設定 */
  filter: SchemaFilter;
}

/** 保存済みスキーマ設定 */
export interface SavedSchemaSettings {
  /** 一意なID */
  id: string;

  /** 保存名 */
  name: string;

  /** 設定内容 */
  settings: SchemaSettings;

  /** 作成日時（ISO 8601形式） */
  createdAt: string;

  /** 更新日時（ISO 8601形式） */
  updatedAt: string;
}
