import type { ExtractedItem, TestInfo } from './items.js';
import type { CallEdge, UnresolvedEdge } from './edges.js';

/**
 * スコープ内の型情報
 */
export interface TypeScope {
  variables: Map<string, string>;
  selfType?: string;
}

/**
 * ファイル単位の解析結果
 */
export interface FileAnalysis {
  path: string;
  items: ExtractedItem[];
  tests: TestInfo[];
  edges: CallEdge[];
  unresolvedEdges: UnresolvedEdge[];
}
