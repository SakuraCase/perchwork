/**
 * アイテムのグループ化ロジック
 *
 * CodeItem 配列をグループ化して表示用のデータ構造に変換する。
 * - enum グループ
 * - struct グループ（フィールド + メソッド + テスト）
 * - trait グループ
 * - 関数グループ
 */

import type { CodeItem, SemanticTest, FieldInfo } from '@/types/schema';

/** テスト情報（セマンティック情報付き） */
export interface TestInfo {
  id: string;
  summary: string;
}

/** メソッド情報（テスト紐付け付き） */
export interface MethodWithTests {
  item: CodeItem;
  tests: TestInfo[];
}

/** Struct/Enum グループ */
export interface StructGroup {
  item: CodeItem;
  fields: FieldInfo[];
  methods: MethodWithTests[];
  directTests: TestInfo[];
}

/** グループ化結果 */
export interface GroupedItems {
  enums: StructGroup[];
  structs: StructGroup[];
  traits: CodeItem[];
  functions: CodeItem[];
}

/**
 * IDフォーマットを正規化（.rs を除去）
 *
 * 構造JSON: "unit_collection.rs::UnitCollection::struct"
 * セマンティックJSON: "unit_collection::UnitCollection::struct"
 *
 * マッチングのために .rs を除去して統一する
 */
export function normalizeId(id: string): string {
  return id.replace(/\.rs::/, '::');
}

/**
 * アイテムとテストをグループ化
 *
 * @param items - ファイル内のすべてのCodeItem
 * @param semanticTests - セマンティック情報のテスト配列
 * @returns グループ化されたアイテム
 */
export function groupItems(
  items: CodeItem[],
  semanticTests: SemanticTest[]
): GroupedItems {
  // 1. テスト情報のマップを構築（正規化されたtested_item -> TestInfo[]）
  const testsByItem = new Map<string, TestInfo[]>();
  for (const test of semanticTests) {
    if (test.tested_item) {
      const normalizedTarget = normalizeId(test.tested_item);
      const existing = testsByItem.get(normalizedTarget) || [];
      existing.push({ id: test.id, summary: test.summary });
      testsByItem.set(normalizedTarget, existing);
    }
  }

  // 2. アイテムを種類別に分類
  const enums: CodeItem[] = [];
  const structs: CodeItem[] = [];
  const traits: CodeItem[] = [];
  const methods: CodeItem[] = [];
  const functions: CodeItem[] = [];

  for (const item of items) {
    switch (item.type) {
      case 'enum':
        enums.push(item);
        break;
      case 'struct':
        structs.push(item);
        break;
      case 'trait':
        traits.push(item);
        break;
      case 'method':
        methods.push(item);
        break;
      case 'fn':
        // テスト関数（test_ で始まる）は除外
        if (!item.name.startsWith('test_')) {
          functions.push(item);
        }
        break;
    }
  }

  // 3. Struct/Enum グループを構築
  const buildGroups = (structItems: CodeItem[]): StructGroup[] => {
    return structItems.map(structItem => {
      // このstruct/enumに属するメソッドを収集
      const structMethods = methods
        .filter(m => m.impl_for === structItem.name)
        .map(method => {
          const normalizedId = normalizeId(method.id);
          const tests = testsByItem.get(normalizedId) || [];
          return { item: method, tests };
        });

      // struct/enumを直接テストするテスト
      const normalizedStructId = normalizeId(structItem.id);
      const directTests = testsByItem.get(normalizedStructId) || [];

      return {
        item: structItem,
        fields: structItem.fields || [],
        methods: structMethods,
        directTests,
      };
    });
  };

  return {
    enums: buildGroups(enums),
    structs: buildGroups(structs),
    traits,
    functions,
  };
}
