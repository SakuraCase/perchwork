---
name: perchwork-semantic
description: LLM を使った意味解析スキル。structure データを元に、各アイテムの説明とテスト対象を生成する。
---

# Perchwork Semantic

## Overview

LLM を使って Rust コードの意味解析を行い、以下を生成する:

- **summary**: アイテムの 1 行説明（最大 50 文字）
- **responsibility**: 構造体/enum の責務説明（最大 100 文字）
- **tested_item**: テストが検証する対象アイテムの ID

## Usage

`/analyze` コマンドの Phase 2 で自動実行される。

前提条件:

- `public/data/structure/` が生成済みであること

## Output

```
public/data/semantic/
├── entity/
│   └── battle_state.json
├── service/
│   └── battle_loop.json
└── ...
```

### JSON フォーマット

```json
{
  "path": "entity/battle_state.rs",
  "generated_at": "2025-12-30T...",
  "items": [
    {
      "id": "battle_state::BattleState::struct",
      "summary": "バトルの状態を管理するエンティティ",
      "responsibility": "プレイヤーレベルのプロパティを管理"
    },
    {
      "id": "battle_state::BattleState::new::method",
      "summary": "マスターデータからバトル状態を初期化"
    }
  ],
  "tests": [
    {
      "id": "battle_state::test_battle_state_new::test",
      "summary": "BattleState::newが正しく初期化されることを検証",
      "tested_item": "battle_state::BattleState::new::method"
    }
  ]
}
```

## ID 命名規則

- struct: `ファイル名::型名::struct`
- enum: `ファイル名::型名::enum`
- method: `ファイル名::型名::メソッド名::method`
- function: `ファイル名::関数名::function`
- test: `ファイル名::テスト名::test`

## 出力パス変換ルール

ソースファイルの相対パスから `.rs` 拡張子を除去し `.json` に置換する。
ディレクトリ構造は保持する。

| ソースファイル（相対パス）  | 出力ファイル                           |
| --------------------------- | -------------------------------------- |
| entity/battle_state.rs      | semantic/entity/battle_state.json      |
| entity/mod.rs               | semantic/entity/mod.json               |
| master/hero_config.rs       | semantic/master/hero_config.json       |
| constants.rs                | semantic/constants.json                |
| value_object/player_side.rs | semantic/value_object/player_side.json |

**注意**:

- ファイル名の `.rs` → `.json` 変換を必ず行う（`.rs.json` は不可）
- target_dir からの相対パスを維持する

## サブエージェントプロンプトテンプレート

Phase 2 でサブエージェントに渡すプロンプト：

````markdown
# 意味解析タスク（並列グループ処理）

以下のファイルに対して意味解析を実行し、JSON ファイルを生成してください。

## 対象ファイル

{file_list} # 例: entity/battle_state.rs, entity/battle_world.rs, ...

## 作業ディレクトリ

- ソースファイル: {target_dir}
- 出力先: {output_base}/semantic/

## 各ファイルの処理手順

1. Read ツールでソースファイルを読み込み
2. ソースコードを解析し、以下の意味情報を生成:
   - items: 各関数/メソッド/struct/enum の説明
   - tests: 各テストの目的とテスト対象
3. Write ツールで出力（**パス変換必須**）

## 出力パス変換（重要）

**`.rs` を `.json` に置換する。`.rs.json` は禁止。**

```
入力: entity/battle_state.rs
出力: {output_base}/semantic/entity/battle_state.json
      ↑ .rs を削除して .json に置換
```

| ソースファイル              | 出力先                                         |
| --------------------------- | ---------------------------------------------- |
| entity/battle_state.rs      | {output_base}/semantic/entity/battle_state.json |
| service/battle_loop.rs      | {output_base}/semantic/service/battle_loop.json |
| mod.rs                      | {output_base}/semantic/mod.json                |

## 出力フォーマット

```json
{
  "path": "{relative_path}",
  "generated_at": "ISO8601形式",
  "items": [
    {
      "id": "ファイル名::型名::種別",
      "summary": "1行説明（{language}、最大50文字）",
      "responsibility": "責務説明（struct/enumのみ、最大100文字）"
    }
  ],
  "tests": [
    {
      "id": "ファイル名::テスト名::test",
      "summary": "テストの目的（{language}、最大50文字）",
      "tested_item": "テスト対象のアイテムID"
    }
  ]
}
```
````

## 注意事項

- summary は最大 50 文字
- responsibility は struct/enum のみ、最大 100 文字
- tested_item はテスト内で最も重要な呼び出し先を推定
- エラー発生時は最大 3 回リトライ、失敗時はスキップ

処理完了後、成功/スキップしたファイルの一覧を報告してください。
