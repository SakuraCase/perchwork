---
name: perchwork-analyzer
description: tree-sitter を使った Rust コード解析ツール。コードベースの構造を解析し、public/data/ ディレクトリに構造化JSONを生成する。
---

# Perchwork Analyzer

## Overview

tree-sitter を使って Rust コードを静的解析し、構造化されたJSONデータを生成するスキル。

### 主要機能

- Rust コードの構文解析（関数、構造体、トレイト、列挙型）
- 構造化JSONの生成（public/data/）
- 設定ファイルベースの柔軟な解析制御

## Usage

このスキルは `/perchwork` コマンドから自動的に呼び出されます。

### 手動実行（開発・デバッグ用）

```bash
# スクリプトディレクトリに移動
cd tools/perchwork/.claude/skills/perchwork-analyzer/scripts

# 依存関係のインストール（初回のみ）
npm install

# TypeScript のビルド
npm run build

# 解析実行
node dist/analyze.js --config ../../../../config.json
```

出力: `public/data/` ディレクトリ

## Configuration

`config.json` の設定例:

```json
{
  "target_dir": "../../backend/src/lib/domain/core/battle",
  "output_base": "public/data",
  "extensions": [".rs"],
  "exclude": ["**/tests/**", "**/test_*.rs"],
  "language": "ja"
}
```

### 設定項目

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `target_dir` | string | 解析対象のディレクトリ |
| `output_base` | string | 最終出力先ディレクトリ（public/data/） |
| `extensions` | string[] | 対象ファイル拡張子 |
| `exclude` | string[] | 除外パターン |
| `language` | string | 出力言語（ja/en） |

## Output Structure

### 2-Phase アーキテクチャ

```
public/data/
├── structure/                    # Phase 1 出力（tree-sitter構文情報）
│   ├── index.json                # インデックス
│   ├── call_graph/
│   │   └── edges.json            # コールグラフ
│   ├── entity/
│   │   ├── battle_state.json
│   │   └── battle_world.json
│   └── service/
│       └── battle_loop.json
└── semantic/                     # Phase 2 出力（LLM意味解析）
    ├── entity/
    │   ├── battle_state.json
    │   └── battle_world.json
    └── service/
        └── battle_loop.json
```

### index.json 構造

```json
{
  "version": "2.0",
  "generated_at": "2025-12-30T...",
  "target_dir": "/path/to/backend/src/lib/domain/core/battle",
  "stats": {
    "total_files": 21,
    "total_items": 116,
    "total_tests": 61,
    "total_edges": 523
  },
  "files": [
    { "path": "entity/battle_state.json", "items": 5, "tests": 3 },
    { "path": "entity/battle_world.json", "items": 3, "tests": 2 }
  ]
}
```

### 個別ファイル JSON 構造（Phase 1）

```json
{
  "path": "entity/battle_state.rs",
  "items": [
    {
      "id": "battle_state.rs::BattleState::struct",
      "type": "struct",
      "name": "BattleState",
      "line_start": 10,
      "line_end": 25,
      "visibility": "pub",
      "signature": "pub struct BattleState { ... }",
      "fields": ["id", "players", "board"]
    },
    {
      "id": "battle_state.rs::BattleState::new::method",
      "type": "method",
      "name": "new",
      "line_start": 30,
      "line_end": 45,
      "visibility": "pub",
      "signature": "pub fn new(masters: BattleMaster, config: &GameConfig) -> Self",
      "is_async": false,
      "impl_for": "BattleState"
    }
  ],
  "tests": [
    {
      "id": "battle_state.rs::test_battle_state_new::test",
      "name": "test_battle_state_new",
      "line_start": 100,
      "is_async": false
    }
  ]
}
```

### call_graph/edges.json 構造（Phase 1）

```json
{
  "generated_at": "2025-12-30T...",
  "total_edges": 523,
  "edges": [
    {
      "from": "battle_state.rs::BattleState::new::method",
      "to": "HashMap::new",
      "file": "battle_state.rs",
      "line": 35
    },
    {
      "from": "battle_state.rs::test_battle_state_new::test",
      "to": "BattleState::new",
      "file": "battle_state.rs",
      "line": 102
    }
  ]
}
```

### semantic ファイル JSON 構造（Phase 2）

```json
{
  "path": "entity/battle_state.rs",
  "generated_at": "2025-12-30T...",
  "items": [
    {
      "id": "battle_state.rs::BattleState::struct",
      "summary": "バトルの状態を管理するエンティティ",
      "responsibility": "プレイヤーレベルのプロパティを管理"
    },
    {
      "id": "battle_state.rs::BattleState::new::method",
      "summary": "マスターデータからバトル状態を初期化"
    }
  ],
  "tests": [
    {
      "id": "battle_state.rs::test_battle_state_new::test",
      "summary": "BattleState::newが正しく初期化されることを検証",
      "tested_item": "battle_state.rs::BattleState::new::method"
    }
  ]
}
```

## Extracted Fields

### ExtractedItem（Phase 1）

| 項目 | 型 | 説明 |
|------|-----|------|
| `id` | string | ユニークID（ファイル名::型名::メンバー名::種別） |
| `type` | string | function, method, struct, enum, trait |
| `name` | string | 名前 |
| `line_start`, `line_end` | number | 開始・終了行番号 |
| `visibility` | string | pub, pub(crate), private |
| `signature` | string | シグネチャ文字列（200文字上限） |
| `fields` | string[] | 構造体のフィールド一覧 / enumのバリアント |
| `is_async` | boolean | 非同期関数かどうか |
| `impl_for` | string | impl対象の型名（メソッドの場合） |
| `trait_name` | string | 実装しているtrait名（trait実装の場合） |

### TestInfo（Phase 1）

| 項目 | 型 | 説明 |
|------|-----|------|
| `id` | string | テスト関数のユニークID |
| `name` | string | テスト関数名 |
| `line_start` | number | 開始行番号 |
| `is_async` | boolean | 非同期テストかどうか |

### CallEdge（Phase 1 - call_graph/edges.json）

| 項目 | 型 | 説明 |
|------|-----|------|
| `from` | string | 呼び出し元のアイテムID |
| `to` | string | 呼び出し先の関数/メソッド名 |
| `file` | string | 呼び出しが発生したファイル名 |
| `line` | number | 呼び出しが発生した行番号 |

### SemanticItem（Phase 2）

| 項目 | 型 | 説明 |
|------|-----|------|
| `id` | string | 対応するアイテムのID |
| `summary` | string | 1行説明（最大50文字） |
| `responsibility` | string | 責務説明（struct/enumのみ、最大100文字） |

### SemanticTest（Phase 2）

| 項目 | 型 | 説明 |
|------|-----|------|
| `id` | string | テストのID |
| `summary` | string | テストの目的（最大50文字） |
| `tested_item` | string | テスト対象のアイテムID |

## 2-Phase Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: tree-sitter 解析（決定論的・高速）                   │
├─────────────────────────────────────────────────────────────┤
│  ソースコード (.rs)                                          │
│       │                                                     │
│       ▼                                                     │
│  tree-sitter 解析（ファイル単位）                            │
│       │                                                     │
│       ▼                                                     │
│  public/data/                                               │
│  ├── index.json                                             │
│  └── {layer}/{file}.json                                    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: LLM 意味解析（サブエージェント並列実行）             │
├─────────────────────────────────────────────────────────────┤
│  ファイルをグループに分割（最大5グループ）                    │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                       │
│  │ Agent 1 │ │ Agent 2 │ │ Agent N │  (並列実行)           │
│  │ Group 1 │ │ Group 2 │ │ Group N │                       │
│  └────┬────┘ └────┬────┘ └────┬────┘                       │
│       │           │           │                             │
│       ▼           ▼           ▼                             │
│  ├── Read: ソースコード読み込み                              │
│  ├── LLM: summary/responsibility/tested_item 生成           │
│  └── Write: semantic/{layer}/{file}.json 出力               │
│       │           │           │                             │
│       └───────────┴───────────┘                             │
│                   │                                         │
│                   ▼                                         │
│         TaskOutput で結果収集                                │
└─────────────────────────────────────────────────────────────┘
```

## フロントエンドでのマージ

```typescript
// フロントエンドで両方読み込み、マージ
const structure = await fetch('/data/structure/entity/battle_state.json');
const semantic = await fetch('/data/semantic/entity/battle_state.json');

const merged = structure.items.map(item => ({
  ...item,
  ...semantic.items.find(s => s.id === item.id)
}));

// tested_by の逆引き計算
const testedBy = {};
semantic.tests.forEach(test => {
  if (test.tested_item) {
    testedBy[test.tested_item] = testedBy[test.tested_item] || [];
    testedBy[test.tested_item].push(test.id);
  }
});
```

## Command Options

```bash
/perchwork                    # Phase 1 + Phase 2（デフォルト）
/perchwork --structure        # Phase 1 のみ（高速）
/perchwork --semantic         # Phase 2 のみ
```

## Error Handling

| エラー種別 | 原因 | 対応 |
|-----------|------|------|
| `ScriptNotFound` | analyze.js が存在しない | エラー表示、処理中断 |
| `DependenciesNotInstalled` | npm install 未実行 | エラー表示、インストール指示 |
| `BuildNotDone` | TypeScript がビルドされていない | エラー表示、npm run build 指示 |
| `ConfigNotFound` | config.json が存在しない | エラー表示、処理中断 |
| `ParseError` | tree-sitter 解析エラー | 該当ファイルスキップ、ログ記録 |
| `FileReadError` | ファイル読み込みエラー | 該当ファイルスキップ、ログ記録 |

## Development

### Directory Structure

```
perchwork-analyzer/
├── SKILL.md                # このファイル
├── languages/
│   └── rust.md            # Rust 解析パターン
└── scripts/
    ├── package.json       # Node.js 依存関係
    ├── tsconfig.json      # TypeScript 設定
    ├── analyze.ts         # メインスクリプト
    └── dist/
        └── analyze.js     # コンパイル後のスクリプト
```

### Build & Test

```bash
# ビルド
cd .claude/skills/perchwork-analyzer/scripts
npm run build

# 解析実行
node dist/analyze.js --config ../../../../config.json
```

## Dependencies

- **tree-sitter**: ネイティブバインディング
- **tree-sitter-rust**: Rust 文法定義
- **TypeScript**: 型安全なスクリプト開発
