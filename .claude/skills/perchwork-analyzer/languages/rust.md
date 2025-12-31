# Rust Analysis Patterns

## Overview

tree-sitter を使った Rust コードの解析パターン定義。

## Detection Targets

### 検出対象（Rust）

| 種別 | tree-sitter ノードタイプ | 抽出情報 |
|------|-------------------------|---------|
| 関数 | `function_item` | 名前、可視性、パラメータ、戻り値、行番号 |
| 構造体 | `struct_item` | 名前、可視性、フィールド、行番号 |
| 列挙型 | `enum_item` | 名前、可視性、バリアント、行番号 |
| トレイト | `trait_item` | 名前、可視性、メソッド、行番号 |
| impl ブロック | `impl_item` | 対象型、トレイト、メソッド、行番号 |
| use 文 | `use_declaration` | インポートパス |
| モジュール | `mod_item` | 名前、可視性 |

## Query Patterns

### 関数の検出

```scheme
(function_item
  (visibility_modifier)? @visibility
  name: (identifier) @name
  parameters: (parameters) @params
  return_type: (type_identifier)? @return_type
) @function
```

### 構造体の検出

```scheme
(struct_item
  (visibility_modifier)? @visibility
  name: (type_identifier) @name
  body: (field_declaration_list)? @fields
) @struct
```

### トレイトの検出

```scheme
(trait_item
  (visibility_modifier)? @visibility
  name: (type_identifier) @name
  body: (declaration_list) @body
) @trait
```

### 列挙型の検出

```scheme
(enum_item
  (visibility_modifier)? @visibility
  name: (type_identifier) @name
  body: (enum_variant_list) @variants
) @enum
```

### impl ブロックの検出

```scheme
(impl_item
  trait: (type_identifier)? @trait
  type: (type_identifier) @type
  body: (declaration_list) @body
) @impl
```

## Visibility Detection

| Rust 修飾子 | 抽出値 |
|------------|--------|
| `pub` | `public` |
| `pub(crate)` | `crate` |
| `pub(super)` | `super` |
| `pub(in path)` | `restricted` |
| (なし) | `private` |

## Type Extraction

### パラメータ型

```rust
fn example(a: u32, b: &str) -> Result<(), Error>
```

抽出結果:
- `a`: `u32`
- `b`: `&str`
- 戻り値: `Result<(), Error>`

### ジェネリック型

```rust
fn generic<T: Clone>(value: T) -> T
```

抽出結果:
- ジェネリックパラメータ: `T: Clone`
- パラメータ: `value: T`
- 戻り値: `T`

## Call Graph Extraction

### 関数呼び出しの検出

```scheme
(call_expression
  function: (identifier) @callee
) @call
```

### メソッド呼び出しの検出

```scheme
(call_expression
  function: (field_expression
    field: (field_identifier) @method
  )
) @method_call
```

## Documentation Extraction

### ドキュメントコメント

```rust
/// ドキュメントコメント（summary）
///
/// 詳細説明（responsibility）
pub fn example() {}
```

抽出ルール:
- 最初の行 → `summary`
- 2行目以降 → `responsibility`

### 属性マクロ

```rust
#[derive(Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Example {}
```

抽出対象:
- `derive` 属性
- `serde` 属性
- `test` 属性（テスト関数）

## Test Detection

### テスト関数

```rust
#[test]
fn test_example() {}

#[cfg(test)]
mod tests {
    #[test]
    fn test_case() {}
}
```

検出条件:
- `#[test]` 属性を持つ関数
- `#[cfg(test)]` モジュール内の関数

## Error Handling

| パターン | 抽出方法 |
|---------|---------|
| `Result<T, E>` | 戻り値型から抽出 |
| `Option<T>` | 戻り値型から抽出 |
| `?` 演算子 | 関数本体から検出 |
| `unwrap()` | 関数本体から検出（警告対象） |

## Module Hierarchy

### ファイルパスからモジュールパスへの変換

```
backend/src/lib/domain/core/entity/unit.rs
→ lib::domain::core::entity::unit
```

変換ルール:
1. `src/` を削除
2. `.rs` を削除
3. `/` を `::` に置換

## Example Output

```json
{
  "path": "backend/src/lib/domain/core/entity/unit.rs",
  "language": "rust",
  "items": [
    {
      "id": "lib::domain::core::entity::unit::Unit",
      "type": "struct",
      "name": "Unit",
      "line_start": 10,
      "line_end": 20,
      "summary": "ゲーム内のユニットを表すエンティティ",
      "responsibility": "ユニットの状態管理と行動制御",
      "visibility": "public",
      "fields": ["id", "hero_id", "hp", "cooltime"],
      "tests": ["test_create_unit", "test_take_damage"],
      "calls": [],
      "called_by": []
    },
    {
      "id": "lib::domain::core::entity::unit::Unit::new",
      "type": "function",
      "name": "new",
      "line_start": 22,
      "line_end": 30,
      "summary": "新しいユニットを生成する",
      "responsibility": "ユニットの初期化とバリデーション",
      "visibility": "public",
      "parameters": ["id: UnitId", "hero_id: HeroId", "hp: u32"],
      "return_type": "Result<Self, DomainError>",
      "tests": ["test_create_unit"],
      "calls": ["UnitId::validate", "HeroId::validate"],
      "called_by": []
    }
  ]
}
```

## Edge Cases

### マクロ展開

```rust
macro_rules! define_id {
    ($name:ident) => {
        pub struct $name(String);
    };
}

define_id!(UnitId);
```

対処方法:
- マクロ定義自体を検出
- 展開後のコードは検出しない（tree-sitter の制約）

### 条件付きコンパイル

```rust
#[cfg(feature = "debug")]
pub fn debug_only() {}
```

対処方法:
- すべての `cfg` バリアントを検出
- `feature` 情報を属性として記録

### ネストした impl

```rust
impl Unit {
    pub fn new() -> Self {
        impl Default for Unit {
            fn default() -> Self {}
        }
    }
}
```

対処方法:
- 外側の impl を優先
- 内側の impl は別アイテムとして検出
