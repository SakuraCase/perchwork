/**
 * 影響分析を行うカスタムフック
 */

import { useState, useCallback, useEffect } from 'react';
import type { ItemId, CodeItem } from '../types/schema';
import type { Caller, ImpactAnalysisResult, TestInfo, CallersIndex } from '../types/callers';

/**
 * ItemId からファイルパスを抽出する
 *
 * @param id ItemId (例: "path/to/file.rs::FunctionName::fn")
 * @returns ファイルパス (例: "path/to/file.rs")
 */
function extractFileFromId(id: ItemId): string {
  const parts = id.split('::');
  if (parts.length >= 1) {
    return parts[0];
  }
  return '';
}

/**
 * フックのオプション
 */
interface UseImpactAnalysisOptions {
  /** 最大深度（デフォルト: 10） */
  maxDepth?: number;
  /** テスト情報を含めるかどうか（デフォルト: true） */
  includeTests?: boolean;
}

/**
 * フックの戻り値
 */
interface UseImpactAnalysisResult {
  /** 分析結果 */
  result: ImpactAnalysisResult | null;

  /** 分析中かどうか */
  isAnalyzing: boolean;

  /** エラーメッセージ */
  error: string | null;

  /** 分析を実行する */
  analyze: (targetId: ItemId) => void;

  /** 結果をクリアする */
  clear: () => void;
}

/**
 * 影響分析を行うカスタムフック
 *
 * @param targetId 対象アイテムID（変更されると自動的に分析を実行）
 * @param callersIndex Callers インデックス
 * @param codeItems コードアイテムのマップ（テスト情報取得用）
 * @param options オプション設定
 * @returns 分析結果と操作関数
 */
export function useImpactAnalysis(
  targetId: ItemId | null,
  callersIndex: CallersIndex | null,
  codeItems: Map<ItemId, CodeItem> | null,
  options: UseImpactAnalysisOptions = {}
): UseImpactAnalysisResult {
  const { maxDepth = 10, includeTests = true } = options;

  const [result, setResult] = useState<ImpactAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback((analysisTargetId: ItemId) => {
    if (!callersIndex) {
      setError('Callers index is not available');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // 対象の名前を取得
      const targetItem = codeItems?.get(analysisTargetId);
      const targetName = targetItem?.name || analysisTargetId;

      // 直接・間接影響の計算（BFS）
      const visited = new Set<ItemId>();
      const directImpact: Caller[] = [];
      const indirectImpact = new Map<number, Caller[]>();
      let hasCycle = false;
      const cycleNodes: ItemId[] = [];

      // キュー: [ItemId, 深さ]
      const queue: Array<[ItemId, number]> = [[analysisTargetId, 0]];
      visited.add(analysisTargetId);

      while (queue.length > 0) {
        const [currentId, depth] = queue.shift()!;

        if (depth >= maxDepth) continue;

        const callers = callersIndex.calledBy.get(currentId) || [];

        for (const caller of callers) {
          if (visited.has(caller.id)) {
            // 循環検出
            hasCycle = true;
            if (!cycleNodes.includes(caller.id)) {
              cycleNodes.push(caller.id);
            }
            continue;
          }

          visited.add(caller.id);

          if (depth === 0) {
            directImpact.push(caller);
          } else {
            const levelCallers = indirectImpact.get(depth) || [];
            levelCallers.push(caller);
            indirectImpact.set(depth, levelCallers);
          }

          queue.push([caller.id, depth + 1]);
        }
      }

      // 影響を受けるテストの特定
      let directTests: TestInfo[] = [];
      const indirectTests: TestInfo[] = [];

      if (includeTests && codeItems) {
        // 対象自身のテスト
        if (targetItem?.tested_by) {
          directTests = targetItem.tested_by.map(testId => {
            const testItem = codeItems.get(testId);
            return {
              id: testId,
              name: testItem?.name || testId,
              file: extractFileFromId(testId),
              line: testItem?.line_start || 0,
              sourceItem: analysisTargetId,
              isDirect: true,
            };
          });
        }

        // 間接影響を受けるテスト
        const indirectItemIds = [
          ...directImpact.map(c => c.id),
          ...Array.from(indirectImpact.values()).flat().map(c => c.id),
        ];

        const seenTests = new Set(directTests.map(t => t.id));

        for (const itemId of indirectItemIds) {
          const item = codeItems.get(itemId);
          if (item?.tested_by) {
            for (const testId of item.tested_by) {
              if (!seenTests.has(testId)) {
                seenTests.add(testId);
                const testItem = codeItems.get(testId);
                indirectTests.push({
                  id: testId,
                  name: testItem?.name || testId,
                  file: extractFileFromId(testId),
                  line: testItem?.line_start || 0,
                  sourceItem: itemId,
                  isDirect: false,
                });
              }
            }
          }
        }
      }

      // 結果の構築
      const analysisResult: ImpactAnalysisResult = {
        targetId: analysisTargetId,
        targetName,
        directImpact,
        indirectImpact,
        directTests,
        indirectTests,
        totalAffected: directImpact.length + Array.from(indirectImpact.values()).reduce((sum, arr) => sum + arr.length, 0),
        maxDepth: Math.max(0, ...Array.from(indirectImpact.keys())),
        hasCycle,
        cycleNodes: hasCycle ? cycleNodes : undefined,
      };

      setResult(analysisResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsAnalyzing(false);
    }
  }, [callersIndex, codeItems, maxDepth, includeTests]);

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  // targetId が変更されたら自動的に分析を実行
  useEffect(() => {
    if (targetId && callersIndex) {
      analyze(targetId);
    } else {
      clear();
    }
  }, [targetId, callersIndex, analyze, clear]);

  return {
    result,
    isAnalyzing,
    error,
    analyze,
    clear,
  };
}
