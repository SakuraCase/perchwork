/**
 * SchemaNode.tsx
 *
 * スキーマグラフのカスタムノード（カード形式）
 */

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { SchemaNodeData } from '../../types/schemaGraph';

/** カスタムノードのデータ型 */
export interface SchemaNodeDataExtended extends SchemaNodeData {
  /** 参照先の型名セット（矢印表示用） */
  referencedTypes?: Set<string>;
  /** 最大inDegree（サイズ計算用） */
  maxInDegree?: number;
}

/** ノードのプロパティ */
export interface SchemaNodeProps {
  data: SchemaNodeDataExtended;
  selected?: boolean;
}

/**
 * inDegreeに基づいてスケールを計算
 */
function getScale(inDegree: number, maxInDegree: number): number {
  if (maxInDegree === 0) return 1;
  const ratio = inDegree / maxInDegree;
  // 1.0 ~ 1.3 の範囲でスケール
  return 1 + ratio * 0.3;
}

/**
 * inDegreeに基づいてボーダー色を取得
 */
function getBorderColor(inDegree: number): string {
  if (inDegree >= 6) return 'border-orange-400';
  if (inDegree >= 3) return 'border-orange-500';
  return 'border-stone-600';
}

/**
 * 重要度インジケータのドット
 */
function ImportanceIndicator({ inDegree }: { inDegree: number }) {
  const maxDots = 5;
  const filledDots = Math.min(inDegree, maxDots);

  return (
    <div className="flex gap-0.5 mt-1 justify-center">
      {Array.from({ length: maxDots }).map((_, i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${
            i < filledDots ? 'bg-orange-500' : 'bg-stone-700'
          }`}
        />
      ))}
      {inDegree > maxDots && (
        <span className="text-[10px] text-orange-400 ml-0.5">+{inDegree - maxDots}</span>
      )}
    </div>
  );
}

/**
 * スキーマノードコンポーネント
 */
export const SchemaNode = memo(({ data, selected }: SchemaNodeProps) => {
  const {
    name,
    type,
    fields,
    inDegree,
    visibility,
    referencedTypes = new Set(),
    maxInDegree = 10,
  } = data;

  const scale = getScale(inDegree, maxInDegree);
  const borderColor = getBorderColor(inDegree);

  // 型アイコン
  const typeIcon = type === 'struct' ? '◇' : '◆';
  const typeColor = type === 'struct' ? 'text-teal-400' : 'text-amber-400';

  // 可視性バッジ
  const visibilityLabel =
    visibility === 'pub'
      ? 'pub'
      : visibility === 'pub(crate)'
      ? 'crate'
      : visibility === 'pub(super)'
      ? 'super'
      : '';

  return (
    <div
      className={`
        bg-stone-800 rounded-xl border-2 ${borderColor}
        shadow-lg transition-all duration-200
        ${selected ? 'ring-2 ring-orange-500' : ''}
      `}
      style={{
        transform: `scale(${scale})`,
        minWidth: '180px',
        maxWidth: '280px',
      }}
    >
      {/* 入力ハンドル（参照される側） */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-orange-500 !border-0"
      />

      {/* ヘッダー */}
      <div className="px-3 py-2 border-b border-stone-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-sm ${typeColor}`}>{typeIcon}</span>
          <span className="font-semibold text-stone-100 text-sm">{name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {visibilityLabel && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-700 text-stone-400">
              {visibilityLabel}
            </span>
          )}
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
            type === 'struct' ? 'bg-teal-900/50 text-teal-400' : 'bg-amber-900/50 text-amber-400'
          }`}>
            {type}
          </span>
        </div>
      </div>

      {/* フィールドリスト */}
      {fields.length > 0 && (
        <div className="px-3 py-2 space-y-1">
          {fields.map((field) => {
            const hasRef = referencedTypes.has(field.name);
            return (
              <div
                key={field.name}
                className="flex items-center justify-between text-xs gap-2 relative"
              >
                <span className="text-cyan-400 font-mono truncate">{field.name}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-stone-400 font-mono truncate max-w-[100px]">
                    {field.type}
                  </span>
                  {/* フィールドごとの出力ハンドル */}
                  {hasRef && (
                    <Handle
                      type="source"
                      position={Position.Right}
                      id={`field-${field.name}`}
                      className="!w-1.5 !h-1.5 !bg-teal-500 !border-0 !right-[-12px]"
                      style={{ top: '50%', transform: 'translateY(-50%)' }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* フィールドがない場合 */}
      {fields.length === 0 && (
        <div className="px-3 py-2 text-xs text-stone-500 text-center">
          フィールドなし
        </div>
      )}

      {/* 重要度インジケータ */}
      <div className="px-3 py-1.5 border-t border-stone-700">
        <ImportanceIndicator inDegree={inDegree} />
      </div>
    </div>
  );
});

SchemaNode.displayName = 'SchemaNode';
