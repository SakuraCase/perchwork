/**
 * プロファイル管理に関する型定義
 *
 * 複数の設定プロファイルを管理するためのデータ構造
 */

import type { LayoutOptions, GraphFilter, NodeColorRule } from './graph';
import type { SequenceEditState, SavedSequenceDiagram } from './sequence';
import type { ItemId } from './schema';

// ============================================
// アプリケーション設定
// ============================================

/**
 * アプリケーション設定の全体構造
 *
 * 将来の設定項目追加に対応するため拡張可能な構造
 */
export interface AppSettings {
  /** グラフレイアウト設定 */
  layout: LayoutOptions;

  /** グラフフィルタ設定 */
  filter: GraphFilter;

  /** ノード色ルール */
  colorRules: NodeColorRule[];

  /** シーケンス図編集状態（rootFunctionId -> EditState）- 自動保存用 */
  sequenceEdits?: Record<ItemId, SequenceEditState>;

  /** 保存済みシーケンス図一覧 - 名前付き保存 */
  savedSequences?: SavedSequenceDiagram[];
}

// ============================================
// プロファイル
// ============================================

/**
 * 設定プロファイル
 *
 * 名前付きの設定セット。複数のプロファイルを切り替えて使用可能
 */
export interface Profile {
  /** プロファイルID（一意な識別子） */
  id: string;

  /** プロファイル名（ユーザー定義） */
  name: string;

  /** 作成日時（ISO 8601形式） */
  createdAt: string;

  /** 最終更新日時（ISO 8601形式） */
  updatedAt: string;

  /** アプリケーション設定 */
  settings: AppSettings;
}

// ============================================
// ストレージ
// ============================================

/**
 * プロファイルストレージ全体の構造
 *
 * localStorage に保存されるルートオブジェクト
 */
export interface ProfileStorage {
  /** ストレージバージョン（マイグレーション用） */
  storageVersion: number;

  /** 現在選択中のプロファイルID */
  activeProfileId: string;

  /** プロファイル一覧 */
  profiles: Profile[];
}

// ============================================
// 定数
// ============================================

/**
 * 現在のストレージバージョン
 */
export const CURRENT_STORAGE_VERSION = 1;

/**
 * localStorage のキー
 */
export const STORAGE_KEY_PROFILES = 'perchwork-profiles';
