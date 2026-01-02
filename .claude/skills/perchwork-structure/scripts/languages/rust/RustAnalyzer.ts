import Parser, { Language } from 'tree-sitter';
import Rust from 'tree-sitter-rust';
import path from 'path';
import type { LanguageAnalyzer } from '../index.js';
import type { ExtractedItem, TestInfo, CallEdge, UnresolvedEdge } from '../../types/index.js';
import type { TypeRegistry } from '../../core/TypeRegistry.js';
import {
  extractFunction,
  extractStruct,
  extractEnum,
  extractTrait,
  extractImpl,
  isInsideImplBlock,
  hasTestAttribute,
} from './extractors.js';
import { collectTypeInfo } from './typeResolver.js';
import { collectEdgesFromFunction } from './edgeFinder.js';

/**
 * Rust言語の解析器
 */
export class RustAnalyzer implements LanguageAnalyzer {
  readonly languageId = 'rust';
  readonly extensions = ['.rs'];

  private parser!: Parser;

  /**
   * パーサーを初期化
   */
  initialize(): void {
    this.parser = new Parser();
    this.parser.setLanguage(Rust as unknown as Language);
  }

  /**
   * Pass 1: アイテムを抽出
   */
  extractItems(
    fileContent: string,
    filePath: string
  ): { items: ExtractedItem[]; tests: TestInfo[] } {
    const tree = this.parser.parse(fileContent);
    const items: ExtractedItem[] = [];
    const tests: TestInfo[] = [];

    this.extractItemsRecursive(tree.rootNode, filePath, fileContent, items, tests);

    return { items, tests };
  }

  /**
   * 型情報を収集
   */
  collectTypeInfo(items: ExtractedItem[], registry: TypeRegistry): void {
    collectTypeInfo(items, registry);
  }

  /**
   * Pass 2: エッジを抽出
   */
  findEdges(
    fileContent: string,
    filePath: string,
    items: ExtractedItem[],
    registry: TypeRegistry
  ): { edges: CallEdge[]; unresolvedEdges: UnresolvedEdge[] } {
    const tree = this.parser.parse(fileContent);
    const edges: CallEdge[] = [];
    const unresolvedEdges: UnresolvedEdge[] = [];

    this.findEdgesRecursive(tree.rootNode, filePath, fileContent, edges, unresolvedEdges, registry);

    return { edges, unresolvedEdges };
  }

  /**
   * ASTノードから構造を抽出（再帰的）
   */
  private extractItemsRecursive(
    node: Parser.SyntaxNode,
    filePath: string,
    fileContent: string,
    items: ExtractedItem[],
    tests: TestInfo[]
  ): void {
    if (node.type === 'function_item') {
      // impl内の関数はextractImplで処理されるためスキップ
      if (!isInsideImplBlock(node)) {
        const result = extractFunction(node, filePath, fileContent);
        if (result.item) items.push(result.item);
        if (result.test) tests.push(result.test);
      }
    } else if (node.type === 'struct_item') {
      const item = extractStruct(node, filePath, fileContent);
      if (item) items.push(item);
    } else if (node.type === 'enum_item') {
      const item = extractEnum(node, filePath, fileContent);
      if (item) items.push(item);
    } else if (node.type === 'trait_item') {
      const item = extractTrait(node, filePath, fileContent);
      if (item) items.push(item);
    } else if (node.type === 'impl_item') {
      const implItems = extractImpl(node, filePath, fileContent);
      items.push(...implItems);
    }

    // 子ノードを再帰的に処理
    for (let i = 0; i < node.childCount; i++) {
      this.extractItemsRecursive(node.child(i)!, filePath, fileContent, items, tests);
    }
  }

  /**
   * エッジを再帰的に検索
   */
  private findEdgesRecursive(
    node: Parser.SyntaxNode,
    filePath: string,
    fileContent: string,
    edges: CallEdge[],
    unresolvedEdges: UnresolvedEdge[],
    registry: TypeRegistry
  ): void {
    const fileName = path.basename(filePath).replace(/\.rs$/, '');

    if (node.type === 'function_item') {
      if (!isInsideImplBlock(node)) {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          const name = nameNode.text;
          const isTest = hasTestAttribute(node);
          const itemId = isTest ? `${fileName}::${name}::test` : `${fileName}::${name}::function`;
          const result = collectEdgesFromFunction(node, itemId, filePath, registry);
          edges.push(...result.edges);
          unresolvedEdges.push(...result.unresolvedEdges);
        }
      }
    } else if (node.type === 'impl_item') {
      const typeNode = node.childForFieldName('type');
      if (typeNode) {
        const implFor = typeNode.text;
        const bodyNode = node.childForFieldName('body');
        if (bodyNode) {
          for (let i = 0; i < bodyNode.childCount; i++) {
            const child = bodyNode.child(i);
            if (child && child.type === 'function_item') {
              const methodNameNode = child.childForFieldName('name');
              if (methodNameNode) {
                const methodName = methodNameNode.text;
                const methodId = `${fileName}::${implFor}::${methodName}::method`;
                const result = collectEdgesFromFunction(child, methodId, filePath, registry, implFor);
                edges.push(...result.edges);
                unresolvedEdges.push(...result.unresolvedEdges);
              }
            }
          }
        }
      }
      return; // impl内は上で処理済み
    }

    // 子ノードを再帰的に処理
    for (let i = 0; i < node.childCount; i++) {
      this.findEdgesRecursive(node.child(i)!, filePath, fileContent, edges, unresolvedEdges, registry);
    }
  }
}
