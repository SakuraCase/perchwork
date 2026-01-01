/**
 * シーケンス図の生成と深さ管理を行うフック
 */

import { useState, useCallback, useMemo } from 'react';
import type { ItemId } from '../types/schema';
import type { CytoscapeData } from '../types/graph';
import type { SequenceDiagramState, FunctionDepthSetting } from '../types/sequence';
import {
  generateSequenceDiagram,
  buildFunctionDepthSettings,
  type DepthConfig,
} from '../services/mermaidGenerator';
import type { SummaryMap } from '../services/semanticLoader';

/**
 * useSequenceDiagram の戻り値型
 */
export interface UseSequenceDiagramResult {
  /** 現在の状態 */
  state: SequenceDiagramState;
  /** 起点関数を設定 */
  setRootFunction: (functionId: ItemId) => void;
  /** 特定関数の深さを設定 */
  setFunctionDepth: (functionId: ItemId, depth: number) => void;
  /** 再生成 */
  regenerate: () => void;
  /** リセット */
  reset: () => void;
  /** Mermaidコード */
  mermaidCode: string | null;
  /** 展開された関数リスト（深さ調整UI用、ルート関数は除外） */
  expandedFunctions: FunctionDepthSetting[];
}

/**
 * 初期状態
 */
const initialState: SequenceDiagramState = {
  rootFunctionId: null,
  defaultDepth: 0,
  functionDepths: [],
  mermaidCode: null,
};

/**
 * シーケンス図の生成と管理を行うカスタムフック
 *
 * @param graphData - グラフデータ
 * @param summaries - ItemId → summary のマップ（オプション）
 * @returns シーケンス図操作API
 */
export function useSequenceDiagram(
  graphData: CytoscapeData | null,
  summaries?: SummaryMap
): UseSequenceDiagramResult {
  const [state, setState] = useState<SequenceDiagramState>(initialState);

  /**
   * 内部で使用するDepthConfigを構築
   */
  const _depthConfig = useMemo((): DepthConfig => {
    const functionDepths = new Map<ItemId, number>();
    for (const setting of state.functionDepths) {
      functionDepths.set(setting.functionId, setting.depth);
    }
    return {
      defaultDepth: state.defaultDepth,
      functionDepths,
    };
  }, [state.defaultDepth, state.functionDepths]);
  // Note: _depthConfig is prepared for future use (e.g., external access)
  void _depthConfig;

  /**
   * Mermaid図を再生成する内部関数
   */
  const regenerateInternal = useCallback(
    (
      rootId: ItemId,
      defaultDepth: number,
      functionDepths: FunctionDepthSetting[]
    ): string | null => {
      if (!graphData) return null;

      const depthMap = new Map<ItemId, number>();
      for (const setting of functionDepths) {
        depthMap.set(setting.functionId, setting.depth);
      }

      const result = generateSequenceDiagram(graphData, {
        startFunctionId: rootId,
        depthConfig: {
          defaultDepth,
          functionDepths: depthMap,
        },
        summaries,
      });

      return result.mermaidCode;
    },
    [graphData, summaries]
  );

  /**
   * 起点関数を設定
   */
  const setRootFunction = useCallback(
    (functionId: ItemId) => {
      if (!graphData) return;

      // 関数深さ設定を構築（ルート関数は除外済み、初期深さは0）
      const functionDepths = buildFunctionDepthSettings(graphData, functionId);

      // Mermaid図を生成
      const mermaidCode = regenerateInternal(
        functionId,
        state.defaultDepth,
        functionDepths
      );

      setState({
        rootFunctionId: functionId,
        defaultDepth: state.defaultDepth,
        functionDepths,
        mermaidCode,
      });
    },
    [graphData, state.defaultDepth, regenerateInternal]
  );

  /**
   * 特定関数の深さを設定
   */
  const setFunctionDepth = useCallback(
    (functionId: ItemId, depth: number) => {
      if (!state.rootFunctionId) return;

      const newDepths = state.functionDepths.map((setting) =>
        setting.functionId === functionId
          ? { ...setting, depth: Math.max(0, depth) }
          : setting
      );

      const mermaidCode = regenerateInternal(
        state.rootFunctionId,
        state.defaultDepth,
        newDepths
      );

      setState((prev) => ({
        ...prev,
        functionDepths: newDepths,
        mermaidCode,
      }));
    },
    [state.rootFunctionId, state.functionDepths, state.defaultDepth, regenerateInternal]
  );

  /**
   * 再生成
   */
  const regenerate = useCallback(() => {
    if (!state.rootFunctionId) return;

    const mermaidCode = regenerateInternal(
      state.rootFunctionId,
      state.defaultDepth,
      state.functionDepths
    );

    setState((prev) => ({
      ...prev,
      mermaidCode,
    }));
  }, [state.rootFunctionId, state.defaultDepth, state.functionDepths, regenerateInternal]);

  /**
   * リセット
   */
  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    state,
    setRootFunction,
    setFunctionDepth,
    regenerate,
    reset,
    mermaidCode: state.mermaidCode,
    expandedFunctions: state.functionDepths,
  };
}
