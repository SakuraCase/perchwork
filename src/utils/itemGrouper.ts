/**
 * アイテムのグループ化ロジック
 *
 * CodeItem 配列をグループ化して表示用のデータ構造に変換する。
 * - enum グループ
 * - struct グループ（フィールド + メソッド + テスト）
 * - trait グループ
 * - 関数グループ
 */

import type { CodeItem, FieldInfo } from '@/types/schema';

/** テスト情報 */
export interface TestInfo {
  id: string;
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
 * アイテムとテストをグループ化
 *
 * @param items - ファイル内のすべてのCodeItem
 * @returns グループ化されたアイテム
 */
export function groupItems(items: CodeItem[]): GroupedItems {
  // 1. アイテムを種類別に分類
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
      case 'function':
      case 'fn':
        // テスト関数（test_ で始まる）は除外
        if (!item.name.startsWith('test_')) {
          functions.push(item);
        }
        break;
    }
  }

  // 2. Struct/Enum グループを構築
  const buildGroups = (structItems: CodeItem[]): StructGroup[] => {
    return structItems.map(structItem => {
      // このstruct/enumに属するメソッドを収集
      const structMethods = methods
        .filter(m => m.impl_for === structItem.name)
        .map(method => {
          const tests = buildTestInfo(method);
          return { item: method, tests };
        });

      // struct/enumを直接テストするテスト
      const directTests = buildTestInfo(structItem);

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

function buildTestInfo(item: CodeItem): TestInfo[] {
  return (item.tested_by ?? []).map((id) => ({ id }));
}
