/**
 * バッジスタイル定義
 *
 * 統一されたバッジカラーマッピングを提供する。
 */

/** バッジのバリアント */
export type BadgeVariant =
  // アイテムタイプ
  | 'fn'
  | 'struct'
  | 'enum'
  | 'trait'
  | 'impl'
  | 'method'
  // 可視性
  | 'pub'
  | 'pub-crate'
  | 'pub-super'
  | 'private'
  // タグ
  | 'async'
  | 'count';

/** バッジの基本スタイル */
export const BADGE_BASE = 'px-2 py-0.5 text-xs font-medium rounded';

/** バッジの基本スタイル（ボーダー付き） */
export const BADGE_BASE_WITH_BORDER = `${BADGE_BASE} border`;

/** バリアントごとのカラースタイル */
const BADGE_COLORS: Record<BadgeVariant, string> = {
  // アイテムタイプ
  fn: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
  struct: 'bg-cyan-600/20 text-cyan-400 border-cyan-600/30',
  enum: 'bg-orange-600/20 text-orange-400 border-orange-600/30',
  trait: 'bg-pink-600/20 text-pink-400 border-pink-600/30',
  impl: 'bg-indigo-600/20 text-indigo-400 border-indigo-600/30',
  method: 'bg-lime-600/20 text-lime-400 border-lime-600/30',
  // 可視性
  pub: 'bg-green-600/20 text-green-400 border-green-600/30',
  'pub-crate': 'bg-blue-600/20 text-blue-400 border-blue-600/30',
  'pub-super': 'bg-purple-600/20 text-purple-400 border-purple-600/30',
  private: 'bg-gray-600/20 text-gray-400 border-gray-600/30',
  // タグ
  async: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
  count: 'bg-gray-600/20 text-gray-400 border-gray-600/30',
};

/**
 * バリアントに対応するカラースタイルを取得
 */
export function getBadgeColorClass(variant: BadgeVariant): string {
  return BADGE_COLORS[variant] ?? BADGE_COLORS.private;
}

/**
 * 完全なバッジスタイルを取得（基本スタイル + カラー）
 */
export function getBadgeClass(variant: BadgeVariant, withBorder = true): string {
  const base = withBorder ? BADGE_BASE_WITH_BORDER : BADGE_BASE;
  return `${base} ${getBadgeColorClass(variant)}`;
}

/**
 * 可視性文字列をバリアントに変換
 */
export function visibilityToVariant(visibility?: string): BadgeVariant {
  switch (visibility) {
    case 'pub':
      return 'pub';
    case 'pub(crate)':
      return 'pub-crate';
    case 'pub(super)':
      return 'pub-super';
    default:
      return 'private';
  }
}

/**
 * アイテムタイプをバリアントに変換
 */
export function typeToVariant(type: string): BadgeVariant {
  switch (type) {
    case 'fn':
      return 'fn';
    case 'struct':
      return 'struct';
    case 'enum':
      return 'enum';
    case 'trait':
      return 'trait';
    case 'impl':
      return 'impl';
    case 'method':
      return 'method';
    default:
      return 'fn';
  }
}

// ============================================
// ノード表示用スタイル（Cytoscape, コンテキストメニュー用）
// ============================================

/** アイテムタイプの日本語表示名 */
const TYPE_LABELS: Record<string, string> = {
  struct: '構造体',
  fn: '関数',
  trait: 'トレイト',
  enum: '列挙型',
  type: '型エイリアス',
  impl: '実装',
  mod: 'モジュール',
  const: '定数',
  method: 'メソッド',
};

/**
 * アイテムタイプの日本語表示名を取得
 */
export function getTypeLabel(type: string): string {
  return TYPE_LABELS[type] || type;
}

/** コンテキストメニュー用のタイプ別カラークラス */
const TYPE_COLOR_CLASSES: Record<string, string> = {
  struct: 'bg-green-600 text-white',
  fn: 'bg-indigo-600 text-white',
  trait: 'bg-red-600 text-white',
  enum: 'bg-amber-600 text-white',
  type: 'bg-purple-600 text-white',
  impl: 'bg-blue-600 text-white',
  mod: 'bg-gray-600 text-white',
  const: 'bg-teal-600 text-white',
  method: 'bg-cyan-600 text-white',
};

/**
 * アイテムタイプに応じた色クラスを取得（コンテキストメニュー用）
 */
export function getTypeColorClass(type: string): string {
  return TYPE_COLOR_CLASSES[type] || 'bg-gray-600 text-white';
}

/** Cytoscape ノード用の色（HEX） */
const CYTOSCAPE_NODE_COLORS: Record<string, string> = {
  struct: '#059669', // green-600
  fn: '#4f46e5', // indigo-600
  trait: '#dc2626', // red-600
  enum: '#f59e0b', // amber-500
  type: '#8b5cf6', // purple-500
  impl: '#2563eb', // blue-600
  mod: '#4b5563', // gray-600
  const: '#0d9488', // teal-600
  method: '#0891b2', // cyan-600
};

/**
 * Cytoscape ノード用の背景色を取得
 */
export function getCytoscapeNodeColor(type: string): string {
  return CYTOSCAPE_NODE_COLORS[type] || CYTOSCAPE_NODE_COLORS.fn;
}
