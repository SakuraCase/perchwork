/**
 * schemaTransformer.ts
 *
 * structure JSONからスキーマグラフデータへの変換
 */

import type { SplitFile, CodeItem } from '../types/schema';
import type {
  SchemaGraphData,
  SchemaNodeData,
  SchemaEdgeData,
  SchemaFilter,
} from '../types/schemaGraph';

/** Rustのプリミティブ型 */
const PRIMITIVE_TYPES = new Set([
  // 整数型
  'i8', 'i16', 'i32', 'i64', 'i128', 'isize',
  'u8', 'u16', 'u32', 'u64', 'u128', 'usize',
  // 浮動小数点型
  'f32', 'f64',
  // 論理型
  'bool',
  // 文字型
  'char',
  // ユニット型
  '()',
  // 文字列型
  'str', 'String',
  // その他の標準型
  'Self',
]);

/** 標準ライブラリのコンテナ型（中身を抽出する対象） */
const CONTAINER_TYPES = new Set([
  'Vec', 'Option', 'Result', 'Box', 'Rc', 'Arc', 'RefCell', 'Cell',
  'HashMap', 'HashSet', 'BTreeMap', 'BTreeSet',
  'VecDeque', 'LinkedList', 'BinaryHeap',
]);

/**
 * 型文字列から参照している型名を抽出
 *
 * @example
 * extractTypeReferences("HashMap<PlayerSide, Vec<Unit>>") → ["PlayerSide", "Unit"]
 * extractTypeReferences("Option<BattleMaster>") → ["BattleMaster"]
 * extractTypeReferences("u32") → []
 */
export function extractTypeReferences(typeStr: string): string[] {
  const references: Set<string> = new Set();

  // 型文字列をパース
  parseTypeString(typeStr, references);

  return Array.from(references);
}

/**
 * 型文字列を再帰的にパースして参照型を抽出
 */
function parseTypeString(typeStr: string, references: Set<string>): void {
  // 空白を正規化
  const normalized = typeStr.trim();

  if (!normalized) return;

  // 参照（&, &mut）を除去
  const withoutRef = normalized.replace(/^&(?:mut\s+)?/, '');

  // ライフタイムを除去
  const withoutLifetime = withoutRef.replace(/'[a-z_]+\s*/g, '');

  // 配列型 [T; N] を処理
  const arrayMatch = withoutLifetime.match(/^\[(.+);\s*\d+\]$/);
  if (arrayMatch) {
    parseTypeString(arrayMatch[1], references);
    return;
  }

  // スライス型 [T] を処理
  const sliceMatch = withoutLifetime.match(/^\[(.+)\]$/);
  if (sliceMatch) {
    parseTypeString(sliceMatch[1], references);
    return;
  }

  // タプル型 (A, B, C) を処理
  if (withoutLifetime.startsWith('(') && withoutLifetime.endsWith(')')) {
    const inner = withoutLifetime.slice(1, -1);
    const parts = splitByComma(inner);
    for (const part of parts) {
      parseTypeString(part, references);
    }
    return;
  }

  // ジェネリック型 Type<T, U> を処理
  const genericMatch = withoutLifetime.match(/^(\w+)<(.+)>$/);
  if (genericMatch) {
    const [, typeName, inner] = genericMatch;

    // コンテナ型なら中身を再帰的に処理
    if (CONTAINER_TYPES.has(typeName)) {
      const parts = splitByComma(inner);
      for (const part of parts) {
        parseTypeString(part, references);
      }
    } else {
      // カスタムジェネリック型は型名自体も参照として追加
      if (!PRIMITIVE_TYPES.has(typeName)) {
        references.add(typeName);
      }
      const parts = splitByComma(inner);
      for (const part of parts) {
        parseTypeString(part, references);
      }
    }
    return;
  }

  // パス型 module::Type を処理
  const pathParts = withoutLifetime.split('::');
  const lastPart = pathParts[pathParts.length - 1];

  // プリミティブでなければ参照として追加
  if (lastPart && !PRIMITIVE_TYPES.has(lastPart)) {
    references.add(lastPart);
  }
}

/**
 * ジェネリック引数をカンマで分割（ネストを考慮）
 */
function splitByComma(str: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;

  for (const char of str) {
    if (char === '<' || char === '(' || char === '[') {
      depth++;
      current += char;
    } else if (char === '>' || char === ')' || char === ']') {
      depth--;
      current += char;
    } else if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

/** 拡張CodeItem（ファイルパス付き） */
export interface CodeItemWithPath extends CodeItem {
  /** ソースファイルパス（例: "master/game_config.rs"） */
  sourcePath: string;
}

/**
 * SplitFileからstruct/enumを抽出
 */
export function extractStructsAndEnums(splitFiles: SplitFile[]): CodeItemWithPath[] {
  const items: CodeItemWithPath[] = [];

  for (const splitFile of splitFiles) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawData = splitFile as any;
    const sourcePath = rawData.path || '';

    // フラット形式: { path, items }
    if ('items' in rawData && Array.isArray(rawData.items)) {
      for (const item of rawData.items as CodeItem[]) {
        if (item.type === 'struct' || item.type === 'enum') {
          items.push({
            ...item,
            sourcePath,
          });
        }
      }
    }

    // ネスト形式: { files: SourceFile[] }
    if ('files' in rawData && Array.isArray(rawData.files)) {
      for (const file of rawData.files) {
        const fileSourcePath = file.path || '';
        for (const item of file.items as CodeItem[]) {
          if (item.type === 'struct' || item.type === 'enum') {
            items.push({
              ...item,
              sourcePath: fileSourcePath,
            });
          }
        }
      }
    }
  }

  return items;
}

/**
 * CodeItem配列からスキーマグラフデータを生成
 */
export function buildSchemaGraph(items: CodeItemWithPath[]): SchemaGraphData {
  // 型名 → CodeItemWithPath のマップを作成
  const typeMap = new Map<string, CodeItemWithPath>();
  for (const item of items) {
    typeMap.set(item.name, item);
  }

  // ノードを生成
  const nodes: SchemaNodeData[] = [];
  const edges: SchemaEdgeData[] = [];
  const inDegreeMap = new Map<string, number>();

  // 初期化: 全ノードのinDegreeを0に
  for (const item of items) {
    inDegreeMap.set(item.name, 0);
  }

  // エッジを生成し、inDegreeを計算
  for (const item of items) {
    const outRefs: string[] = [];

    if (item.fields) {
      for (const field of item.fields) {
        const refs = extractTypeReferences(field.type);
        for (const ref of refs) {
          // 参照先が存在する型の場合のみエッジを追加
          if (typeMap.has(ref)) {
            outRefs.push(ref);

            const edgeId = `${item.name}-${field.name}-${ref}`;
            edges.push({
              id: edgeId,
              sourceId: item.name,
              targetId: ref,
              fieldName: field.name,
              fieldType: field.type,
            });

            // inDegreeをインクリメント
            inDegreeMap.set(ref, (inDegreeMap.get(ref) || 0) + 1);
          }
        }
      }
    }

    // sourcePathからファイルパスを使用（.rs → .json変換はツリー遷移時に行う）
    const filePath = item.sourcePath;

    nodes.push({
      id: item.id,
      name: item.name,
      type: item.type as 'struct' | 'enum',
      fields: item.fields || [],
      filePath,
      line: item.line_start,
      inDegree: 0, // 後で更新
      outDegree: new Set(outRefs).size,
      visibility: item.visibility || 'private',
    });
  }

  // inDegreeをノードに反映
  for (const node of nodes) {
    node.inDegree = inDegreeMap.get(node.name) || 0;
  }

  // 統計情報を計算
  const totalStructs = nodes.filter(n => n.type === 'struct').length;
  const totalEnums = nodes.filter(n => n.type === 'enum').length;

  let maxInDegree: { name: string; count: number } | null = null;
  for (const node of nodes) {
    if (!maxInDegree || node.inDegree > maxInDegree.count) {
      maxInDegree = { name: node.name, count: node.inDegree };
    }
  }

  return {
    nodes,
    edges,
    stats: {
      totalStructs,
      totalEnums,
      totalEdges: edges.length,
      maxInDegree,
    },
  };
}

/**
 * フォーカスノードに関連するノードのみを抽出（BFS）
 */
function filterByFocusNode(
  nodes: SchemaNodeData[],
  edges: SchemaEdgeData[],
  focusNodeId: string
): SchemaNodeData[] {
  const relatedIds = new Set<string>([focusNodeId]);
  const queue = [focusNodeId];

  // BFSで参照関係を辿る
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of edges) {
      // 参照先（current → target）
      if (edge.sourceId === current && !relatedIds.has(edge.targetId)) {
        relatedIds.add(edge.targetId);
        queue.push(edge.targetId);
      }
      // 参照元（source → current）
      if (edge.targetId === current && !relatedIds.has(edge.sourceId)) {
        relatedIds.add(edge.sourceId);
        queue.push(edge.sourceId);
      }
    }
  }

  return nodes.filter(n => relatedIds.has(n.name));
}

/**
 * フィルタを適用
 */
export function applySchemaFilter(
  data: SchemaGraphData,
  filter: SchemaFilter
): SchemaGraphData {
  let filteredNodes = data.nodes;

  // 1. 型フィルタ
  filteredNodes = filteredNodes.filter(node => filter.types.includes(node.type));

  // 2. 可視性フィルタ
  filteredNodes = filteredNodes.filter(node => filter.visibility.includes(node.visibility));

  // 3. フィールドなしstruct非表示（タプル構造体は除く）
  if (filter.hideEmptyStructs) {
    filteredNodes = filteredNodes.filter(node => {
      // enumは対象外
      if (node.type === 'enum') return true;
      // フィールドがあれば表示（タプル構造体含む）
      if (node.fields.length > 0) return true;
      // フィールドなしstructは非表示
      return false;
    });
  }

  // 4. 検索クエリフィルタ
  if (filter.searchQuery) {
    const query = filter.searchQuery.toLowerCase();
    filteredNodes = filteredNodes.filter(node =>
      node.name.toLowerCase().includes(query)
    );
  }

  // 5. 除外ノードフィルタ
  if (filter.excludeNodeIds.length > 0) {
    const excludeSet = new Set(filter.excludeNodeIds);
    filteredNodes = filteredNodes.filter(node => !excludeSet.has(node.name));
  }

  // 6. フォーカスノードフィルタ（関連する型のみ）
  if (filter.focusNodeId) {
    // フィルタ適用前のエッジを使用（フォーカス対象が除外されていない前提）
    filteredNodes = filterByFocusNode(filteredNodes, data.edges, filter.focusNodeId);
  }

  // フィルタ後のノード名セット
  let nodeNames = new Set(filteredNodes.map(n => n.name));

  // エッジもフィルタリング（両端が存在するもののみ）
  let filteredEdges = data.edges.filter(
    edge => nodeNames.has(edge.sourceId) && nodeNames.has(edge.targetId)
  );

  // 7. 孤立ノードフィルタ（inDegree=0かつoutDegree=0のノード）
  if (!filter.showIsolatedNodes) {
    // 各ノードのin/outDegreeを計算
    const inDegreeMap = new Map<string, number>();
    const outDegreeMap = new Map<string, number>();

    for (const node of filteredNodes) {
      inDegreeMap.set(node.name, 0);
      outDegreeMap.set(node.name, 0);
    }
    for (const edge of filteredEdges) {
      inDegreeMap.set(edge.targetId, (inDegreeMap.get(edge.targetId) || 0) + 1);
      outDegreeMap.set(edge.sourceId, (outDegreeMap.get(edge.sourceId) || 0) + 1);
    }

    // 孤立ノード（in=0, out=0）を除外
    filteredNodes = filteredNodes.filter(node => {
      const inDeg = inDegreeMap.get(node.name) || 0;
      const outDeg = outDegreeMap.get(node.name) || 0;
      return inDeg > 0 || outDeg > 0;
    });

    // ノード名セットを更新
    nodeNames = new Set(filteredNodes.map(n => n.name));
    // エッジを再フィルタ
    filteredEdges = filteredEdges.filter(
      edge => nodeNames.has(edge.sourceId) && nodeNames.has(edge.targetId)
    );
  }

  // inDegreeを再計算
  const inDegreeMap = new Map<string, number>();
  for (const node of filteredNodes) {
    inDegreeMap.set(node.name, 0);
  }
  for (const edge of filteredEdges) {
    inDegreeMap.set(edge.targetId, (inDegreeMap.get(edge.targetId) || 0) + 1);
  }

  const updatedNodes = filteredNodes.map(node => ({
    ...node,
    inDegree: inDegreeMap.get(node.name) || 0,
  }));

  // 統計を再計算
  const totalStructs = updatedNodes.filter(n => n.type === 'struct').length;
  const totalEnums = updatedNodes.filter(n => n.type === 'enum').length;

  let maxInDegree: { name: string; count: number } | null = null;
  for (const node of updatedNodes) {
    if (!maxInDegree || node.inDegree > maxInDegree.count) {
      maxInDegree = { name: node.name, count: node.inDegree };
    }
  }

  return {
    nodes: updatedNodes,
    edges: filteredEdges,
    stats: {
      totalStructs,
      totalEnums,
      totalEdges: filteredEdges.length,
      maxInDegree,
    },
  };
}
