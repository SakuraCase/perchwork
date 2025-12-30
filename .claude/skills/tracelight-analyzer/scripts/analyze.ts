#!/usr/bin/env node
/**
 * Tracelight Analyzer - Rust コード解析スクリプト
 *
 * tree-sitter のネイティブバインディングを使って Rust コードを解析し、構造化JSONを生成する
 */

import Parser from 'tree-sitter';
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
interface ExtractedItem {
  id: string;
  type: 'struct' | 'enum' | 'trait' | 'impl' | 'function' | 'method';
  name: string;
  line_start: number;
  line_end: number;
  visibility: 'pub' | 'pub(crate)' | 'private';
  signature: string;
  fields?: string[];
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
 * コールグラフのエッジ
 */
interface CallEdge {
  from: string;
  to: string;
  file: string;
  line: number;
}

/**
 * ファイル単位の解析結果
 */
interface FileAnalysis {
  path: string;
  items: ExtractedItem[];
  tests: TestInfo[];
  edges: CallEdge[];
}

/**
 * メイン処理クラス
 */
class TracelightAnalyzer {
  private config!: Config;
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
    this.parser.setLanguage(Rust);
  }

  /**
   * 設定ファイルを読み込む
   */
  private async loadConfig(configPath: string): Promise<void> {
    console.log(`設定ファイルを読み込んでいます: ${configPath}`);

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
   */
  private async parseFile(filePath: string): Promise<FileAnalysis> {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const tree = this.parser.parse(fileContent);

    const items: ExtractedItem[] = [];
    const tests: TestInfo[] = [];
    const edges: CallEdge[] = [];

    // ルートノードから探索
    this.extractItems(tree.rootNode, filePath, fileContent, items, tests, edges);

    return {
      path: filePath,
      items,
      tests,
      edges,
    };
  }

  /**
   * ASTノードから構造を抽出（再帰的）
   */
  private extractItems(
    node: Parser.SyntaxNode,
    filePath: string,
    fileContent: string,
    items: ExtractedItem[],
    tests: TestInfo[],
    edges: CallEdge[]
  ): void {
    // 現在のノードの処理
    if (node.type === 'function_item') {
      // impl_item内の関数は extractImpl で既にメソッドとして処理されているため、
      // トップレベルまたは他のコンテキストの関数のみを処理する
      if (!this.isInsideImplBlock(node)) {
        this.extractFunction(node, filePath, fileContent, items, tests, edges);
      }
    } else if (node.type === 'struct_item') {
      this.extractStruct(node, filePath, fileContent, items);
    } else if (node.type === 'enum_item') {
      this.extractEnum(node, filePath, fileContent, items);
    } else if (node.type === 'trait_item') {
      this.extractTrait(node, filePath, fileContent, items);
    } else if (node.type === 'impl_item') {
      this.extractImpl(node, filePath, fileContent, items, edges);
    }

    // 子ノードを再帰的に処理
    for (let i = 0; i < node.childCount; i++) {
      this.extractItems(node.child(i)!, filePath, fileContent, items, tests, edges);
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
   */
  private extractFunction(
    node: Parser.SyntaxNode,
    filePath: string,
    fileContent: string,
    items: ExtractedItem[],
    tests: TestInfo[],
    edges: CallEdge[]
  ): void {
    const nameNode = node.childForFieldName('name');
    if (!nameNode) return;

    const name = nameNode.text;
    const fileName = path.basename(filePath);

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

      // エッジを収集
      this.collectEdges(node, testId, filePath, edges);
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

      // エッジを収集
      this.collectEdges(node, itemId, filePath, edges);
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
    const fileName = path.basename(filePath);

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
    const fileName = path.basename(filePath);

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
    const fileName = path.basename(filePath);

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
   */
  private extractImpl(
    node: Parser.SyntaxNode,
    filePath: string,
    fileContent: string,
    items: ExtractedItem[],
    edges: CallEdge[]
  ): void {
    const typeNode = node.childForFieldName('type');
    if (!typeNode) return;

    const implFor = typeNode.text;
    const fileName = path.basename(filePath);

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

          // エッジを収集
          this.collectEdges(child, methodId, filePath, edges);
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
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child && child.type === 'block') {
        bodyStartLine = child.startPosition.row;
        break;
      }
    }

    // シグネチャ部分のみを抽出
    const lines = fileContent.split('\n');
    const signatureLines = lines.slice(startLine, bodyStartLine);
    let signature = signatureLines.join(' ').trim();

    // 長すぎる場合は省略
    if (signature.length > 200) {
      signature = signature.substring(0, 197) + '...';
    }

    return signature;
  }

  /**
   * 構造体のフィールドを抽出
   */
  private extractFields(node: Parser.SyntaxNode): string[] {
    const fields: string[] = [];
    const bodyNode = node.childForFieldName('body');

    if (bodyNode) {
      for (let i = 0; i < bodyNode.childCount; i++) {
        const child = bodyNode.child(i);
        if (child && child.type === 'field_declaration') {
          const nameNode = child.childForFieldName('name');
          if (nameNode) {
            fields.push(nameNode.text);
          }
        }
      }
    }

    return fields;
  }

  /**
   * enumのバリアントを抽出
   */
  private extractVariants(node: Parser.SyntaxNode): string[] {
    const variants: string[] = [];
    const bodyNode = node.childForFieldName('body');

    if (bodyNode) {
      for (let i = 0; i < bodyNode.childCount; i++) {
        const child = bodyNode.child(i);
        if (child && child.type === 'enum_variant') {
          const nameNode = child.childForFieldName('name');
          if (nameNode) {
            variants.push(nameNode.text);
          }
        }
      }
    }

    return variants;
  }

  /**
   * 関数呼び出しエッジを収集
   */
  private collectEdges(
    node: Parser.SyntaxNode,
    fromId: string,
    filePath: string,
    edges: CallEdge[]
  ): void {
    this.findEdges(node, fromId, filePath, edges);
  }

  /**
   * 関数呼び出しエッジを再帰的に検索
   */
  private findEdges(
    node: Parser.SyntaxNode,
    fromId: string,
    filePath: string,
    edges: CallEdge[]
  ): void {
    if (node.type === 'call_expression') {
      const functionNode = node.childForFieldName('function');
      if (functionNode) {
        // 改行や余分な空白を除去して正規化
        const normalized = this.normalizeCallName(functionNode.text);
        edges.push({
          from: fromId,
          to: normalized,
          file: path.basename(filePath),
          line: node.startPosition.row + 1,
        });
      }
    } else if (node.type === 'method_call_expression') {
      const methodNode = node.childForFieldName('method');
      if (methodNode) {
        // メソッド呼び出しの場合は単純にメソッド名のみ
        edges.push({
          from: fromId,
          to: methodNode.text,
          file: path.basename(filePath),
          line: node.startPosition.row + 1,
        });
      }
    }

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        this.findEdges(child, fromId, filePath, edges);
      }
    }
  }

  /**
   * 呼び出し名を正規化（改行と余分な空白を除去）
   */
  private normalizeCallName(text: string): string {
    // 改行を除去し、連続する空白を1つにまとめる
    return text.replace(/\s+/g, ' ').trim();
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
    // 関数の前のアトリビュートをチェック
    const parent = node.parent;
    if (!parent) return false;

    const nodeIndex = parent.children.indexOf(node);
    if (nodeIndex <= 0) return false;

    // 直前のノードをチェック
    for (let i = nodeIndex - 1; i >= 0; i--) {
      const prevNode = parent.children[i];
      if (prevNode.type === 'attribute_item') {
        const text = prevNode.text;
        if (
          text.includes('#[test]') ||
          text.includes('#[tokio::test]') ||
          text.includes('#[test_case')
        ) {
          return true;
        }
      } else if (prevNode.type !== 'line_comment' && prevNode.type !== 'block_comment') {
        // コメント以外のノードが見つかったら終了
        break;
      }
    }

    return false;
  }

  /**
   * 構造化JSONを出力する（ファイル分割版）
   */
  private async writeStructureOutput(fileAnalyses: FileAnalysis[]): Promise<void> {
    console.log('構造化JSONを出力しています...');

    // public/data ディレクトリを作成
    const baseDir = '../../../../public/data';

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

    // call_graph/edges.json の生成
    await this.writeCallGraph(baseDir, allEdges);

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
   * 解析を実行する
   */
  async analyze(configPath: string): Promise<void> {
    console.log('=== Tracelight Analyzer 開始 ===');

    try {
      // 設定ファイル読み込み
      await this.loadConfig(configPath);

      // 対象ファイル収集
      const targetFiles = await this.collectTargetFiles();

      if (targetFiles.length === 0) {
        console.warn('対象ファイルが見つかりませんでした');
        return;
      }

      // 各ファイルを解析
      console.log('ファイルを解析しています...');
      const fileAnalyses: FileAnalysis[] = [];

      for (const filePath of targetFiles) {
        try {
          console.log(`  解析中: ${filePath}`);
          const analysis = await this.parseFile(filePath);
          fileAnalyses.push(analysis);
        } catch (error) {
          console.error(`  ファイルの解析に失敗しました: ${filePath} - ${error}`);
          // エラーが発生してもスキップして続行
        }
      }

      // 構造化JSON出力
      await this.writeStructureOutput(fileAnalyses);

      console.log('=== Tracelight Analyzer 完了 ===');
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
  const analyzer = new TracelightAnalyzer();
  await analyzer.analyze(configPath);
}

main().catch((error) => {
  console.error('致命的なエラー:', error);
  process.exit(1);
});
