import type Parser from 'tree-sitter';
import type { TypeScope, ExtractedItem } from '../../types/index.js';
import type { TypeRegistry } from '../../core/TypeRegistry.js';

/**
 * パターンから変数名を抽出
 */
export function extractPatternName(pattern: Parser.SyntaxNode): string | null {
  if (pattern.type === 'identifier') {
    return pattern.text;
  }
  if (pattern.type === 'mut_pattern') {
    const inner = pattern.childForFieldName('pattern') || pattern.child(1);
    return inner?.text ?? null;
  }
  return null;
}

/**
 * 参照型から基本型名を抽出
 * "&mut FrontendEventLog" → "FrontendEventLog"
 * "&BattleContext" → "BattleContext"
 * "Vec<Unit>" → "Vec"
 */
export function extractBaseTypeName(typeText: string): string {
  let cleaned = typeText
    .replace(/^&mut\s+/, '')
    .replace(/^&\s*/, '')
    .trim();

  const genericStart = cleaned.indexOf('<');
  if (genericStart !== -1) {
    cleaned = cleaned.substring(0, genericStart);
  }

  return cleaned;
}

/**
 * シグネチャから戻り値型を抽出
 * "fn foo() -> Bar" → "Bar"
 * "fn foo()" → null
 */
export function extractReturnTypeFromSignature(signature: string): string | null {
  const match = signature.match(/->\s*(.+)$/);
  if (match) {
    return extractBaseTypeName(match[1].trim());
  }
  return null;
}

/**
 * 関数パラメータから型情報を抽出してTypeScopeに追加
 */
export function extractParameterTypes(funcNode: Parser.SyntaxNode, typeScope: TypeScope): void {
  const parameters = funcNode.childForFieldName('parameters');
  if (!parameters) {
    return;
  }

  for (let i = 0; i < parameters.childCount; i++) {
    const param = parameters.child(i);
    if (param?.type !== 'parameter') continue;

    const pattern = param.childForFieldName('pattern');
    const type = param.childForFieldName('type');

    if (pattern && type) {
      const paramName = extractPatternName(pattern);
      const typeName = extractBaseTypeName(type.text);
      if (paramName && typeName) {
        typeScope.variables.set(paramName, typeName);
      }
    }
  }
}

/**
 * let宣言から型情報を抽出してスコープに追加
 */
export function processLetDeclaration(
  node: Parser.SyntaxNode,
  typeScope: TypeScope,
  registry: TypeRegistry
): void {
  const pattern = node.childForFieldName('pattern');
  const typeAnnotation = node.childForFieldName('type');
  const value = node.childForFieldName('value');

  const varName = pattern ? extractPatternName(pattern) : null;
  if (!varName) return;

  // 1. 明示的な型注釈がある場合
  if (typeAnnotation) {
    typeScope.variables.set(varName, extractBaseTypeName(typeAnnotation.text));
    return;
  }

  // 2. Type::new() パターンから推測
  if (value?.type === 'call_expression') {
    const func = value.childForFieldName('function');
    if (func && func.text.includes('::')) {
      const parts = func.text.split('::');
      if (parts.length >= 2) {
        typeScope.variables.set(varName, parts[parts.length - 2]);
      }
    }
  }

  // 3. 関数呼び出しの戻り値から型を推測（registryを使用）
  if (value?.type === 'call_expression') {
    const func = value.childForFieldName('function');
    if (func && func.text.includes('::')) {
      const parts = func.text.split('::');
      if (parts.length >= 2) {
        const typeName = parts[parts.length - 2];
        const methodName = parts[parts.length - 1];
        const returnType = registry.getReturnType(typeName, methodName);
        if (returnType) {
          typeScope.variables.set(varName, returnType);
        }
      }
    }
  }
}

/**
 * レシーバーの型を解決
 */
export function resolveReceiverType(
  receiver: Parser.SyntaxNode,
  typeScope: TypeScope | undefined,
  registry: TypeRegistry
): string | null {
  // 1. 単純な変数名
  if (receiver.type === 'identifier' && typeScope) {
    return typeScope.variables.get(receiver.text) ?? null;
  }

  // 2. self
  if (receiver.type === 'self' && typeScope?.selfType) {
    return typeScope.selfType;
  }

  // 3. self.field (field_expression)
  if (receiver.type === 'field_expression') {
    const value = receiver.childForFieldName('value');
    const field = receiver.childForFieldName('field');

    if (value?.type === 'self' && field && typeScope?.selfType) {
      return registry.getFieldType(typeScope.selfType, field.text);
    }

    // 変数.field の場合
    if (value?.type === 'identifier' && field && typeScope) {
      const varType = typeScope.variables.get(value.text);
      if (varType) {
        return registry.getFieldType(varType, field.text);
      }
    }
  }

  // 4. foo().method() (call_expression) - 戻り値型の解決
  if (receiver.type === 'call_expression') {
    const func = receiver.childForFieldName('function');
    if (func && func.text.includes('::')) {
      const parts = func.text.split('::');
      if (parts.length >= 2) {
        const typeName = parts[parts.length - 2];
        const methodName = parts[parts.length - 1];
        return registry.getReturnType(typeName, methodName);
      }
    }
  }

  // 5. method_call_expression のレシーバー（チェーン呼び出し）
  if (receiver.type === 'method_call_expression') {
    const innerReceiver = receiver.childForFieldName('receiver');
    const method = receiver.childForFieldName('method');

    if (innerReceiver && method) {
      const innerType = resolveReceiverType(innerReceiver, typeScope, registry);
      if (innerType) {
        return registry.getReturnType(innerType, method.text);
      }
    }
  }

  return null;
}

/**
 * 全ファイルから型情報を収集してregistryに登録
 */
export function collectTypeInfo(items: ExtractedItem[], registry: TypeRegistry): void {
  for (const item of items) {
    // 構造体フィールドを登録
    if (item.type === 'struct' && item.fields) {
      for (const field of item.fields) {
        const fieldType = extractBaseTypeName(field.type);
        registry.registerStructField(item.name, field.name, fieldType);
      }
    }

    // 関数/メソッドの戻り値型を登録
    if (item.type === 'function' || item.type === 'method') {
      const returnType = extractReturnTypeFromSignature(item.signature);
      if (returnType) {
        const typeName = item.impl_for ?? '';
        registry.registerReturnType(typeName, item.name, returnType);
      }
    }
  }
}
