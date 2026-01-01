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
  ParticipantInfo,
  SequenceDiagramData,
  FunctionDepthSetting,
} from '../types/sequence';
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
    .replace(/\n/g, ' ');
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
 * 深さ制限付きで呼び出しチェーンを収集する（DFS: 深さ優先探索）
 *
 * DFSを使用することで、ネストした呼び出しが実行順に表示される。
 * 例: run() -> update_game_state() -> (内部の呼び出し) -> result()
 * BFSの場合は: run() -> update_game_state() -> result() -> (内部の呼び出し)
 */
function collectCallChain(
  graphData: CytoscapeData,
  startId: ItemId,
  depthConfig: DepthConfig
): { calls: CallInfo[]; participants: Set<ItemId> } {
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
  function dfs(nodeId: ItemId, depthLimit: number): void {
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
      const edgeKey = `${edge.data.source}->${edge.data.target}@${edge.data.callSite.line}`;
      if (visited.has(edgeKey)) {
        continue;
      }
      visited.add(edgeKey);

      const targetId = edge.data.target as ItemId;
      participants.add(targetId);

      // 呼び出しを記録
      calls.push({
        from: edge.data.source as ItemId,
        to: targetId,
        file: edge.data.callSite.file,
        line: edge.data.callSite.line,
        context: edge.data.context,
      });

      // 子ノードを再帰的に探索（深さ優先）
      // その関数の深さ設定を使用
      const targetDepth = depthConfig.functionDepths.get(targetId) ?? 0;
      dfs(targetId, targetDepth);
    }
  }

  // ルート関数から探索開始（深さ1: 直接の呼び出しは常に表示）
  dfs(startId, 1);

  return { calls, participants };
}

/**
 * Mermaidシーケンス図を生成する
 */
export function generateSequenceDiagram(
  graphData: CytoscapeData,
  options: SequenceDiagramOptions
): SequenceDiagramData {
  const { startFunctionId, depthConfig, summaries } = options;

  // 呼び出しチェーンを収集
  const { calls, participants: participantIds } = collectCallChain(
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
  const mermaidCode = generateMermaidCode(participants, calls, summaries);

  return {
    mermaidCode,
    participants,
    calls,
  };
}

/**
 * Mermaidコードを生成する
 */
function generateMermaidCode(
  participants: ParticipantInfo[],
  calls: CallInfo[],
  summaries?: SummaryMap
): string {
  let code = 'sequenceDiagram\n';

  // 参加者宣言（構造体単位）
  for (const p of participants) {
    code += `    participant ${sanitizeId(p.id)} as ${p.displayName}\n`;
  }

  code += '\n';

  // コンテキストスタック（ネスト管理用）
  const contextStack: CallContext[] = [];

  // 呼び出し関係
  for (let i = 0; i < calls.length; i++) {
    const call = calls[i];
    const nextCall = calls[i + 1];

    // 構造体名を抽出
    const fromStruct = extractStructName(call.from);
    const toStruct = extractStructName(call.to);
    const methodName = extractMethodName(call.to);

    // ラベルを構築（メソッド名 + 概要）
    const summary = summaries?.get(call.to);
    let label: string;
    if (summary) {
      const escapedSummary = escapeMermaidLabel(truncateSummary(summary));
      label = `${methodName}<br/>${escapedSummary}`;
    } else {
      label = methodName;
    }

    // コンテキストの開始を検出
    if (call.context && call.context.type !== 'normal') {
      const needsNewBlock = !contextStack.length ||
        contextStack[contextStack.length - 1].type !== call.context.type ||
        contextStack[contextStack.length - 1].condition !== call.context.condition;

      if (needsNewBlock) {
        const indent = '    '.repeat(contextStack.length + 1);

        switch (call.context.type) {
          case 'if':
            code += `${indent}alt ${call.context.condition || 'condition'}\n`;
            contextStack.push(call.context);
            break;
          case 'else':
            // else の場合、前の if ブロックを閉じずに else を追加
            if (contextStack.length > 0 && contextStack[contextStack.length - 1].type === 'if') {
              code += `${indent}else\n`;
              contextStack[contextStack.length - 1] = call.context;
            }
            break;
          case 'match_arm':
            code += `${indent}alt ${call.context.arm_pattern || 'pattern'}\n`;
            contextStack.push(call.context);
            break;
          case 'loop':
            code += `${indent}loop\n`;
            contextStack.push(call.context);
            break;
          case 'while':
            code += `${indent}loop ${call.context.condition || 'while'}\n`;
            contextStack.push(call.context);
            break;
          case 'for':
            code += `${indent}loop ${call.context.condition || 'for'}\n`;
            contextStack.push(call.context);
            break;
        }
      }
    }

    // 呼び出し（構造体単位 + メソッド名・概要ラベル）
    const callIndent = '    '.repeat(contextStack.length + 1);
    code += `${callIndent}${sanitizeId(fromStruct as ItemId)}->>+${sanitizeId(toStruct as ItemId)}: ${label}\n`;
    code += `${callIndent}${sanitizeId(toStruct as ItemId)}-->>-${sanitizeId(fromStruct as ItemId)}: \n`;

    // コンテキストの終了を検出
    if (contextStack.length > 0) {
      const currentContext = contextStack[contextStack.length - 1];

      // 次の呼び出しが異なるコンテキストか、呼び出しがなくなった場合は閉じる
      const shouldClose =
        !nextCall ||
        !nextCall.context ||
        nextCall.context.type === 'normal' ||
        (nextCall.context.type !== 'else' &&
          (nextCall.context.type !== currentContext.type ||
            nextCall.context.condition !== currentContext.condition));

      if (shouldClose) {
        const endIndent = '    '.repeat(contextStack.length);
        code += `${endIndent}end\n`;
        contextStack.pop();
      }
    }
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

  // BFSで関数を収集
  const queue: ItemId[] = [startId];
  visited.add(startId);

  while (queue.length > 0) {
    const nodeId = queue.shift()!;

    // 子ノードの数を計算
    const edges = outgoingEdges.get(nodeId) || [];
    const uniqueTargets = new Set(edges.map((e) => e.data.target));
    const maxExpandableDepth = uniqueTargets.size > 0 ? 1 : 0;

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
