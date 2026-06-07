import type { ExtractedItem, TestInfo, CallEdge, UnresolvedEdge } from '../types/index.js';
import type { TypeRegistry } from '../core/TypeRegistry.js';
import { RustAnalyzer } from './rust/index.js';

/**
 * 言語解析器のインターフェース
 */
export interface LanguageAnalyzer {
  /** 言語識別子 */
  readonly languageId: string;

  /** この解析器が処理するファイル拡張子 */
  readonly extensions: string[];

  /** パーサーを初期化 */
  initialize(): void;

  /**
   * Pass 1: アイテムを抽出
   */
  extractItems(
    fileContent: string,
    filePath: string
  ): {
    items: ExtractedItem[];
    tests: TestInfo[];
  };

  /**
   * 抽出されたアイテムから型情報を収集
   */
  collectTypeInfo(items: ExtractedItem[], registry: TypeRegistry): void;

  /**
   * Pass 2: エッジを抽出
   */
  findEdges(
    fileContent: string,
    filePath: string,
    items: ExtractedItem[],
    registry: TypeRegistry
  ): {
    edges: CallEdge[];
    unresolvedEdges: UnresolvedEdge[];
  };
}

/**
 * 言語解析器を作成
 */
export function createLanguageAnalyzer(languageId: string): LanguageAnalyzer {
  switch (languageId) {
    case 'rust':
      return new RustAnalyzer();
    // 将来: case 'typescript': return new TypeScriptAnalyzer();
    default:
      throw new Error(`Unsupported language: ${languageId}`);
  }
}

/**
 * ファイル拡張子から言語IDを取得
 */
export function getLanguageForExtension(ext: string): string | null {
  const extensionMap: Record<string, string> = {
    '.rs': 'rust',
    // 将来: '.ts': 'typescript', '.tsx': 'typescript',
  };
  return extensionMap[ext] ?? null;
}
