/**
 * シーケンス図関連の型定義
 */

import type { ItemId } from './schema';

/**
 * 呼び出しコンテキスト（制御構造情報）
 */
export interface CallContext {
  type: 'normal' | 'if' | 'else' | 'match_arm' | 'loop' | 'while' | 'for';
  condition?: string;
  arm_pattern?: string;
}

/**
 * 関数ごとの深さ設定
 */
export interface FunctionDepthSetting {
  /** 関数ID */
  functionId: ItemId;
  /** 表示名 */
  displayName: string;
  /** 現在の深さ設定 */
  depth: number;
  /** 実際に展開可能な最大深さ（子がなければ0） */
  maxExpandableDepth: number;
}

/**
 * シーケンス図の状態
 */
export interface SequenceDiagramState {
  /** 起点関数ID */
  rootFunctionId: ItemId | null;
  /** デフォルト深さ */
  defaultDepth: number;
  /** 関数ごとの深さ設定（rootから展開された関数のみ） */
  functionDepths: FunctionDepthSetting[];
  /** 生成されたMermaidコード */
  mermaidCode: string | null;
}

/**
 * 参加者情報（Mermaid生成用）
 */
export interface ParticipantInfo {
  id: ItemId;
  displayName: string;
  order: number;
}

/**
 * 呼び出し情報（Mermaid生成用）
 */
export interface CallInfo {
  from: ItemId;
  to: ItemId;
  file: string;
  line: number;
  context?: CallContext;
}

/**
 * シーケンス図データ
 */
export interface SequenceDiagramData {
  /** Mermaid記法のシーケンス図 */
  mermaidCode: string;
  /** 含まれる参加者（関数）一覧 */
  participants: ParticipantInfo[];
  /** 呼び出し関係一覧 */
  calls: CallInfo[];
}
