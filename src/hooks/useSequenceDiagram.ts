/**
 * シーケンス図の生成と深さ管理を行うフック
 */

import { useState, useCallback, useMemo } from 'react';
import type { ItemId } from '../types/schema';
import type { CytoscapeData } from '../types/graph';
import type {
  SequenceDiagramState,
  FunctionDepthSetting,
  SequenceEditState,
  SequenceGroup,
  SequenceNote,
  CallEntryId,
  CallInfo,
} from '../types/sequence';
import { createEmptyEditState } from '../types/sequence';
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
  /** アクティベーションを使用するか */
  useActivation: boolean;
  /** アクティベーション設定を切り替え */
  toggleActivation: () => void;

  // ============================================
  // 編集機能
  // ============================================

  /** 現在の編集状態 */
  editState: SequenceEditState;
  /** 現在の呼び出しリスト（一覧表示用、省略含む全ての呼び出し） */
  calls: CallInfo[];
  /** 描画された呼び出しリスト（ハイライト用、SVGと一致） */
  renderedCalls: CallInfo[];

  // グループ操作
  /** グループを追加 */
  addGroup: (name: string, callEntryIds: CallEntryId[]) => void;
  /** グループを削除 */
  removeGroup: (groupId: string) => void;
  /** グループを更新 */
  updateGroup: (groupId: string, updates: Partial<SequenceGroup>) => void;
  /** グループの折りたたみを切り替え */
  toggleGroupCollapse: (groupId: string) => void;

  // 省略操作
  /** 省略を追加 */
  addOmission: (callEntryIds: CallEntryId[], placeholder?: string) => void;
  /** 省略を削除 */
  removeOmission: (omissionId: string) => void;

  // ラベル編集操作
  /** カスタムラベルを設定 */
  setLabelEdit: (callEntryId: CallEntryId, customLabel: string) => void;
  /** カスタムラベルを削除 */
  removeLabelEdit: (callEntryId: CallEntryId) => void;

  // Note操作
  /** Noteを追加 */
  addNote: (note: Omit<SequenceNote, 'id'>) => void;
  /** Noteを削除 */
  removeNote: (noteId: string) => void;
  /** Noteを更新 */
  updateNote: (noteId: string, updates: Partial<SequenceNote>) => void;

  // 保存/読み込み
  /** 編集状態を読み込み */
  loadEditState: (state: SequenceEditState) => void;
  /** 現在の編集状態を取得 */
  getEditState: () => SequenceEditState;
  /** 編集状態をクリア */
  clearEdits: () => void;
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
/**
 * 一意なIDを生成
 */
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function useSequenceDiagram(
  graphData: CytoscapeData | null,
  summaries?: SummaryMap
): UseSequenceDiagramResult {
  const [state, setState] = useState<SequenceDiagramState>(initialState);
  const [useActivation, setUseActivation] = useState<boolean>(true);
  const [editState, setEditState] = useState<SequenceEditState>(createEmptyEditState());
  const [calls, setCalls] = useState<CallInfo[]>([]);

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
      functionDepths: FunctionDepthSetting[],
      activation: boolean,
      currentEditState?: SequenceEditState
    ): { mermaidCode: string | null; calls: CallInfo[] } => {
      if (!graphData) return { mermaidCode: null, calls: [] };

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
        useActivation: activation,
        editState: currentEditState,
      });

      return { mermaidCode: result.mermaidCode, calls: result.calls };
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
      const result = regenerateInternal(
        functionId,
        state.defaultDepth,
        functionDepths,
        useActivation
      );

      setState({
        rootFunctionId: functionId,
        defaultDepth: state.defaultDepth,
        functionDepths,
        mermaidCode: result.mermaidCode,
      });
      setCalls(result.calls);
    },
    [graphData, state.defaultDepth, useActivation, regenerateInternal]
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

      const result = regenerateInternal(
        state.rootFunctionId,
        state.defaultDepth,
        newDepths,
        useActivation
      );

      setState((prev) => ({
        ...prev,
        functionDepths: newDepths,
        mermaidCode: result.mermaidCode,
      }));
      setCalls(result.calls);
    },
    [state.rootFunctionId, state.functionDepths, state.defaultDepth, useActivation, regenerateInternal]
  );

  /**
   * 再生成
   */
  const regenerate = useCallback(() => {
    if (!state.rootFunctionId) return;

    const result = regenerateInternal(
      state.rootFunctionId,
      state.defaultDepth,
      state.functionDepths,
      useActivation
    );

    setState((prev) => ({
      ...prev,
      mermaidCode: result.mermaidCode,
    }));
    setCalls(result.calls);
  }, [state.rootFunctionId, state.defaultDepth, state.functionDepths, useActivation, regenerateInternal]);

  /**
   * アクティベーション設定を切り替え
   */
  const toggleActivation = useCallback(() => {
    const newActivation = !useActivation;
    setUseActivation(newActivation);

    // 再生成
    if (state.rootFunctionId) {
      const result = regenerateInternal(
        state.rootFunctionId,
        state.defaultDepth,
        state.functionDepths,
        newActivation
      );

      setState((prev) => ({
        ...prev,
        mermaidCode: result.mermaidCode,
      }));
      setCalls(result.calls);
    }
  }, [useActivation, state.rootFunctionId, state.defaultDepth, state.functionDepths, regenerateInternal]);

  /**
   * リセット
   */
  const reset = useCallback(() => {
    setState(initialState);
    setEditState(createEmptyEditState());
    setCalls([]);
  }, []);

  /**
   * editStateを反映したMermaidコードとrenderedCallsを生成
   * stateのmermaidCodeはeditState未適用のベースコード。
   * 編集状態がある場合は再生成する。
   *
   * - mermaidCode: 編集状態を適用したMermaidコード
   * - renderedCalls: 実際に描画された呼び出し（ハイライトマッピング用）
   * - calls（state）: 全ての呼び出し（呼び出し一覧表示用、省略含む）
   */
  const { mermaidCode: mermaidCodeWithEdits, renderedCalls } = useMemo(() => {
    if (!state.rootFunctionId || !state.mermaidCode) {
      return { mermaidCode: state.mermaidCode, renderedCalls: calls };
    }

    // 編集状態がない場合はベースのコードとcallsをそのまま返す
    if (
      editState.groups.length === 0 &&
      editState.omissions.length === 0 &&
      editState.labelEdits.length === 0 &&
      editState.notes.length === 0
    ) {
      return { mermaidCode: state.mermaidCode, renderedCalls: calls };
    }

    // 編集状態を適用して再生成
    const result = regenerateInternal(
      state.rootFunctionId,
      state.defaultDepth,
      state.functionDepths,
      useActivation,
      editState
    );

    return { mermaidCode: result.mermaidCode, renderedCalls: result.calls };
  }, [editState, state.rootFunctionId, state.defaultDepth, state.functionDepths, state.mermaidCode, useActivation, regenerateInternal, calls]);

  // ============================================
  // 編集操作
  // ============================================

  /**
   * グループを追加
   * 既にグループに属している呼び出しがある場合は追加しない
   */
  const addGroup = useCallback((name: string, callEntryIds: CallEntryId[]) => {
    setEditState((prev) => {
      // 既にグループに属している呼び出しをチェック
      const hasConflict = callEntryIds.some((id) =>
        prev.groups.some((g) => g.callEntryIds.includes(id))
      );

      if (hasConflict) {
        // 既存グループと重複している場合は追加しない
        return prev;
      }

      return {
        ...prev,
        groups: [
          ...prev.groups,
          { id: generateId(), name, callEntryIds, isCollapsed: false },
        ],
      };
    });
  }, []);

  /**
   * グループを削除
   */
  const removeGroup = useCallback((groupId: string) => {
    setEditState((prev) => ({
      ...prev,
      groups: prev.groups.filter((g) => g.id !== groupId),
    }));
  }, []);

  /**
   * グループを更新
   */
  const updateGroup = useCallback((groupId: string, updates: Partial<SequenceGroup>) => {
    setEditState((prev) => ({
      ...prev,
      groups: prev.groups.map((g) =>
        g.id === groupId ? { ...g, ...updates } : g
      ),
    }));
  }, []);

  /**
   * グループの折りたたみを切り替え
   */
  const toggleGroupCollapse = useCallback((groupId: string) => {
    setEditState((prev) => ({
      ...prev,
      groups: prev.groups.map((g) =>
        g.id === groupId ? { ...g, isCollapsed: !g.isCollapsed } : g
      ),
    }));
  }, []);

  /**
   * 省略を追加またはトグル
   * 選択された呼び出しが既に省略されている場合は解除する
   */
  const addOmission = useCallback((callEntryIds: CallEntryId[], placeholder = '...') => {
    setEditState((prev) => {
      // 選択された呼び出しが既に省略に含まれているかチェック
      const existingOmissions = prev.omissions.filter((o) =>
        callEntryIds.some((id) => o.callEntryIds.includes(id))
      );

      if (existingOmissions.length > 0) {
        // 既存の省略から選択された呼び出しを削除
        const updatedOmissions = prev.omissions
          .map((o) => {
            const remainingIds = o.callEntryIds.filter((id) => !callEntryIds.includes(id));
            if (remainingIds.length === 0) {
              return null; // 省略を完全に削除
            }
            return { ...o, callEntryIds: remainingIds };
          })
          .filter((o): o is NonNullable<typeof o> => o !== null);

        return { ...prev, omissions: updatedOmissions };
      }

      // 新しい省略を追加
      return {
        ...prev,
        omissions: [
          ...prev.omissions,
          {
            id: generateId(),
            callEntryIds,
            placeholder,
          },
        ],
      };
    });
  }, []);

  /**
   * 省略を削除
   */
  const removeOmission = useCallback((omissionId: string) => {
    setEditState((prev) => ({
      ...prev,
      omissions: prev.omissions.filter((o) => o.id !== omissionId),
    }));
  }, []);

  /**
   * カスタムラベルを設定
   */
  const setLabelEdit = useCallback((callEntryId: CallEntryId, customLabel: string) => {
    setEditState((prev) => {
      const existing = prev.labelEdits.find((l) => l.callEntryId === callEntryId);
      if (existing) {
        return {
          ...prev,
          labelEdits: prev.labelEdits.map((l) =>
            l.callEntryId === callEntryId ? { ...l, customLabel } : l
          ),
        };
      }
      return {
        ...prev,
        labelEdits: [...prev.labelEdits, { callEntryId, customLabel }],
      };
    });
  }, []);

  /**
   * カスタムラベルを削除
   */
  const removeLabelEdit = useCallback((callEntryId: CallEntryId) => {
    setEditState((prev) => ({
      ...prev,
      labelEdits: prev.labelEdits.filter((l) => l.callEntryId !== callEntryId),
    }));
  }, []);

  /**
   * Noteを追加
   */
  const addNote = useCallback((note: Omit<SequenceNote, 'id'>) => {
    setEditState((prev) => ({
      ...prev,
      notes: [
        ...prev.notes,
        {
          ...note,
          id: generateId(),
        },
      ],
    }));
  }, []);

  /**
   * Noteを削除
   */
  const removeNote = useCallback((noteId: string) => {
    setEditState((prev) => ({
      ...prev,
      notes: prev.notes.filter((n) => n.id !== noteId),
    }));
  }, []);

  /**
   * Noteを更新
   */
  const updateNote = useCallback((noteId: string, updates: Partial<SequenceNote>) => {
    setEditState((prev) => ({
      ...prev,
      notes: prev.notes.map((n) =>
        n.id === noteId ? { ...n, ...updates } : n
      ),
    }));
  }, []);

  /**
   * 編集状態を読み込み（プロファイルから）
   */
  const loadEditState = useCallback((state: SequenceEditState) => {
    setEditState(state);
  }, []);

  /**
   * 現在の編集状態を取得（プロファイル保存用）
   */
  const getEditState = useCallback(() => {
    return editState;
  }, [editState]);

  /**
   * 編集状態をクリア
   */
  const clearEdits = useCallback(() => {
    setEditState(createEmptyEditState());
  }, []);

  return {
    state,
    setRootFunction,
    setFunctionDepth,
    regenerate,
    reset,
    mermaidCode: mermaidCodeWithEdits,
    expandedFunctions: state.functionDepths,
    useActivation,
    toggleActivation,

    // 編集機能
    editState,
    calls,
    renderedCalls,
    addGroup,
    removeGroup,
    updateGroup,
    toggleGroupCollapse,
    addOmission,
    removeOmission,
    setLabelEdit,
    removeLabelEdit,
    addNote,
    removeNote,
    updateNote,
    loadEditState,
    getEditState,
    clearEdits,
  };
}
