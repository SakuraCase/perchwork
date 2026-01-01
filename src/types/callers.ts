/**
 * Callers に関する型定義
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

// 逆引きインデックス
export interface CallersIndex {
  calledBy: Map<ItemId, Caller[]>;
  builtAt: string;
  nodeCount: number;
  edgeCount: number;
}
