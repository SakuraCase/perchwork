import type Parser from 'tree-sitter';
import path from 'path';
import type { CallEdge, UnresolvedEdge, CallContext, TypeScope } from '../../types/index.js';
import type { TypeRegistry } from '../../core/TypeRegistry.js';
import { resolveReceiverType, extractParameterTypes, processLetDeclaration } from './typeResolver.js';

/**
 * 呼び出し名を正規化（改行と余分な空白を除去）
 */
export function normalizeCallName(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * ノードが祖先ノードの子孫かどうかをチェック
 */
function isDescendant(node: Parser.SyntaxNode, ancestor: Parser.SyntaxNode): boolean {
  let current = node.parent;
  while (current) {
    if (current === ancestor) return true;
    current = current.parent;
  }
  return false;
}

/**
 * match式内の親アームを検索
 */
function findParentMatchArm(
  node: Parser.SyntaxNode,
  matchExpr: Parser.SyntaxNode
): Parser.SyntaxNode | null {
  let current = node.parent;
  while (current && current !== matchExpr) {
    if (current.type === 'match_arm') {
      return current;
    }
    current = current.parent;
  }
  return null;
}

/**
 * 呼び出しのコンテキスト（制御構造）を取得
 */
export function getCallContext(node: Parser.SyntaxNode): CallContext {
  let current = node.parent;
  while (current) {
    switch (current.type) {
      case 'if_expression': {
        const condition = current.childForFieldName('condition');
        const consequence = current.childForFieldName('consequence');
        const alternative = current.childForFieldName('alternative');

        if (consequence && isDescendant(node, consequence)) {
          return {
            type: 'if',
            condition: condition ? normalizeCallName(condition.text) : undefined,
          };
        }
        if (alternative && isDescendant(node, alternative)) {
          return {
            type: 'else',
            condition: condition ? normalizeCallName(condition.text) : undefined,
          };
        }
        break;
      }
      case 'match_expression': {
        const arm = findParentMatchArm(node, current);
        if (arm) {
          const pattern = arm.childForFieldName('pattern');
          return {
            type: 'match_arm',
            arm_pattern: pattern ? pattern.text : undefined,
          };
        }
        break;
      }
      case 'loop_expression':
        return { type: 'loop' };
      case 'while_expression': {
        const condition = current.childForFieldName('condition');
        return {
          type: 'while',
          condition: condition ? normalizeCallName(condition.text) : undefined,
        };
      }
      case 'for_expression': {
        const pattern = current.childForFieldName('pattern');
        const value = current.childForFieldName('value');
        const conditionText =
          pattern && value
            ? `${pattern.text} in ${normalizeCallName(value.text)}`
            : pattern?.text;
        return {
          type: 'for',
          condition: conditionText,
        };
      }
    }
    current = current.parent;
  }
  return { type: 'normal' };
}

/**
 * 未解決エッジの理由を特定
 */
export function getUnresolvedReason(
  receiver: Parser.SyntaxNode,
  typeScope?: TypeScope
): string {
  if (!typeScope) {
    return 'no_type_scope';
  }

  if (receiver.type === 'identifier') {
    const varName = receiver.text;
    if (!typeScope.variables.has(varName)) {
      return `variable_not_in_scope: ${varName}`;
    }
    return `type_lookup_failed: ${varName}`;
  }

  if (receiver.type === 'self') {
    if (!typeScope.selfType) {
      return 'self_type_unknown';
    }
    return 'self_type_lookup_failed';
  }

  if (receiver.type === 'field_expression') {
    return 'field_type_unknown';
  }

  if (receiver.type === 'call_expression' || receiver.type === 'method_call_expression') {
    return 'return_type_unknown';
  }

  return `unsupported_receiver_type: ${receiver.type}`;
}

/**
 * 関数/メソッドからエッジを収集
 */
export function collectEdgesFromFunction(
  node: Parser.SyntaxNode,
  fromId: string,
  filePath: string,
  registry: TypeRegistry,
  implFor?: string
): { edges: CallEdge[]; unresolvedEdges: UnresolvedEdge[] } {
  const edges: CallEdge[] = [];
  const unresolvedEdges: UnresolvedEdge[] = [];

  // スコープ内の型情報を構築
  const typeScope: TypeScope = {
    variables: new Map<string, string>(),
    selfType: implFor,
  };

  // パラメータから型情報を抽出
  extractParameterTypes(node, typeScope);

  // エッジを検索
  findEdgesRecursive(node, fromId, filePath, edges, unresolvedEdges, implFor, typeScope, registry);

  return { edges, unresolvedEdges };
}

/**
 * 関数呼び出しエッジを再帰的に検索
 */
function findEdgesRecursive(
  node: Parser.SyntaxNode,
  fromId: string,
  filePath: string,
  edges: CallEdge[],
  unresolvedEdges: UnresolvedEdge[],
  implFor: string | undefined,
  typeScope: TypeScope,
  registry: TypeRegistry
): void {
  // let宣言を検出して型情報をスコープに追加
  if (node.type === 'let_declaration') {
    processLetDeclaration(node, typeScope, registry);
  }

  if (node.type === 'call_expression') {
    const functionNode = node.childForFieldName('function');
    if (functionNode) {
      // field_expression の場合: receiver.method() パターン
      if (functionNode.type === 'field_expression') {
        const receiver = functionNode.childForFieldName('value');
        const methodNode = functionNode.childForFieldName('field');

        if (receiver && methodNode) {
          const typeName = resolveReceiverType(receiver, typeScope, registry);

          if (typeName) {
            const context = getCallContext(node);
            const edge: CallEdge = {
              from: fromId,
              to: `${typeName}::${methodNode.text}`,
              file: path.basename(filePath),
              line: node.startPosition.row + 1,
            };
            if (context.type !== 'normal') {
              edge.context = context;
            }
            edges.push(edge);
          } else {
            const reason = getUnresolvedReason(receiver, typeScope);
            unresolvedEdges.push({
              from: fromId,
              file: path.basename(filePath),
              line: node.startPosition.row + 1,
              receiver_type: receiver.type,
              receiver_text: receiver.text.substring(0, 50),
              method: methodNode.text,
              reason,
            });
          }
        }
      } else {
        // 通常の関数呼び出し: Type::function() パターン
        let normalized = normalizeCallName(functionNode.text);
        // Self:: を実際の型名に置換
        if (implFor && normalized.startsWith('Self::')) {
          normalized = normalized.replace('Self::', `${implFor}::`);
        }
        const context = getCallContext(node);
        const edge: CallEdge = {
          from: fromId,
          to: normalized,
          file: path.basename(filePath),
          line: node.startPosition.row + 1,
        };
        if (context.type !== 'normal') {
          edge.context = context;
        }
        edges.push(edge);
      }
    }
  } else if (node.type === 'method_call_expression') {
    const methodNode = node.childForFieldName('method');
    const receiver = node.childForFieldName('receiver');

    if (methodNode && receiver) {
      const typeName = resolveReceiverType(receiver, typeScope, registry);

      if (typeName) {
        const context = getCallContext(node);
        const edge: CallEdge = {
          from: fromId,
          to: `${typeName}::${methodNode.text}`,
          file: path.basename(filePath),
          line: node.startPosition.row + 1,
        };
        if (context.type !== 'normal') {
          edge.context = context;
        }
        edges.push(edge);
      } else {
        const reason = getUnresolvedReason(receiver, typeScope);
        unresolvedEdges.push({
          from: fromId,
          file: path.basename(filePath),
          line: node.startPosition.row + 1,
          receiver_type: receiver.type,
          receiver_text: receiver.text.substring(0, 50),
          method: methodNode.text,
          reason,
        });
      }
    }
  }

  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) {
      findEdgesRecursive(child, fromId, filePath, edges, unresolvedEdges, implFor, typeScope, registry);
    }
  }
}
