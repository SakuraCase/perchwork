/**
 * Callers & 影響分析に関する型定義
 */

import type { ItemId } from './schema';

// Caller情報
export interface Caller {
  id: ItemId;
  name: string;
  file: string;
  line: number;
  callSite: {
    file: string;
    line: number;
  };
}

// Callersツリーノード
export interface CallersTreeNode {
  caller: Caller;
  depth: number;
  children: CallersTreeNode[];
  isExpanded: boolean;
}

// 影響分析結果
export interface ImpactAnalysisResult {
  targetId: ItemId;
  targetName: string;

  // 影響レベル別
  directImpact: Caller[];           // 直接 Callers
  indirectImpact: Map<number, Caller[]>; // 深さ → Callers

  // 影響テスト
  directTests: TestInfo[];          // 対象自身のテスト
  indirectTests: TestInfo[];        // Callers のテスト

  // メタ情報
  totalAffected: number;
  maxDepth: number;
  hasCycle: boolean;
  cycleNodes?: ItemId[];
}

// テスト情報
export interface TestInfo {
  id: ItemId;
  name: string;
  file: string;
  line: number;
  sourceItem: ItemId;  // このテストが紐づくアイテム
  isDirect: boolean;   // 対象自身のテストか
}

// 逆引きインデックス
export interface CallersIndex {
  calledBy: Map<ItemId, Caller[]>;
  builtAt: string;
  nodeCount: number;
  edgeCount: number;
}
