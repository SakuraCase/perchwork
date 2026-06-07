/**
 * 呼び出しコンテキスト（制御構造情報）
 */
export interface CallContext {
  type: 'normal' | 'if' | 'else' | 'match_arm' | 'loop' | 'while' | 'for';
  condition?: string;
  arm_pattern?: string;
}

/**
 * コールグラフのエッジ
 */
export interface CallEdge {
  from: string;
  to: string;
  file: string;
  line: number;
  context?: CallContext;
}

/**
 * 未解決エッジ（型解決に失敗した呼び出し）
 */
export interface UnresolvedEdge {
  from: string;
  file: string;
  line: number;
  receiver_type: string;
  receiver_text: string;
  method: string;
  reason: string;
}
