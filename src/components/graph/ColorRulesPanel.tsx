/**
 * ColorRulesPanel - ノード色ルールの一覧と編集UI
 *
 * 役割:
 *   - ノード色ルールの一覧表示
 *   - ルールの追加・編集・削除
 *   - プレフィックス入力とカラーピッカー
 */

import { useCallback, useState, useEffect } from 'react';
import type { NodeColorRule, ColorRuleMatchType } from '../../types/graph';

// ============================================
// カラーピッカーセル（遅延反映）
// ============================================

interface ColorPickerCellProps {
  color: string;
  onChange: (color: string) => void;
}

/**
 * カラーピッカーセル
 * ローカルステートで色を管理し、フォーカスが外れたときに親へ通知
 */
function ColorPickerCell({ color, onChange }: ColorPickerCellProps) {
  const [localColor, setLocalColor] = useState(color);

  // 親から色が変更された場合にローカルステートを同期
  useEffect(() => {
    setLocalColor(color);
  }, [color]);

  const handleBlur = () => {
    if (localColor !== color) {
      onChange(localColor);
    }
  };

  return (
    <input
      type="color"
      value={localColor}
      onChange={(e) => setLocalColor(e.target.value)}
      onBlur={handleBlur}
      className="w-8 h-8 rounded border border-gray-600 cursor-pointer bg-transparent"
      aria-label="ノード色"
    />
  );
}

// ============================================
// Props定義
// ============================================

export interface ColorRulesPanelProps {
  /** 現在の色ルール配列 */
  rules: NodeColorRule[];

  /** ルール変更時のコールバック */
  onRulesChange: (rules: NodeColorRule[]) => void;
}

// ============================================
// ユーティリティ
// ============================================

/**
 * 一意なIDを生成
 */
function generateId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * デフォルトの新規ルール
 */
function createDefaultRule(): NodeColorRule {
  return {
    id: generateId(),
    prefix: '',
    color: '#ff6b6b',
    enabled: true,
    matchType: 'file',
  };
}

/**
 * マッチタイプの選択肢
 */
const MATCH_TYPE_OPTIONS: { value: ColorRuleMatchType; label: string }[] = [
  { value: 'id', label: 'ID' },
  { value: 'file', label: 'Path' },
];

// ============================================
// メインコンポーネント
// ============================================

export function ColorRulesPanel({ rules, onRulesChange }: ColorRulesPanelProps) {
  // ============================================
  // イベントハンドラ
  // ============================================

  /**
   * ルールを追加
   */
  const handleAddRule = useCallback(() => {
    onRulesChange([...rules, createDefaultRule()]);
  }, [rules, onRulesChange]);

  /**
   * ルールを更新
   */
  const handleUpdateRule = useCallback(
    (id: string, updates: Partial<NodeColorRule>) => {
      onRulesChange(
        rules.map((rule) =>
          rule.id === id ? { ...rule, ...updates } : rule
        )
      );
    },
    [rules, onRulesChange]
  );

  /**
   * ルールを削除
   */
  const handleDeleteRule = useCallback(
    (id: string) => {
      onRulesChange(rules.filter((rule) => rule.id !== id));
    },
    [rules, onRulesChange]
  );

  /**
   * ルールを上に移動
   */
  const handleMoveUp = useCallback(
    (index: number) => {
      if (index === 0) return;
      const newRules = [...rules];
      [newRules[index - 1], newRules[index]] = [newRules[index], newRules[index - 1]];
      onRulesChange(newRules);
    },
    [rules, onRulesChange]
  );

  /**
   * ルールを下に移動
   */
  const handleMoveDown = useCallback(
    (index: number) => {
      if (index === rules.length - 1) return;
      const newRules = [...rules];
      [newRules[index], newRules[index + 1]] = [newRules[index + 1], newRules[index]];
      onRulesChange(newRules);
    },
    [rules, onRulesChange]
  );

  // ============================================
  // レンダリング
  // ============================================

  return (
    <div className="space-y-2">
      {/* ルール一覧 */}
      {rules.map((rule, index) => (
        <div
          key={rule.id}
          className="flex items-center gap-2 bg-gray-700 rounded px-2 py-1.5"
        >
          {/* 順番変更ボタン */}
          <div className="flex flex-col gap-0.5">
            <button
              onClick={() => handleMoveUp(index)}
              disabled={index === 0}
              className="text-xs text-gray-400 hover:text-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed focus:outline-none"
              aria-label="上に移動"
              title="上に移動（優先度を上げる）"
            >
              ▲
            </button>
            <button
              onClick={() => handleMoveDown(index)}
              disabled={index === rules.length - 1}
              className="text-xs text-gray-400 hover:text-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed focus:outline-none"
              aria-label="下に移動"
              title="下に移動（優先度を下げる）"
            >
              ▼
            </button>
          </div>

          {/* 有効/無効チェックボックス */}
          <input
            type="checkbox"
            checked={rule.enabled}
            onChange={(e) =>
              handleUpdateRule(rule.id, { enabled: e.target.checked })
            }
            className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-2 focus:ring-blue-500"
            aria-label="ルールの有効/無効"
          />

          {/* マッチタイプ選択 */}
          <select
            value={rule.matchType}
            onChange={(e) =>
              handleUpdateRule(rule.id, {
                matchType: e.target.value as ColorRuleMatchType,
              })
            }
            className="w-16 bg-gray-800 text-gray-100 border border-gray-600 rounded px-1 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="マッチ対象"
          >
            {MATCH_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* プレフィックス入力 */}
          <input
            type="text"
            value={rule.prefix}
            onChange={(e) =>
              handleUpdateRule(rule.id, { prefix: e.target.value })
            }
            placeholder="プレフィックス"
            className="flex-1 min-w-0 bg-gray-800 text-gray-100 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="IDプレフィックス"
          />

          {/* カラーピッカー */}
          <ColorPickerCell
            color={rule.color}
            onChange={(newColor) =>
              handleUpdateRule(rule.id, { color: newColor })
            }
          />

          {/* 削除ボタン */}
          <button
            onClick={() => handleDeleteRule(rule.id)}
            className="text-gray-400 hover:text-red-400 focus:outline-none px-1"
            aria-label="ルールを削除"
            title="削除"
          >
            ✕
          </button>
        </div>
      ))}

      {/* ルール追加ボタン */}
      <button
        onClick={handleAddRule}
        className="w-full px-3 py-1.5 text-sm bg-gray-700 text-gray-300 border border-gray-600 border-dashed rounded hover:bg-gray-600 hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        + ルールを追加
      </button>
    </div>
  );
}
