/**
 * ColorRuleDialog - ノード色設定ダイアログ
 *
 * 役割:
 *   - ノード右クリックからノード色設定を行うモーダルダイアログ
 *   - マッチ対象（ID/Path）の選択
 *   - プレフィックス入力（マッチ対象に応じて切り替え）
 *   - カラーピッカー
 */

import { useState, useEffect, useRef } from 'react';
import type { NodeColorRule, ColorRuleMatchType } from '../../types/graph';

// ============================================
// Props定義
// ============================================

export interface ColorRuleDialogProps {
  /** ダイアログの表示状態 */
  isOpen: boolean;

  /** 初期プレフィックス（クリックしたノードID） */
  initialPrefix: string;

  /** 初期ファイルパス（クリックしたノードのファイル） */
  initialFilePath?: string;

  /** ダイアログを閉じる */
  onClose: () => void;

  /** ルール追加時のコールバック */
  onAdd: (rule: NodeColorRule) => void;
}

// ============================================
// 定数定義
// ============================================

/**
 * マッチタイプの選択肢
 */
const MATCH_TYPE_OPTIONS: { value: ColorRuleMatchType; label: string }[] = [
  { value: 'id', label: 'ID' },
  { value: 'file', label: 'Path' },
];

// ============================================
// ユーティリティ
// ============================================

/**
 * 一意なIDを生成
 */
function generateId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================
// メインコンポーネント
// ============================================

export function ColorRuleDialog({
  isOpen,
  initialPrefix,
  initialFilePath = '',
  onClose,
  onAdd,
}: ColorRuleDialogProps) {
  const [matchType, setMatchType] = useState<ColorRuleMatchType>('file');
  const [prefix, setPrefix] = useState(initialFilePath || initialPrefix);
  const [color, setColor] = useState('#ff6b6b');
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // ダイアログが開いたら初期値をセットしてフォーカス
  useEffect(() => {
    if (isOpen) {
      // ダイアログ開閉時の状態リセットは意図的
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMatchType('file');
      setPrefix(initialFilePath || initialPrefix);
      setColor('#ff6b6b');
      // 少し遅延させてフォーカス
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [isOpen, initialPrefix, initialFilePath]);

  /**
   * マッチタイプ変更時にプレフィックスを切り替え
   */
  const handleMatchTypeChange = (newMatchType: ColorRuleMatchType) => {
    setMatchType(newMatchType);
    if (newMatchType === 'file') {
      setPrefix(initialFilePath);
    } else {
      setPrefix(initialPrefix);
    }
  };

  // Escキーでダイアログを閉じる
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // ダイアログ外クリックで閉じる
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // 少し遅延させて登録
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // ============================================
  // イベントハンドラ
  // ============================================

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prefix.trim()) return;

    const rule: NodeColorRule = {
      id: generateId(),
      prefix: prefix.trim(),
      color,
      enabled: true,
      matchType,
    };

    onAdd(rule);
    onClose();
  };

  // ============================================
  // レンダリング
  // ============================================

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={dialogRef}
        className="bg-stone-800 border border-stone-600 rounded-lg shadow-lg w-[320px]"
      >
        {/* ヘッダー */}
        <div className="px-4 py-3 border-b border-stone-700">
          <h2 className="text-sm font-semibold text-stone-100">
            ノード色設定
          </h2>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
          {/* マッチ対象選択 */}
          <div>
            <label
              htmlFor="match-type-select"
              className="block text-xs text-stone-400 mb-1"
            >
              マッチ対象
            </label>
            <select
              id="match-type-select"
              value={matchType}
              onChange={(e) => handleMatchTypeChange(e.target.value as ColorRuleMatchType)}
              className="w-full bg-stone-700 text-stone-100 border border-stone-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {MATCH_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* プレフィックス入力 */}
          <div>
            <label
              htmlFor="prefix-input"
              className="block text-xs text-stone-400 mb-1"
            >
              プレフィックス
            </label>
            <input
              ref={inputRef}
              id="prefix-input"
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              className="w-full bg-stone-700 text-stone-100 border border-stone-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder={matchType === 'file' ? 'entity/' : 'IDプレフィックス'}
            />
          </div>

          {/* カラーピッカー */}
          <div>
            <label
              htmlFor="color-input"
              className="block text-xs text-stone-400 mb-1"
            >
              色
            </label>
            <div className="flex items-center gap-2">
              <input
                id="color-input"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded border border-stone-600 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 bg-stone-700 text-stone-100 border border-stone-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="#ff6b6b"
              />
            </div>
          </div>

          {/* ボタン */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-stone-300 bg-stone-700 border border-stone-600 rounded hover:bg-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!prefix.trim()}
              className="px-4 py-2 text-sm text-white bg-orange-600 border border-orange-500 rounded hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              追加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
