import type Parser from 'tree-sitter';
import path from 'path';
import type { ExtractedItem, TestInfo, FieldInfo } from '../../types/index.js';

/**
 * Visibility を抽出
 */
export function extractVisibility(node: Parser.SyntaxNode): 'pub' | 'pub(crate)' | 'private' {
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child && child.type === 'visibility_modifier') {
      const text = child.text;
      if (text === 'pub(crate)') return 'pub(crate)';
      if (text.startsWith('pub')) return 'pub';
    }
  }
  return 'private';
}

/**
 * シグネチャを抽出（複数行の場合は簡略化）
 */
export function extractSignature(node: Parser.SyntaxNode, fileContent: string): string {
  const startLine = node.startPosition.row;
  const endLine = node.endPosition.row;

  // ボディの開始位置を探す
  let bodyStartLine = endLine;
  let bodyStartColumn = 0;
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child && child.type === 'block') {
      bodyStartLine = child.startPosition.row;
      bodyStartColumn = child.startPosition.column;
      break;
    }
  }

  const lines = fileContent.split('\n');

  // シグネチャと{が同じ行にある場合
  if (startLine === bodyStartLine) {
    const line = lines[startLine];
    const signaturePart = line.substring(0, bodyStartColumn).trimStart().trimEnd();
    return signaturePart;
  }

  // 複数行シグネチャの場合
  const signatureLines = lines.slice(startLine, bodyStartLine + 1);
  const trimmedLines = signatureLines.map((line, index) => {
    const trimmed = line.trimStart();
    if (index === signatureLines.length - 1) {
      const braceIndex = trimmed.indexOf('{');
      if (braceIndex !== -1) {
        return trimmed.substring(0, braceIndex).trimEnd();
      }
    }
    return trimmed;
  });

  return trimmedLines.join('\n').trim();
}

/**
 * async 関数かチェック
 */
export function isAsync(node: Parser.SyntaxNode): boolean {
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child && child.type === 'async' && child.text === 'async') {
      return true;
    }
  }
  return false;
}

/**
 * テストアトリビュートを持つかチェック
 */
export function hasTestAttribute(node: Parser.SyntaxNode): boolean {
  let prev = node.previousSibling;
  while (prev) {
    if (prev.type === 'attribute_item') {
      const text = prev.text;
      if (
        text.includes('#[test]') ||
        text.includes('#[tokio::test]') ||
        text.includes('#[test_case')
      ) {
        return true;
      }
    } else if (prev.type !== 'line_comment' && prev.type !== 'block_comment') {
      break;
    }
    prev = prev.previousSibling;
  }
  return false;
}

/**
 * 構造体のフィールドを抽出
 */
export function extractFields(node: Parser.SyntaxNode): FieldInfo[] {
  const fields: FieldInfo[] = [];
  const bodyNode = node.childForFieldName('body');

  if (bodyNode) {
    for (let i = 0; i < bodyNode.childCount; i++) {
      const child = bodyNode.child(i);
      if (child && child.type === 'field_declaration') {
        const nameNode = child.childForFieldName('name');
        const typeNode = child.childForFieldName('type');
        if (nameNode) {
          fields.push({
            name: nameNode.text,
            type: typeNode ? typeNode.text : 'unknown',
          });
        }
      }
    }
  }

  return fields;
}

/**
 * enumのバリアントを抽出
 */
export function extractVariants(node: Parser.SyntaxNode): FieldInfo[] {
  const variants: FieldInfo[] = [];
  const bodyNode = node.childForFieldName('body');

  if (bodyNode) {
    for (let i = 0; i < bodyNode.childCount; i++) {
      const child = bodyNode.child(i);
      if (child && child.type === 'enum_variant') {
        const nameNode = child.childForFieldName('name');
        if (nameNode) {
          variants.push({
            name: nameNode.text,
            type: '',
          });
        }
      }
    }
  }

  return variants;
}

/**
 * 関数を抽出
 */
export function extractFunction(
  node: Parser.SyntaxNode,
  filePath: string,
  fileContent: string
): { item?: ExtractedItem; test?: TestInfo } {
  const nameNode = node.childForFieldName('name');
  if (!nameNode) return {};

  const name = nameNode.text;
  const fileName = path.basename(filePath).replace(/\.rs$/, '');
  const isTest = hasTestAttribute(node);

  if (isTest) {
    const testId = `${fileName}::${name}::test`;
    return {
      test: {
        id: testId,
        name,
        line_start: node.startPosition.row + 1,
        is_async: isAsync(node),
      },
    };
  }

  const itemId = `${fileName}::${name}::function`;
  return {
    item: {
      id: itemId,
      type: 'function',
      name,
      line_start: node.startPosition.row + 1,
      line_end: node.endPosition.row + 1,
      visibility: extractVisibility(node),
      signature: extractSignature(node, fileContent),
      is_async: isAsync(node),
    },
  };
}

/**
 * 構造体を抽出
 */
export function extractStruct(
  node: Parser.SyntaxNode,
  filePath: string,
  fileContent: string
): ExtractedItem | null {
  const nameNode = node.childForFieldName('name');
  if (!nameNode) return null;

  const name = nameNode.text;
  const fileName = path.basename(filePath).replace(/\.rs$/, '');

  return {
    id: `${fileName}::${name}::struct`,
    type: 'struct',
    name,
    line_start: node.startPosition.row + 1,
    line_end: node.endPosition.row + 1,
    visibility: extractVisibility(node),
    signature: extractSignature(node, fileContent),
    fields: extractFields(node),
  };
}

/**
 * enumを抽出
 */
export function extractEnum(
  node: Parser.SyntaxNode,
  filePath: string,
  fileContent: string
): ExtractedItem | null {
  const nameNode = node.childForFieldName('name');
  if (!nameNode) return null;

  const name = nameNode.text;
  const fileName = path.basename(filePath).replace(/\.rs$/, '');

  return {
    id: `${fileName}::${name}::enum`,
    type: 'enum',
    name,
    line_start: node.startPosition.row + 1,
    line_end: node.endPosition.row + 1,
    visibility: extractVisibility(node),
    signature: extractSignature(node, fileContent),
    fields: extractVariants(node),
  };
}

/**
 * traitを抽出
 */
export function extractTrait(
  node: Parser.SyntaxNode,
  filePath: string,
  fileContent: string
): ExtractedItem | null {
  const nameNode = node.childForFieldName('name');
  if (!nameNode) return null;

  const name = nameNode.text;
  const fileName = path.basename(filePath).replace(/\.rs$/, '');

  return {
    id: `${fileName}::${name}::trait`,
    type: 'trait',
    name,
    line_start: node.startPosition.row + 1,
    line_end: node.endPosition.row + 1,
    visibility: extractVisibility(node),
    signature: extractSignature(node, fileContent),
  };
}

/**
 * implブロックからメソッドを抽出
 */
export function extractImpl(
  node: Parser.SyntaxNode,
  filePath: string,
  fileContent: string
): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  const typeNode = node.childForFieldName('type');
  if (!typeNode) return items;

  const implFor = typeNode.text;
  const fileName = path.basename(filePath).replace(/\.rs$/, '');
  const traitNode = node.childForFieldName('trait');
  const traitName = traitNode ? traitNode.text : undefined;

  const bodyNode = node.childForFieldName('body');
  if (bodyNode) {
    for (let i = 0; i < bodyNode.childCount; i++) {
      const child = bodyNode.child(i);
      if (child && child.type === 'function_item') {
        const methodNameNode = child.childForFieldName('name');
        if (!methodNameNode) continue;

        const methodName = methodNameNode.text;
        const methodId = `${fileName}::${implFor}::${methodName}::method`;

        items.push({
          id: methodId,
          type: 'method',
          name: methodName,
          line_start: child.startPosition.row + 1,
          line_end: child.endPosition.row + 1,
          visibility: extractVisibility(child),
          signature: extractSignature(child, fileContent),
          is_async: isAsync(child),
          impl_for: implFor,
          trait_name: traitName,
        });
      }
    }
  }

  return items;
}

/**
 * ノードがimplブロック内にあるかチェック
 */
export function isInsideImplBlock(node: Parser.SyntaxNode): boolean {
  let current = node.parent;
  while (current) {
    if (current.type === 'declaration_list') {
      const parent = current.parent;
      if (parent && parent.type === 'impl_item') {
        return true;
      }
    }
    current = current.parent;
  }
  return false;
}
