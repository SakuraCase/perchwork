/**
 * Mermaidシーケンス図生成サービス
 *
 * コールグラフデータからMermaid記法のシーケンス図を生成する
 */

import type { ItemId } from '../types/schema';
import type { CytoscapeData, CytoscapeEdge } from '../types/graph';
import type {
  CallContext,
  CallInfo,
  CallEvent,
  ParticipantInfo,
  SequenceDiagramData,
  FunctionDepthSetting,
  SequenceEditState,
  CallEntryId,
} from '../types/sequence';
import { generateCallEntryId } from '../types/sequence';
import type { SummaryMap } from './semanticLoader';

/**
 * 深さ設定
 */
export interface DepthConfig {
  /** デフォルト深さ */
  defaultDepth: number;
  /** 関数ごとの深さ設定 */
  functionDepths: Map<ItemId, number>;
}

/**
 * シーケンス図生成オプション
 */
export interface SequenceDiagramOptions {
  /** 起点関数ID */
  startFunctionId: ItemId;
  /** 深さ設定 */
  depthConfig: DepthConfig;
  /** ItemId → summary のマップ（オプション） */
  summaries?: SummaryMap;
  /** アクティベーション（+/-）を使用するか（デフォルト: true） */
  useActivation?: boolean;
  /** 編集状態（オプション） */
  editState?: SequenceEditState;
}

/**
 * ItemIdをMermaid互換IDにサニタイズする
 */
export function sanitizeId(id: ItemId): string {
  return id
    .replace(/::/g, '_')
    .replace(/\./g, '_')
    .replace(/-/g, '_')
    .replace(/\s+/g, '_');
}

/**
 * ItemIdから表示名を抽出する
 * 例: "battle_loop.rs::BattleLoop::run::method" -> "BattleLoop::run"
 */
export function extractDisplayName(id: ItemId): string {
  const parts = id.split('::');
  if (parts.length >= 3) {
    // ファイル名を除いた型名::メソッド名
    return `${parts[parts.length - 3]}::${parts[parts.length - 2]}`;
  }
  if (parts.length >= 2) {
    return parts[parts.length - 2];
  }
  return parts[0];
}

/**
 * ItemIdから構造体名を抽出する
 * 例: "battle_loop.rs::BattleLoop::run::method" -> "BattleLoop"
 */
export function extractStructName(id: ItemId): string {
  const parts = id.split('::');
  if (parts.length >= 3) {
    return parts[parts.length - 3];
  }
  if (parts.length >= 2) {
    return parts[parts.length - 2];
  }
  return parts[0];
}

/**
 * ItemIdからメソッド名を抽出する
 * 例: "battle_loop.rs::BattleLoop::run::method" -> "run"
 */
export function extractMethodName(id: ItemId): string {
  const parts = id.split('::');
  if (parts.length >= 2) {
    return parts[parts.length - 2];
  }
  return parts[0];
}

/**
 * Mermaidラベル用に文字列をエスケープする
 */
function escapeMermaidLabel(text: string): string {
  return text
    .replace(/[<>]/g, '')
    .replace(/:/g, '：')
    .replace(/"/g, "'")
    .replace(/\n/g, '<br/>');
}

/**
 * 概要を省略する（30文字以上の場合）
 */
function truncateSummary(summary: string, maxLength = 30): string {
  if (summary.length <= maxLength) {
    return summary;
  }
  return summary.slice(0, maxLength - 1) + '…';
}

/**
 * 深さ制限付きで呼び出しイベントを収集する（DFS: 深さ優先探索）
 *
 * DFSを使用することで、ネストした呼び出しが実行順に表示される。
 * 開始/終了イベントを分離することで、アクティベーションの入れ子を正しく表現する。
 * 例: start(run) -> start(update) -> end(update) -> end(run)
 */
function collectCallEvents(
  graphData: CytoscapeData,
  startId: ItemId,
  depthConfig: DepthConfig
): { events: CallEvent[]; participants: Set<ItemId>; calls: CallInfo[] } {
  const events: CallEvent[] = [];
  const calls: CallInfo[] = [];
  const participants = new Set<ItemId>();
  const visited = new Set<string>(); // エッジ訪問済みチェック用

  // 出力エッジマップを構築
  const outgoingEdges = new Map<string, CytoscapeEdge[]>();
  for (const edge of graphData.edges) {
    if (!outgoingEdges.has(edge.data.source)) {
      outgoingEdges.set(edge.data.source, []);
    }
    outgoingEdges.get(edge.data.source)!.push(edge);
  }

  participants.add(startId);

  // DFS（深さ優先探索）で再帰的に探索
  // callPathKey: 呼び出し元のパスを表すキー（異なるパスからの同一エッジを区別するため）
  function dfs(nodeId: ItemId, depthLimit: number, callPathKey: string): void {
    // 深さ制限に達したらスキップ
    if (depthLimit <= 0) {
      return;
    }

    // この関数からの呼び出しを取得
    const edges = outgoingEdges.get(nodeId) || [];

    // 行番号でソート（実行順を保持）
    const sortedEdges = [...edges].sort(
      (a, b) => a.data.callSite.line - b.data.callSite.line
    );

    for (const edge of sortedEdges) {
      // エッジキーに呼び出し元パスを含める（異なるパスからの呼び出しを区別）
      const edgeKey = `${callPathKey}>${edge.data.source}->${edge.data.target}@${edge.data.callSite.line}`;
      if (visited.has(edgeKey)) {
        continue;
      }
      visited.add(edgeKey);

      const targetId = edge.data.target as ItemId;
      participants.add(targetId);

      // 呼び出し情報を作成
      const callInfo: CallInfo = {
        from: edge.data.source as ItemId,
        to: targetId,
        file: edge.data.callSite.file,
        line: edge.data.callSite.line,
        context: edge.data.context,
      };

      // 呼び出しを記録（既存の互換性のため）
      calls.push(callInfo);

      // 開始イベントを記録
      events.push({ type: 'start', call: callInfo });

      // 子ノードを再帰的に探索（深さ優先）
      // その関数の深さ設定を使用
      const targetDepth = depthConfig.functionDepths.get(targetId) ?? 0;
      // 新しい呼び出しパスキーを生成
      const newCallPathKey = `${nodeId}@${edge.data.callSite.line}`;
      dfs(targetId, targetDepth, newCallPathKey);

      // 終了イベントを記録（子ノードの探索が終わった後）
      events.push({ type: 'end', call: callInfo });
    }
  }

  // ルート関数から探索開始（深さ1: 直接の呼び出しは常に表示）
  dfs(startId, 1, 'root');

  return { events, participants, calls };
}

/**
 * Mermaidシーケンス図を生成する
 */
export function generateSequenceDiagram(
  graphData: CytoscapeData,
  options: SequenceDiagramOptions
): SequenceDiagramData {
  const { startFunctionId, depthConfig, summaries, useActivation = true, editState } = options;

  // 呼び出しイベントを収集
  const { events, participants: participantIds, calls } = collectCallEvents(
    graphData,
    startFunctionId,
    depthConfig
  );

  // 構造体単位のparticipantを構築
  const structParticipants = new Map<string, ParticipantInfo>();
  let order = 0;

  // 起点の構造体を最初に追加
  const startStructName = extractStructName(startFunctionId);
  structParticipants.set(startStructName, {
    id: startStructName as ItemId,
    displayName: startStructName,
    order: order++,
  });

  // 残りの構造体を追加
  for (const id of participantIds) {
    const structName = extractStructName(id);
    if (!structParticipants.has(structName)) {
      structParticipants.set(structName, {
        id: structName as ItemId,
        displayName: structName,
        order: order++,
      });
    }
  }

  const participants = Array.from(structParticipants.values());

  // Mermaidコードを生成
  const mermaidCode = generateMermaidCode(participants, events, summaries, useActivation, editState);

  return {
    mermaidCode,
    participants,
    calls,
  };
}

/**
 * コンテキストエントリ（どの呼び出しがコンテキストを開いたかを追跡）
 */
interface ContextEntry {
  context: CallContext;
  openedByCall: CallInfo;
}

/**
 * 2つの CallInfo が同じ呼び出しを表すかを判定
 */
function isSameCall(a: CallInfo, b: CallInfo): boolean {
  return a.from === b.from && a.to === b.to && a.line === b.line;
}

/**
 * 編集状態のヘルパー: 呼び出しが省略されているかチェック
 */
function isCallOmitted(callEntryId: CallEntryId, editState?: SequenceEditState): boolean {
  if (!editState) return false;
  return editState.omissions.some(o => o.callEntryIds.includes(callEntryId));
}

/**
 * 編集状態のヘルパー: 省略のプレースホルダーを取得
 * @param callEntryId 対象の呼び出しID
 * @param editState 編集状態
 * @param previousOmittedCallId 前回省略された呼び出しID（連続判定用）
 * @returns プレースホルダー文字列、または null
 */
function getOmissionPlaceholder(
  callEntryId: CallEntryId,
  editState?: SequenceEditState,
  previousOmittedCallId?: CallEntryId | null
): string | null {
  if (!editState) return null;
  const omission = editState.omissions.find(o => o.callEntryIds.includes(callEntryId));
  if (omission) {
    // 前回省略された呼び出しが同じ省略グループに属していない場合は、プレースホルダーを表示
    // これにより、非連続の省略でもそれぞれの位置で ... を表示する
    if (!previousOmittedCallId || !omission.callEntryIds.includes(previousOmittedCallId)) {
      return omission.placeholder;
    }
  }
  return null;
}

/**
 * 編集状態のヘルパー: カスタムラベルを取得
 */
function getCustomLabel(callEntryId: CallEntryId, editState?: SequenceEditState): string | null {
  if (!editState) return null;
  const labelEdit = editState.labelEdits.find(l => l.callEntryId === callEntryId);
  return labelEdit?.customLabel ?? null;
}

/**
 * 編集状態のヘルパー: 呼び出しが属するグループを取得
 */
function getCallGroup(callEntryId: CallEntryId, editState?: SequenceEditState) {
  if (!editState) return null;
  return editState.groups.find(g => g.callEntryIds.includes(callEntryId)) ?? null;
}

/**
 * 編集状態のヘルパー: グループの最初の呼び出しかチェック
 */
function isGroupStart(callEntryId: CallEntryId, editState?: SequenceEditState): boolean {
  if (!editState) return false;
  return editState.groups.some(g => g.callEntryIds[0] === callEntryId);
}

/**
 * 編集状態のヘルパー: グループの最後の呼び出しかチェック
 */
function isGroupEnd(callEntryId: CallEntryId, editState?: SequenceEditState): boolean {
  if (!editState) return false;
  return editState.groups.some(g => g.callEntryIds[g.callEntryIds.length - 1] === callEntryId);
}

/**
 * 編集状態のヘルパー: 指定位置のNoteを取得
 */
function getNotesAtPosition(
  callEntryId: CallEntryId,
  position: 'before' | 'after',
  editState?: SequenceEditState
) {
  if (!editState) return [];
  return editState.notes.filter(n => n.callEntryId === callEntryId && n.position === position);
}

/**
 * Mermaidコードを生成する
 * イベントベースで開始/終了を処理し、アクティベーションの入れ子を正しく表現する
 */
function generateMermaidCode(
  participants: ParticipantInfo[],
  events: CallEvent[],
  summaries?: SummaryMap,
  useActivation: boolean = true,
  editState?: SequenceEditState
): string {
  let code = 'sequenceDiagram\n';

  // 参加者宣言（構造体単位）
  for (const p of participants) {
    code += `    participant ${sanitizeId(p.id)} as ${p.displayName}\n`;
  }

  code += '\n';

  // コンテキストスタック（ネスト管理用）- どの呼び出しがコンテキストを開いたかを追跡
  const contextStack: ContextEntry[] = [];
  // グループスタック（開いているグループを追跡）
  const openGroups = new Set<string>();
  // 前回省略された呼び出しID（非連続の省略検出用）
  let lastOmittedCallId: CallEntryId | null = null;

  // DEBUG: 省略設定をログ出力
  if (editState?.omissions && editState.omissions.length > 0) {
    console.log('[generateMermaidCode] omissions:', editState.omissions);
  }

  // イベントを順に処理
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const call = event.call;
    const callEntryId = generateCallEntryId(call);

    // 構造体名を抽出
    const fromStruct = extractStructName(call.from);
    const toStruct = extractStructName(call.to);
    const isSelfCall = fromStruct === toStruct;

    if (event.type === 'start') {
      // DEBUG: 省略チェックのログ
      if (editState?.omissions && editState.omissions.length > 0) {
        const isOmitted = isCallOmitted(callEntryId, editState);
        const placeholder = getOmissionPlaceholder(callEntryId, editState, lastOmittedCallId);
        console.log(`[generateMermaidCode] callEntryId: ${callEntryId}, isOmitted: ${isOmitted}, placeholder: ${placeholder}, lastOmittedCallId: ${lastOmittedCallId}`);
      }

      // 省略チェック
      const omissionPlaceholder = getOmissionPlaceholder(callEntryId, editState, lastOmittedCallId);
      if (omissionPlaceholder !== null) {
        // 省略呼び出し: プレースホルダーを表示（非連続または最初の省略）
        const callIndent = '    '.repeat(contextStack.length + 1);
        code += `${callIndent}Note over ${sanitizeId(fromStruct as ItemId)}: ${escapeMermaidLabel(omissionPlaceholder)}\n`;
        lastOmittedCallId = callEntryId;
        continue;
      }
      if (isCallOmitted(callEntryId, editState)) {
        // 省略された呼び出し（同じ省略グループ内で連続）: スキップ
        lastOmittedCallId = callEntryId;
        continue;
      }

      // 非省略の呼び出しを処理する前に、lastOmittedCallId をリセット
      lastOmittedCallId = null;

      // グループ開始チェック
      if (isGroupStart(callEntryId, editState)) {
        const group = getCallGroup(callEntryId, editState);
        if (group && !group.isCollapsed) {
          const callIndent = '    '.repeat(contextStack.length + 1);
          code += `${callIndent}rect rgb(60, 60, 80)\n`;
          code += `${callIndent}Note left of ${sanitizeId(fromStruct as ItemId)}: ${escapeMermaidLabel(group.name)}\n`;
          openGroups.add(group.id);
        } else if (group && group.isCollapsed) {
          // 折りたたまれたグループ: サマリーのみ表示してグループ内の呼び出しをスキップ
          const callIndent = '    '.repeat(contextStack.length + 1);
          code += `${callIndent}Note over ${sanitizeId(fromStruct as ItemId)}: [${escapeMermaidLabel(group.name)}]\n`;
          // グループ内の呼び出しをスキップするためにインデックスを進める
          // Note: 折りたたまれたグループの呼び出しは後続のループで個別にスキップされる
        }
      }

      // 折りたたまれたグループ内の呼び出しはスキップ
      const group = getCallGroup(callEntryId, editState);
      if (group?.isCollapsed && !isGroupStart(callEntryId, editState)) {
        continue;
      }

      // before Noteを挿入
      const beforeNotes = getNotesAtPosition(callEntryId, 'before', editState);
      for (const note of beforeNotes) {
        const callIndent = '    '.repeat(contextStack.length + 1);
        const participantStr = note.participants.map(p => sanitizeId(p as ItemId)).join(',');
        code += `${callIndent}Note ${note.placement} ${participantStr}: ${escapeMermaidLabel(note.text)}\n`;
      }

      // 開始イベント: 呼び出し矢印を出力
      const toMethodName = extractMethodName(call.to);

      // カスタムラベルチェック
      const customLabel = getCustomLabel(callEntryId, editState);
      let label: string;

      if (customLabel !== null) {
        // カスタムラベルを使用
        label = escapeMermaidLabel(customLabel);
      } else if (isSelfCall) {
        // セルフコール: 呼び出し元メソッド名も含める
        const fromMethodName = extractMethodName(call.from);
        const summary = summaries?.get(call.to);
        if (summary) {
          const escapedSummary = escapeMermaidLabel(truncateSummary(summary));
          label = `${fromMethodName} → ${toMethodName}<br/>${escapedSummary}`;
        } else {
          label = `${fromMethodName} → ${toMethodName}`;
        }
      } else {
        // 通常の呼び出し: 呼び出し先メソッド名のみ
        const summary = summaries?.get(call.to);
        if (summary) {
          const escapedSummary = escapeMermaidLabel(truncateSummary(summary));
          label = `${toMethodName}<br/>${escapedSummary}`;
        } else {
          label = toMethodName;
        }
      }

      // コンテキストの開始を検出
      if (call.context && call.context.type !== 'normal') {
        const currentContext = contextStack.length > 0
          ? contextStack[contextStack.length - 1].context
          : null;
        const needsNewBlock = !currentContext ||
          currentContext.type !== call.context.type ||
          currentContext.condition !== call.context.condition;

        if (needsNewBlock) {
          const indent = '    '.repeat(contextStack.length + 1);

          switch (call.context.type) {
            case 'if':
              code += `${indent}alt ${call.context.condition || 'condition'}\n`;
              contextStack.push({ context: call.context, openedByCall: call });
              break;
            case 'else':
              // else の場合、前の if ブロックを閉じずに else を追加
              if (contextStack.length > 0 && contextStack[contextStack.length - 1].context.type === 'if') {
                code += `${indent}else\n`;
                // openedByCall は元の if の呼び出しを維持（else の終了時に閉じる）
                contextStack[contextStack.length - 1] = {
                  context: call.context,
                  openedByCall: contextStack[contextStack.length - 1].openedByCall,
                };
              }
              break;
            case 'match_arm':
              code += `${indent}alt ${call.context.arm_pattern || 'pattern'}\n`;
              contextStack.push({ context: call.context, openedByCall: call });
              break;
            case 'loop':
              code += `${indent}loop\n`;
              contextStack.push({ context: call.context, openedByCall: call });
              break;
            case 'while':
              code += `${indent}loop ${call.context.condition || 'while'}\n`;
              contextStack.push({ context: call.context, openedByCall: call });
              break;
            case 'for':
              code += `${indent}loop ${call.context.condition || 'for'}\n`;
              contextStack.push({ context: call.context, openedByCall: call });
              break;
          }
        }
      }

      // 呼び出し矢印
      const callIndent = '    '.repeat(contextStack.length + 1);
      const activateStart = useActivation ? '+' : '';
      code += `${callIndent}${sanitizeId(fromStruct as ItemId)}->>${activateStart}${sanitizeId(toStruct as ItemId)}: ${label}\n`;

      // after Noteを挿入
      const afterNotes = getNotesAtPosition(callEntryId, 'after', editState);
      for (const note of afterNotes) {
        const noteIndent = '    '.repeat(contextStack.length + 1);
        const participantStr = note.participants.map(p => sanitizeId(p as ItemId)).join(',');
        code += `${noteIndent}Note ${note.placement} ${participantStr}: ${escapeMermaidLabel(note.text)}\n`;
      }

    } else {
      // 終了イベント

      // 省略された呼び出しはスキップ
      if (isCallOmitted(callEntryId, editState)) {
        continue;
      }

      // 折りたたまれたグループ内の呼び出しはスキップ
      const group = getCallGroup(callEntryId, editState);
      if (group?.isCollapsed) {
        continue;
      }

      if (useActivation) {
        // アクティベーション有効時: 戻り矢印を出力
        const callIndent = '    '.repeat(contextStack.length + 1);
        code += `${callIndent}${sanitizeId(toStruct as ItemId)}-->>-${sanitizeId(fromStruct as ItemId)}: \n`;
      }

      // コンテキストの終了を検出
      // この呼び出しがコンテキストを開いた呼び出しと一致する場合、コンテキストを閉じる
      if (contextStack.length > 0) {
        const currentEntry = contextStack[contextStack.length - 1];
        if (isSameCall(call, currentEntry.openedByCall)) {
          const endIndent = '    '.repeat(contextStack.length);
          code += `${endIndent}end\n`;
          contextStack.pop();
        }
      }

      // グループ終了チェック
      if (isGroupEnd(callEntryId, editState)) {
        const endGroup = getCallGroup(callEntryId, editState);
        if (endGroup && openGroups.has(endGroup.id)) {
          const callIndent = '    '.repeat(contextStack.length + 1);
          code += `${callIndent}end\n`;
          openGroups.delete(endGroup.id);
        }
      }
    }
  }

  // 残りのグループを閉じる
  for (const groupId of openGroups) {
    void groupId; // satisfy linter
    const indent = '    '.repeat(contextStack.length + 1);
    code += `${indent}end\n`;
  }

  // 残りのコンテキストを閉じる
  while (contextStack.length > 0) {
    const indent = '    '.repeat(contextStack.length);
    code += `${indent}end\n`;
    contextStack.pop();
  }

  return code;
}

/**
 * ノードから到達可能な最大深さを計算する（DFS + メモ化）
 * 循環参照を検出した場合は現在のパスを無視して0を返す
 */
function calculateMaxDepth(
  nodeId: ItemId,
  outgoingEdges: Map<string, CytoscapeEdge[]>,
  memo: Map<ItemId, number>,
  visiting: Set<ItemId>
): number {
  // メモ化: 既に計算済みならその値を返す
  if (memo.has(nodeId)) {
    return memo.get(nodeId)!;
  }

  // 循環参照検出
  if (visiting.has(nodeId)) {
    return 0;
  }

  const edges = outgoingEdges.get(nodeId) || [];
  if (edges.length === 0) {
    memo.set(nodeId, 0);
    return 0;
  }

  // 訪問中としてマーク
  visiting.add(nodeId);

  // 各子ノードの最大深さを計算し、最大値 + 1 を返す
  let maxChildDepth = 0;
  for (const edge of edges) {
    const childDepth = calculateMaxDepth(
      edge.data.target as ItemId,
      outgoingEdges,
      memo,
      visiting
    );
    maxChildDepth = Math.max(maxChildDepth, childDepth);
  }

  // 訪問中から除去
  visiting.delete(nodeId);

  const depth = maxChildDepth + 1;
  memo.set(nodeId, depth);
  return depth;
}

/**
 * グラフデータから関数の深さ設定リストを生成する
 * ルート関数は除外される（起点なので深さ設定は不要）
 * 初期深さは0（展開なし）
 */
export function buildFunctionDepthSettings(
  graphData: CytoscapeData,
  startId: ItemId
): FunctionDepthSetting[] {
  const settings: FunctionDepthSetting[] = [];
  const visited = new Set<ItemId>();

  // 出力エッジマップを構築
  const outgoingEdges = new Map<string, CytoscapeEdge[]>();
  for (const edge of graphData.edges) {
    if (!outgoingEdges.has(edge.data.source)) {
      outgoingEdges.set(edge.data.source, []);
    }
    outgoingEdges.get(edge.data.source)!.push(edge);
  }

  // 深さ計算用のメモ
  const depthMemo = new Map<ItemId, number>();

  // BFSで関数を収集
  const queue: ItemId[] = [startId];
  visited.add(startId);

  while (queue.length > 0) {
    const nodeId = queue.shift()!;

    // DFSで最大深さを計算
    const maxExpandableDepth = calculateMaxDepth(
      nodeId,
      outgoingEdges,
      depthMemo,
      new Set()
    );

    // ルート関数は除外（起点なので深さ設定は不要）
    if (nodeId !== startId) {
      settings.push({
        functionId: nodeId,
        displayName: extractDisplayName(nodeId),
        depth: 0, // 初期深さは0（展開なし）
        maxExpandableDepth,
      });
    }

    // 子ノードをキューに追加
    const edges = outgoingEdges.get(nodeId) || [];
    for (const edge of edges) {
      const targetId = edge.data.target as ItemId;
      if (!visited.has(targetId)) {
        visited.add(targetId);
        queue.push(targetId);
      }
    }
  }

  return settings;
}
