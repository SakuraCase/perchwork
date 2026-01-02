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
 * 呼び出しイベントタイプ
 */
export type CallEventType = 'start' | 'end';

/**
 * 呼び出しイベント（開始/終了）
 * アクティベーションの入れ子を正しく表現するために使用
 */
export interface CallEvent {
  type: CallEventType;
  call: CallInfo;
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

// ============================================
// シーケンス図編集機能
// ============================================

/**
 * 呼び出しエントリの一意識別子
 * フォーマット: "fromId->toId@line"
 */
export type CallEntryId = string;

/**
 * CallInfoからCallEntryIdを生成
 */
export function generateCallEntryId(call: CallInfo): CallEntryId {
  return `${call.from}->${call.to}@${call.line}`;
}

/**
 * グループ設定
 * 連続した呼び出しをまとめて折りたたみ可能にする
 */
export interface SequenceGroup {
  /** グループID */
  id: string;
  /** グループ名（表示用） */
  name: string;
  /** グループに含まれる呼び出しID */
  callEntryIds: CallEntryId[];
  /** 折りたたみ状態 */
  isCollapsed: boolean;
}

/**
 * 省略設定
 * 選択した呼び出しを「...」などで置換
 */
export interface SequenceOmission {
  /** 省略ID */
  id: string;
  /** 省略する呼び出しID */
  callEntryIds: CallEntryId[];
  /** プレースホルダーテキスト */
  placeholder: string;
}

/**
 * ラベル編集
 * 呼び出し矢印のラベルをカスタマイズ
 */
export interface SequenceLabelEdit {
  /** 対象の呼び出しID */
  callEntryId: CallEntryId;
  /** カスタムラベル */
  customLabel: string;
}

/**
 * Note設定
 * mermaidのNote機能で補足説明を追加
 */
export interface SequenceNote {
  /** NoteID */
  id: string;
  /** 挿入位置（指定した呼び出しの前か後） */
  position: 'before' | 'after';
  /** 基準となる呼び出しID */
  callEntryId: CallEntryId;
  /** Noteの配置 */
  placement: 'left of' | 'right of' | 'over';
  /** 対象参加者（overの場合は複数可） */
  participants: string[];
  /** Noteのテキスト */
  text: string;
}

/**
 * シーケンス図の編集状態
 * プロファイルに保存される
 */
export interface SequenceEditState {
  /** グループ設定 */
  groups: SequenceGroup[];
  /** 省略設定 */
  omissions: SequenceOmission[];
  /** ラベル編集 */
  labelEdits: SequenceLabelEdit[];
  /** Note設定 */
  notes: SequenceNote[];
}

/**
 * 空の編集状態を作成
 */
export function createEmptyEditState(): SequenceEditState {
  return {
    groups: [],
    omissions: [],
    labelEdits: [],
    notes: [],
  };
}

// ============================================
// 保存済みシーケンス図
// ============================================

/**
 * 保存済みシーケンス図
 * 名前付きで複数保存可能
 */
export interface SavedSequenceDiagram {
  /** 一意ID */
  id: string;
  /** ユーザー定義の名前 */
  name: string;
  /** 起点関数ID */
  rootFunctionId: ItemId;
  /** 編集状態 */
  editState: SequenceEditState;
  /** 作成日時（ISO 8601形式） */
  createdAt: string;
  /** 更新日時（ISO 8601形式） */
  updatedAt: string;
}
