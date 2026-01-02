#!/usr/bin/env node
/**
 * Perchwork Analyzer - Rust コード解析スクリプト
 *
 * tree-sitter のネイティブバインディングを使って Rust コードを解析し、構造化JSONを生成する
 */

import Parser, { Language } from 'tree-sitter';
import Rust from 'tree-sitter-rust';
import fs from 'fs/promises';
import path from 'path';

/**
 * 設定ファイルの型定義
 */
interface Config {
  target_dir: string;
  extensions?: string[];
  exclude?: string[];
}

/**
 * 抽出されたアイテムの型定義
 */
interface FieldInfo {
  name: string;
  type: string;
}

interface ExtractedItem {
  id: string;
  type: 'struct' | 'enum' | 'trait' | 'impl' | 'function' | 'method';
  name: string;
  line_start: number;
  line_end: number;
  visibility: 'pub' | 'pub(crate)' | 'private';
  signature: string;
  fields?: FieldInfo[];
  is_async?: boolean;
  impl_for?: string;
  trait_name?: string;
}

/**
 * テスト情報の型定義
 */
interface TestInfo {
  id: string;
  name: string;
  line_start: number;
  is_async: boolean;
}

/**
 * 呼び出しコンテキスト（制御構造情報）
 */
interface CallContext {
  type: 'normal' | 'if' | 'else' | 'match_arm' | 'loop' | 'while' | 'for';
  condition?: string;    // if/while の条件式
  arm_pattern?: string;  // match のパターン
}

/**
 * コールグラフのエッジ
 */
interface CallEdge {
  from: string;
  to: string;
  file: string;
  line: number;
  context?: CallContext;
}

/**
 * 未解決エッジ（型解決に失敗した呼び出し）
 */
interface UnresolvedEdge {
  from: string;
  file: string;
  line: number;
  receiver_type: string;      // レシーバーのノードタイプ（identifier, field_expression等）
  receiver_text: string;      // レシーバーのテキスト
  method: string;             // メソッド名
  reason: string;             // 解決失敗の理由
}

/**
 * ファイル単位の解析結果
 */
interface FileAnalysis {
  path: string;
  items: ExtractedItem[];
  tests: TestInfo[];
  edges: CallEdge[];
  unresolvedEdges: UnresolvedEdge[];
}

/**
 * スコープ内の型情報
 */
interface TypeScope {
  variables: Map<string, string>;  // 変数名 → 型名
  selfType?: string;               // impl内のself型
}

/**
 * 型情報を保持するレジストリ
 */
class TypeRegistry {
  // 構造体フィールド: "StructName::field_name" → "FieldType"
  private structFields: Map<string, string> = new Map();

  // 関数/メソッド戻り値: "TypeName::method_name" → "ReturnType"
  private returnTypes: Map<string, string> = new Map();

  /**
   * 構造体フィールドを登録
   */
  registerStructField(structName: string, fieldName: string, fieldType: string): void {
    const key = `${structName}::${fieldName}`;
    this.structFields.set(key, fieldType);
  }

  /**
   * 関数/メソッドの戻り値型を登録
   */
  registerReturnType(typeName: string, methodName: string, returnType: string): void {
    const key = `${typeName}::${methodName}`;
    this.returnTypes.set(key, returnType);
  }

  /**
   * 構造体フィールドの型を取得
   */
  getFieldType(structName: string, fieldName: string): string | null {
    const key = `${structName}::${fieldName}`;
    return this.structFields.get(key) ?? null;
  }

  /**
   * 関数/メソッドの戻り値型を取得
   */
  getReturnType(typeName: string, methodName: string): string | null {
    const key = `${typeName}::${methodName}`;
    return this.returnTypes.get(key) ?? null;
  }

  /**
   * デバッグ出力用: 登録済みの型情報を取得
   */
  toDebugObject(): { structFields: Record<string, string>; returnTypes: Record<string, string> } {
    return {
      structFields: Object.fromEntries(this.structFields),
      returnTypes: Object.fromEntries(this.returnTypes),
    };
  }
}

/**
 * メイン処理クラス
 */
class PerchworkAnalyzer {
  private config!: Config;
  private configPath!: string;
  private parser: Parser;
  private registry: TypeRegistry = new TypeRegistry();

  constructor() {
    this.parser = new Parser();
    this.parser.setLanguage(Rust as unknown as Language);
  }

  /**
   * 設定ファイルを読み込む
   */
  private async loadConfig(configPath: string): Promise<void> {
    console.log(`設定ファイルを読み込んでいます: ${configPath}`);
    this.configPath = path.resolve(configPath);

    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      this.config = JSON.parse(configContent) as Config;

      // 相対パスを絶対パスに変換（設定ファイルの場所を基準とする）
      const configDir = path.dirname(path.resolve(configPath));
      this.config.target_dir = path.resolve(configDir, this.config.target_dir);

      console.log(`対象ディレクトリ: ${this.config.target_dir}`);
    } catch (error) {
      throw new Error(`設定ファイルの読み込みに失敗しました: ${configPath} - ${error}`);
    }
  }

  /**
   * 対象ファイルを収集する（再帰的）
   */
  private async collectTargetFiles(): Promise<string[]> {
    console.log('対象ファイルを収集しています...');

    const targetDir = this.config.target_dir;
    const extensions = this.config.extensions || ['.rs'];
    const excludePatterns = this.config.exclude || [];
    const targetFiles: string[] = [];

    // 再帰的にファイルを収集
    await this.walkDirectory(targetDir, targetFiles, extensions, excludePatterns);

    console.log(`収集完了: ${targetFiles.length} ファイル`);

    return targetFiles;
  }

  /**
   * ディレクトリを再帰的に走査してファイルを収集
   */
  private async walkDirectory(
    dir: string,
    files: string[],
    extensions: string[],
    excludePatterns: string[]
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // exclude パターンにマッチする場合はスキップ
        if (this.shouldExclude(fullPath, excludePatterns)) {
          continue;
        }

        if (entry.isDirectory()) {
          await this.walkDirectory(fullPath, files, extensions, excludePatterns);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`ディレクトリの読み込みに失敗しました: ${dir} - ${error}`);
    }
  }

  /**
   * exclude パターンにマッチするかチェック
   */
  private shouldExclude(filePath: string, excludePatterns: string[]): boolean {
    for (const pattern of excludePatterns) {
      // 簡易的なパターンマッチング（**/tests/** 形式に対応）
      if (pattern.includes('**/')) {
        const regex = pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
        if (new RegExp(regex).test(filePath)) {
          return true;
        }
      } else if (pattern.includes('*')) {
        const regex = pattern.replace(/\*/g, '.*');
        if (new RegExp(regex).test(path.basename(filePath))) {
          return true;
        }
      } else if (filePath.includes(pattern)) {
        return true;
      }
    }
    return false;
  }

  /**
   * ファイルをパースして構造を抽出
   * @param skipEdges trueの場合、エッジ収集をスキップ（パス1用）
   */
  private async parseFile(filePath: string, skipEdges: boolean = false): Promise<FileAnalysis> {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const tree = this.parser.parse(fileContent);

    const items: ExtractedItem[] = [];
    const tests: TestInfo[] = [];
    const edges: CallEdge[] = [];
    const unresolvedEdges: UnresolvedEdge[] = [];

    // ルートノードから探索
    this.extractItems(tree.rootNode, filePath, fileContent, items, tests, edges, unresolvedEdges, skipEdges);

    return {
      path: filePath,
      items,
      tests,
      edges,
      unresolvedEdges,
    };
  }

  /**
   * ASTノードから構造を抽出（再帰的）
   * @param skipEdges trueの場合、エッジ収集をスキップ
   */
  private extractItems(
    node: Parser.SyntaxNode,
    filePath: string,
    fileContent: string,
    items: ExtractedItem[],
    tests: TestInfo[],
    edges: CallEdge[],
    unresolvedEdges: UnresolvedEdge[],
    skipEdges: boolean = false
  ): void {
    // 現在のノードの処理
    if (node.type === 'function_item') {
      // impl_item内の関数は extractImpl で既にメソッドとして処理されているため、
      // トップレベルまたは他のコンテキストの関数のみを処理する
      if (!this.isInsideImplBlock(node)) {
        this.extractFunction(node, filePath, fileContent, items, tests, edges, unresolvedEdges, skipEdges);
      }
    } else if (node.type === 'struct_item') {
      this.extractStruct(node, filePath, fileContent, items);
    } else if (node.type === 'enum_item') {
      this.extractEnum(node, filePath, fileContent, items);
    } else if (node.type === 'trait_item') {
      this.extractTrait(node, filePath, fileContent, items);
    } else if (node.type === 'impl_item') {
      this.extractImpl(node, filePath, fileContent, items, edges, unresolvedEdges, skipEdges);
    }

    // 子ノードを再帰的に処理
    for (let i = 0; i < node.childCount; i++) {
      this.extractItems(node.child(i)!, filePath, fileContent, items, tests, edges, unresolvedEdges, skipEdges);
    }
  }

  /**
   * ノードがimplブロック内にあるかチェック
   */
  private isInsideImplBlock(node: Parser.SyntaxNode): boolean {
    let current = node.parent;
    while (current) {
      if (current.type === 'declaration_list') {
        // declaration_list の親が impl_item かチェック
        const parent = current.parent;
        if (parent && parent.type === 'impl_item') {
          return true;
        }
      }
      current = current.parent;
    }
    return false;
  }

  /**
   * 関数を抽出
   * @param skipEdges trueの場合、エッジ収集をスキップ
   */
  private extractFunction(
    node: Parser.SyntaxNode,
    filePath: string,
    fileContent: string,
    items: ExtractedItem[],
    tests: TestInfo[],
    edges: CallEdge[],
    unresolvedEdges: UnresolvedEdge[],
    skipEdges: boolean = false
  ): void {
    const nameNode = node.childForFieldName('name');
    if (!nameNode) return;

    const name = nameNode.text;
    const fileName = path.basename(filePath).replace(/\.rs$/, '');

    // テスト関数かチェック
    const isTest = this.hasTestAttribute(node);

    if (isTest) {
      // テスト関数として抽出
      const testId = `${fileName}::${name}::test`;
      const testInfo: TestInfo = {
        id: testId,
        name,
        line_start: node.startPosition.row + 1,
        is_async: this.isAsync(node),
      };
      tests.push(testInfo);

      // エッジを収集（skipEdgesがfalseの場合のみ）
      if (!skipEdges) {
        this.collectEdges(node, testId, filePath, edges, unresolvedEdges);
      }
    } else {
      // 通常の関数として抽出
      const itemId = `${fileName}::${name}::function`;
      const item: ExtractedItem = {
        id: itemId,
        type: 'function',
        name,
        line_start: node.startPosition.row + 1,
        line_end: node.endPosition.row + 1,
        visibility: this.extractVisibility(node),
        signature: this.extractSignature(node, fileContent),
        is_async: this.isAsync(node),
      };
      items.push(item);

      // エッジを収集（skipEdgesがfalseの場合のみ）
      if (!skipEdges) {
        this.collectEdges(node, itemId, filePath, edges, unresolvedEdges);
      }
    }
  }

  /**
   * 構造体を抽出
   */
  private extractStruct(
    node: Parser.SyntaxNode,
    filePath: string,
    fileContent: string,
    items: ExtractedItem[]
  ): void {
    const nameNode = node.childForFieldName('name');
    if (!nameNode) return;

    const name = nameNode.text;
    const fileName = path.basename(filePath).replace(/\.rs$/, '');

    const item: ExtractedItem = {
      id: `${fileName}::${name}::struct`,
      type: 'struct',
      name,
      line_start: node.startPosition.row + 1,
      line_end: node.endPosition.row + 1,
      visibility: this.extractVisibility(node),
      signature: this.extractSignature(node, fileContent),
      fields: this.extractFields(node),
    };
    items.push(item);
  }

  /**
   * enumを抽出
   */
  private extractEnum(
    node: Parser.SyntaxNode,
    filePath: string,
    fileContent: string,
    items: ExtractedItem[]
  ): void {
    const nameNode = node.childForFieldName('name');
    if (!nameNode) return;

    const name = nameNode.text;
    const fileName = path.basename(filePath).replace(/\.rs$/, '');

    const item: ExtractedItem = {
      id: `${fileName}::${name}::enum`,
      type: 'enum',
      name,
      line_start: node.startPosition.row + 1,
      line_end: node.endPosition.row + 1,
      visibility: this.extractVisibility(node),
      signature: this.extractSignature(node, fileContent),
      fields: this.extractVariants(node),
    };
    items.push(item);
  }

  /**
   * traitを抽出
   */
  private extractTrait(
    node: Parser.SyntaxNode,
    filePath: string,
    fileContent: string,
    items: ExtractedItem[]
  ): void {
    const nameNode = node.childForFieldName('name');
    if (!nameNode) return;

    const name = nameNode.text;
    const fileName = path.basename(filePath).replace(/\.rs$/, '');

    const item: ExtractedItem = {
      id: `${fileName}::${name}::trait`,
      type: 'trait',
      name,
      line_start: node.startPosition.row + 1,
      line_end: node.endPosition.row + 1,
      visibility: this.extractVisibility(node),
      signature: this.extractSignature(node, fileContent),
    };
    items.push(item);
  }

  /**
   * implブロックを抽出
   * @param skipEdges trueの場合、エッジ収集をスキップ
   */
  private extractImpl(
    node: Parser.SyntaxNode,
    filePath: string,
    fileContent: string,
    items: ExtractedItem[],
    edges: CallEdge[],
    unresolvedEdges: UnresolvedEdge[],
    skipEdges: boolean = false
  ): void {
    const typeNode = node.childForFieldName('type');
    if (!typeNode) return;

    const implFor = typeNode.text;
    const fileName = path.basename(filePath).replace(/\.rs$/, '');

    // traitの実装かチェック
    const traitNode = node.childForFieldName('trait');
    const traitName = traitNode ? traitNode.text : undefined;

    // implブロック内のメソッドを抽出
    const bodyNode = node.childForFieldName('body');
    if (bodyNode) {
      for (let i = 0; i < bodyNode.childCount; i++) {
        const child = bodyNode.child(i);
        if (child && child.type === 'function_item') {
          const methodNameNode = child.childForFieldName('name');
          if (!methodNameNode) continue;

          const methodName = methodNameNode.text;
          const methodId = `${fileName}::${implFor}::${methodName}::method`;

          const item: ExtractedItem = {
            id: methodId,
            type: 'method',
            name: methodName,
            line_start: child.startPosition.row + 1,
            line_end: child.endPosition.row + 1,
            visibility: this.extractVisibility(child),
            signature: this.extractSignature(child, fileContent),
            is_async: this.isAsync(child),
            impl_for: implFor,
            trait_name: traitName,
          };
          items.push(item);

          // エッジを収集（skipEdgesがfalseの場合のみ）
          if (!skipEdges) {
            this.collectEdges(child, methodId, filePath, edges, unresolvedEdges, implFor);
          }
        }
      }
    }
  }

  /**
   * visibilityを抽出
   */
  private extractVisibility(node: Parser.SyntaxNode): 'pub' | 'pub(crate)' | 'private' {
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
  private extractSignature(node: Parser.SyntaxNode, fileContent: string): string {
    const startLine = node.startPosition.row;
    const endLine = node.endPosition.row;

    // ボディの開始位置を探す（{の位置）
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

    // シグネチャと{が同じ行にある場合（1行シグネチャ）
    if (startLine === bodyStartLine) {
      const line = lines[startLine];
      // {の直前までを抽出
      const signaturePart = line.substring(0, bodyStartColumn).trimStart().trimEnd();
      return signaturePart;
    }

    // 複数行シグネチャの場合
    // bodyStartLineを含めて取得し、{以降を除去する
    const signatureLines = lines.slice(startLine, bodyStartLine + 1);

    // 各行のインデントを除去
    const trimmedLines = signatureLines.map((line, index) => {
      const trimmed = line.trimStart();
      // 最後の行の場合、{以降を除去
      if (index === signatureLines.length - 1) {
        const braceIndex = trimmed.indexOf('{');
        if (braceIndex !== -1) {
          return trimmed.substring(0, braceIndex).trimEnd();
        }
      }
      return trimmed;
    });

    const signature = trimmedLines.join('\n').trim();

    return signature;
  }

  /**
   * 構造体のフィールドを抽出（名前と型）
   */
  private extractFields(node: Parser.SyntaxNode): FieldInfo[] {
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
  private extractVariants(node: Parser.SyntaxNode): FieldInfo[] {
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
              type: '',  // enumバリアントには型なし
            });
          }
        }
      }
    }

    return variants;
  }

  /**
   * 関数呼び出しエッジを収集
   * @param implFor メソッドが属する型名（Self::を置換するため）
   */
  private collectEdges(
    node: Parser.SyntaxNode,
    fromId: string,
    filePath: string,
    edges: CallEdge[],
    unresolvedEdges: UnresolvedEdge[],
    implFor?: string
  ): void {
    // スコープ内の型情報を構築
    const typeScope: TypeScope = {
      variables: new Map<string, string>(),
      selfType: implFor,
    };

    // パラメータから型情報を抽出
    this.extractParameterTypes(node, typeScope);

    // エッジを検索
    this.findEdges(node, fromId, filePath, edges, unresolvedEdges, implFor, typeScope);
  }

  /**
   * 関数パラメータから型情報を抽出してTypeScopeに追加
   */
  private extractParameterTypes(funcNode: Parser.SyntaxNode, typeScope: TypeScope): void {
    const parameters = funcNode.childForFieldName('parameters');
    if (!parameters) {
      // console.log('[DEBUG] No parameters found');
      return;
    }

    for (let i = 0; i < parameters.childCount; i++) {
      const param = parameters.child(i);
      if (param?.type !== 'parameter') continue;

      const pattern = param.childForFieldName('pattern');
      const type = param.childForFieldName('type');

      if (pattern && type) {
        const paramName = this.extractPatternName(pattern);
        const typeName = this.extractBaseTypeName(type.text);
        if (paramName && typeName) {
          typeScope.variables.set(paramName, typeName);
        }
      }
    }
  }

  /**
   * パターンから変数名を抽出
   */
  private extractPatternName(pattern: Parser.SyntaxNode): string | null {
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
   * 関数呼び出しエッジを再帰的に検索
   * @param implFor メソッドが属する型名（Self::を置換するため）
   * @param typeScope スコープ内の型情報
   */
  private findEdges(
    node: Parser.SyntaxNode,
    fromId: string,
    filePath: string,
    edges: CallEdge[],
    unresolvedEdges: UnresolvedEdge[],
    implFor?: string,
    typeScope?: TypeScope
  ): void {
    // let宣言を検出して型情報をスコープに追加
    if (node.type === 'let_declaration' && typeScope) {
      this.processLetDeclaration(node, typeScope);
    }

    if (node.type === 'call_expression') {
      const functionNode = node.childForFieldName('function');
      if (functionNode) {
        // field_expression の場合: receiver.method() パターン
        if (functionNode.type === 'field_expression') {
          const receiver = functionNode.childForFieldName('value');
          const methodNode = functionNode.childForFieldName('field');

          if (receiver && methodNode) {
            // レシーバーの型を解決
            const typeName = this.resolveReceiverType(receiver, typeScope);

            if (typeName) {
              const context = this.getCallContext(node);
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
              // 未解決エッジとして記録
              const reason = this.getUnresolvedReason(receiver, typeScope);
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
          // 改行や余分な空白を除去して正規化
          let normalized = this.normalizeCallName(functionNode.text);
          // Self:: を実際の型名に置換
          if (implFor && normalized.startsWith('Self::')) {
            normalized = normalized.replace('Self::', `${implFor}::`);
          }
          // コンテキスト（制御構造）を取得
          const context = this.getCallContext(node);
          const edge: CallEdge = {
            from: fromId,
            to: normalized,
            file: path.basename(filePath),
            line: node.startPosition.row + 1,
          };
          // normalでない場合のみcontextを追加
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
        // レシーバーの型を解決
        const typeName = this.resolveReceiverType(receiver, typeScope);

        if (typeName) {
          // 型が解決できた場合のみエッジを生成
          const context = this.getCallContext(node);
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
          // 未解決エッジとして記録
          const reason = this.getUnresolvedReason(receiver, typeScope);
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
        this.findEdges(child, fromId, filePath, edges, unresolvedEdges, implFor, typeScope);
      }
    }
  }

  /**
   * 未解決エッジの理由を特定
   */
  private getUnresolvedReason(receiver: Parser.SyntaxNode, typeScope?: TypeScope): string {
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
   * let宣言から型情報を抽出してスコープに追加
   */
  private processLetDeclaration(node: Parser.SyntaxNode, typeScope: TypeScope): void {
    const pattern = node.childForFieldName('pattern');
    const typeAnnotation = node.childForFieldName('type');
    const value = node.childForFieldName('value');

    const varName = pattern ? this.extractPatternName(pattern) : null;
    if (!varName) return;

    // 1. 明示的な型注釈がある場合
    if (typeAnnotation) {
      typeScope.variables.set(varName, this.extractBaseTypeName(typeAnnotation.text));
      return;
    }

    // 2. Type::new() パターンから推測
    if (value?.type === 'call_expression') {
      const func = value.childForFieldName('function');
      if (func && func.text.includes('::')) {
        const parts = func.text.split('::');
        // TypeName::new() → TypeName
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
          const returnType = this.registry.getReturnType(typeName, methodName);
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
  private resolveReceiverType(
    receiver: Parser.SyntaxNode,
    typeScope?: TypeScope
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
        return this.registry.getFieldType(typeScope.selfType, field.text);
      }

      // 変数.field の場合
      if (value?.type === 'identifier' && field && typeScope) {
        const varType = typeScope.variables.get(value.text);
        if (varType) {
          return this.registry.getFieldType(varType, field.text);
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
          return this.registry.getReturnType(typeName, methodName);
        }
      }
    }

    // 5. method_call_expression のレシーバー（チェーン呼び出し）
    if (receiver.type === 'method_call_expression') {
      const innerReceiver = receiver.childForFieldName('receiver');
      const method = receiver.childForFieldName('method');

      if (innerReceiver && method) {
        const innerType = this.resolveReceiverType(innerReceiver, typeScope);
        if (innerType) {
          return this.registry.getReturnType(innerType, method.text);
        }
      }
    }

    return null;
  }

  /**
   * 呼び出し名を正規化（改行と余分な空白を除去）
   */
  private normalizeCallName(text: string): string {
    // 改行を除去し、連続する空白を1つにまとめる
    return text.replace(/\s+/g, ' ').trim();
  }

  /**
   * 呼び出しのコンテキスト（制御構造）を取得
   */
  private getCallContext(node: Parser.SyntaxNode): CallContext {
    let current = node.parent;
    while (current) {
      switch (current.type) {
        case 'if_expression': {
          const condition = current.childForFieldName('condition');
          const consequence = current.childForFieldName('consequence');
          const alternative = current.childForFieldName('alternative');

          // 呼び出しが consequence (then) 内か alternative (else) 内かを判定
          if (consequence && this.isDescendant(node, consequence)) {
            return {
              type: 'if',
              condition: condition ? this.normalizeCallName(condition.text) : undefined
            };
          }
          if (alternative && this.isDescendant(node, alternative)) {
            return {
              type: 'else',
              condition: condition ? this.normalizeCallName(condition.text) : undefined
            };
          }
          break;
        }
        case 'match_expression': {
          // match アーム内の呼び出しを検出
          const arm = this.findParentMatchArm(node, current);
          if (arm) {
            const pattern = arm.childForFieldName('pattern');
            return {
              type: 'match_arm',
              arm_pattern: pattern ? pattern.text : undefined
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
            condition: condition ? this.normalizeCallName(condition.text) : undefined
          };
        }
        case 'for_expression': {
          const pattern = current.childForFieldName('pattern');
          const value = current.childForFieldName('value');
          const conditionText = pattern && value
            ? `${pattern.text} in ${this.normalizeCallName(value.text)}`
            : pattern?.text;
          return {
            type: 'for',
            condition: conditionText
          };
        }
      }
      current = current.parent;
    }
    return { type: 'normal' };
  }

  /**
   * ノードが祖先ノードの子孫かどうかをチェック
   */
  private isDescendant(node: Parser.SyntaxNode, ancestor: Parser.SyntaxNode): boolean {
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
  private findParentMatchArm(
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
   * async 関数かチェック
   */
  private isAsync(node: Parser.SyntaxNode): boolean {
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
  private hasTestAttribute(node: Parser.SyntaxNode): boolean {
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
   * 構造化JSONを出力する（ファイル分割版）
   */
  private async writeStructureOutput(fileAnalyses: FileAnalysis[]): Promise<void> {
    console.log('構造化JSONを出力しています...');

    // public/data ディレクトリを作成
    const baseDir = '../../../../public/data/structure';

    try {
      await fs.mkdir(baseDir, { recursive: true });
    } catch (error) {
      console.error(`出力ディレクトリの作成に失敗しました: ${error}`);
      throw error;
    }

    const targetDir = this.config.target_dir;
    const fileEntries: Array<{ path: string; items: number; tests: number }> = [];
    const allEdges: CallEdge[] = [];

    // 各ファイルの解析結果を個別JSONとして出力
    for (const analysis of fileAnalyses) {
      const relativePath = path.relative(targetDir, analysis.path);
      const jsonPath = relativePath.replace(/\.rs$/, '.json');
      const outputPath = path.join(baseDir, jsonPath);

      // サブディレクトリを作成
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      // 個別ファイルJSON出力（edgesは別ファイルに出力するため含めない）
      const fileData = {
        path: relativePath,
        items: analysis.items,
        tests: analysis.tests,
      };
      await fs.writeFile(outputPath, JSON.stringify(fileData, null, 2));

      fileEntries.push({
        path: jsonPath,
        items: analysis.items.length,
        tests: analysis.tests.length,
      });

      // エッジを集約
      allEdges.push(...analysis.edges);

      console.log(`  出力: ${outputPath}`);
    }

    // 名前→IDマップを構築（エッジ解決用）
    const nameToId = this.buildNameToIdMap(fileAnalyses);

    // エッジのtoを解決（コードベース内の呼び出しのみ）
    const resolvedEdges = this.resolveEdges(allEdges, nameToId);
    console.log(`  エッジ解決: ${allEdges.length} → ${resolvedEdges.length}`);

    // call_graph/edges.json の生成
    await this.writeCallGraph(baseDir, resolvedEdges);

    // index.json の生成
    const totalItems = fileEntries.reduce((sum, f) => sum + f.items, 0);
    const totalTests = fileEntries.reduce((sum, f) => sum + f.tests, 0);

    const index = {
      version: '2.0',
      generated_at: new Date().toISOString(),
      target_dir: targetDir,
      stats: {
        total_files: fileEntries.length,
        total_items: totalItems,
        total_tests: totalTests,
        total_edges: allEdges.length,
      },
      files: fileEntries,
    };

    const indexPath = path.join(baseDir, 'index.json');
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));

    console.log(`構造化JSONを出力しました:`);
    console.log(`  - index: ${indexPath}`);
    console.log(`  - ファイル数: ${fileEntries.length}`);
    console.log(`  - アイテム数: ${totalItems}`);
    console.log(`  - テスト数: ${totalTests}`);
    console.log(`  - エッジ数: ${allEdges.length}`);
  }

  /**
   * コールグラフを出力する
   */
  private async writeCallGraph(baseDir: string, edges: CallEdge[]): Promise<void> {
    const callGraphDir = path.join(baseDir, 'call_graph');
    await fs.mkdir(callGraphDir, { recursive: true });

    const callGraphData = {
      generated_at: new Date().toISOString(),
      total_edges: edges.length,
      edges: edges,
    };

    const edgesPath = path.join(callGraphDir, 'edges.json');
    await fs.writeFile(edgesPath, JSON.stringify(callGraphData, null, 2));

    console.log(`  コールグラフ出力: ${edgesPath} (${edges.length} edges)`);
  }

  /**
   * デバッグ情報を出力
   */
  private async writeDebugOutput(fileAnalyses: FileAnalysis[]): Promise<void> {
    console.log('デバッグ情報を出力しています...');

    const configDir = path.dirname(this.configPath);
    const baseDir = path.join(configDir, 'public', 'data', 'structure', 'debug');
    await fs.mkdir(baseDir, { recursive: true });

    // 1. 未解決エッジの集計
    const allUnresolvedEdges: UnresolvedEdge[] = [];
    for (const analysis of fileAnalyses) {
      allUnresolvedEdges.push(...(analysis.unresolvedEdges || []));
    }

    // 理由ごとに集計
    const reasonCounts: Record<string, number> = {};
    const methodCounts: Record<string, number> = {};

    for (const edge of allUnresolvedEdges) {
      const reasonKey = edge.reason.split(':')[0]; // "variable_not_in_scope: foo" → "variable_not_in_scope"
      reasonCounts[reasonKey] = (reasonCounts[reasonKey] || 0) + 1;
      methodCounts[edge.method] = (methodCounts[edge.method] || 0) + 1;
    }

    // 未解決エッジの詳細
    const unresolvedData = {
      generated_at: new Date().toISOString(),
      summary: {
        total: allUnresolvedEdges.length,
        by_reason: Object.entries(reasonCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([reason, count]) => ({ reason, count })),
        top_methods: Object.entries(methodCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([method, count]) => ({ method, count })),
      },
      edges: allUnresolvedEdges,
    };

    const unresolvedPath = path.join(baseDir, 'unresolved_edges.json');
    await fs.writeFile(unresolvedPath, JSON.stringify(unresolvedData, null, 2));
    console.log(`  未解決エッジ: ${unresolvedPath} (${allUnresolvedEdges.length} edges)`);

    // 2. TypeRegistry の内容
    const registryData = {
      generated_at: new Date().toISOString(),
      ...this.registry.toDebugObject(),
    };

    const registryPath = path.join(baseDir, 'type_registry.json');
    await fs.writeFile(registryPath, JSON.stringify(registryData, null, 2));
    console.log(`  型レジストリ: ${registryPath}`);

    // 3. 解析統計
    const allEdges = fileAnalyses.flatMap(a => a.edges);
    const statsData = {
      generated_at: new Date().toISOString(),
      edges: {
        total: allEdges.length,
        resolved: allEdges.length,
        unresolved: allUnresolvedEdges.length,
        resolution_rate: allEdges.length > 0
          ? ((allEdges.length / (allEdges.length + allUnresolvedEdges.length)) * 100).toFixed(1) + '%'
          : 'N/A',
      },
      type_registry: {
        struct_fields: Object.keys(this.registry.toDebugObject().structFields).length,
        return_types: Object.keys(this.registry.toDebugObject().returnTypes).length,
      },
      unresolved_by_reason: reasonCounts,
    };

    const statsPath = path.join(baseDir, 'stats.json');
    await fs.writeFile(statsPath, JSON.stringify(statsData, null, 2));
    console.log(`  統計情報: ${statsPath}`);
  }

  /**
   * 名前→IDマップを構築
   * エッジのtoを解決するために使用
   */
  private buildNameToIdMap(fileAnalyses: FileAnalysis[]): Map<string, string> {
    const nameToId = new Map<string, string>();

    for (const analysis of fileAnalyses) {
      for (const item of analysis.items) {
        // メソッド/関数名でマッピング（同名があれば上書き）
        nameToId.set(item.name, item.id);

        // TypeName::methodName形式でもマッピング（メソッドの場合）
        if (item.impl_for) {
          nameToId.set(`${item.impl_for}::${item.name}`, item.id);
        }
      }

      // テスト関数もマッピング
      for (const test of analysis.tests) {
        nameToId.set(test.name, test.id);
      }
    }

    return nameToId;
  }

  /**
   * 全ファイルから型情報を収集してregistryに登録
   */
  private collectTypeInfo(fileAnalyses: FileAnalysis[]): void {
    for (const analysis of fileAnalyses) {
      for (const item of analysis.items) {
        // 構造体フィールドを登録
        if (item.type === 'struct' && item.fields) {
          for (const field of item.fields) {
            const fieldType = this.extractBaseTypeName(field.type);
            this.registry.registerStructField(item.name, field.name, fieldType);
          }
        }

        // 関数/メソッドの戻り値型を登録
        if (item.type === 'function' || item.type === 'method') {
          const returnType = this.extractReturnTypeFromSignature(item.signature);
          if (returnType) {
            const typeName = item.impl_for ?? '';
            this.registry.registerReturnType(typeName, item.name, returnType);
          }
        }
      }
    }
  }

  /**
   * シグネチャから戻り値型を抽出
   * "fn foo() -> Bar" → "Bar"
   * "fn foo()" → null
   */
  private extractReturnTypeFromSignature(signature: string): string | null {
    const match = signature.match(/->\s*(.+)$/);
    if (match) {
      return this.extractBaseTypeName(match[1].trim());
    }
    return null;
  }

  /**
   * 参照型から基本型名を抽出
   * "&mut FrontendEventLog" → "FrontendEventLog"
   * "&BattleContext" → "BattleContext"
   * "Vec<Unit>" → "Vec"
   */
  private extractBaseTypeName(typeText: string): string {
    // 参照を除去
    let cleaned = typeText
      .replace(/^&mut\s+/, '')
      .replace(/^&\s*/, '')
      .trim();

    // ジェネリックパラメータを除去
    const genericStart = cleaned.indexOf('<');
    if (genericStart !== -1) {
      cleaned = cleaned.substring(0, genericStart);
    }

    return cleaned;
  }

  /**
   * エッジのtoを解決
   * コードベース内の呼び出しのみを返す
   */
  private resolveEdges(edges: CallEdge[], nameToId: Map<string, string>): CallEdge[] {
    const resolved: CallEdge[] = [];

    for (const edge of edges) {
      const resolvedTo = this.resolveEdgeTarget(edge.to, nameToId);
      if (resolvedTo) {
        resolved.push({
          ...edge,
          to: resolvedTo,
        });
      }
    }

    return resolved;
  }

  /**
   * エッジのターゲットを解決
   */
  private resolveEdgeTarget(to: string, nameToId: Map<string, string>): string | null {
    // 1. 完全一致
    if (nameToId.has(to)) {
      return nameToId.get(to)!;
    }

    // 2. TypeName::methodName 形式で試行
    const parts = to.split('::');
    if (parts.length >= 2) {
      const key = `${parts[parts.length - 2]}::${parts[parts.length - 1]}`;
      if (nameToId.has(key)) {
        return nameToId.get(key)!;
      }
    }

    // 末尾の名前のみでのマッチは削除（異なる型の同名メソッドに誤マッチするため）
    // 例: InternalEventLog::new が FrontendEventLog::new にマッチする問題を防ぐ

    // 解決できない（外部呼び出し）
    return null;
  }

  /**
   * 解析を実行する（2パス解析）
   */
  async analyze(configPath: string): Promise<void> {
    console.log('=== Perchwork Analyzer 開始 ===');

    try {
      // 設定ファイル読み込み
      await this.loadConfig(configPath);

      // 対象ファイル収集
      const targetFiles = await this.collectTargetFiles();

      if (targetFiles.length === 0) {
        console.warn('対象ファイルが見つかりませんでした');
        return;
      }

      // パス1: アイテム抽出（エッジはスキップ）
      console.log('パス1: アイテムを抽出しています...');
      const fileAnalyses: FileAnalysis[] = [];

      for (const filePath of targetFiles) {
        try {
          const analysis = await this.parseFile(filePath, true); // skipEdges = true
          fileAnalyses.push(analysis);
        } catch (error) {
          console.error(`  ファイルの解析に失敗しました: ${filePath} - ${error}`);
        }
      }

      // 型情報を収集
      console.log('型情報を収集しています...');
      this.registry = new TypeRegistry(); // registryをリセット
      this.collectTypeInfo(fileAnalyses);

      // パス2: エッジ抽出（registryを使用）
      console.log('パス2: エッジを抽出しています...');
      for (const filePath of targetFiles) {
        try {
          const analysisWithEdges = await this.parseFile(filePath, false); // skipEdges = false
          // 既存のanalysisにエッジとunresolvedEdgesをマージ
          const existingAnalysis = fileAnalyses.find(a => a.path === filePath);
          if (existingAnalysis) {
            existingAnalysis.edges = analysisWithEdges.edges;
            existingAnalysis.unresolvedEdges = analysisWithEdges.unresolvedEdges;
          }
        } catch (error) {
          console.error(`  エッジの抽出に失敗しました: ${filePath} - ${error}`);
        }
      }

      // 構造化JSON出力
      await this.writeStructureOutput(fileAnalyses);

      // デバッグ出力
      await this.writeDebugOutput(fileAnalyses);

      console.log('=== Perchwork Analyzer 完了 ===');
    } catch (error) {
      console.error('エラーが発生しました:', error);
      throw error;
    }
  }
}

/**
 * コマンドライン引数をパースする
 */
function parseArgs(): string {
  const args = process.argv.slice(2);

  let configPath: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config' && i + 1 < args.length) {
      configPath = args[i + 1];
      break;
    }
  }

  if (!configPath) {
    console.error('使い方: node analyze.js --config <config.json>');
    process.exit(1);
  }

  return configPath;
}

/**
 * エントリーポイント
 */
async function main() {
  const configPath = parseArgs();
  const analyzer = new PerchworkAnalyzer();
  await analyzer.analyze(configPath);
}

main().catch((error) => {
  console.error('致命的なエラー:', error);
  process.exit(1);
});
