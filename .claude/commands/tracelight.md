---
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - TodoWrite
description: コードベースを解析し構造化JSONを生成
---

# タスク

コードベースを解析し、構造化された JSON ドキュメントを生成します。

## 参照スキル

このコマンドは以下のスキルを使用します：

- **[tracelight-analyzer](../skills/tracelight-analyzer/SKILL.md)**: tree-sitter 解析、構造抽出、出力スキーマ、検証ルール

解析対象の言語に応じて、適切な言語スキルを参照してください。

## 引数

- `$ARGUMENTS` に以下のオプションを指定可能:
  - `(デフォルト)`: 差分実行（last_commit 以降の変更ファイルのみ解析）
  - `--full`: 全ファイル再実行（Phase 1 + Phase 2）
  - `--structure`: Phase 1 のみ実行（tree-sitter 構造抽出）
  - `--semantic`: Phase 2 のみ実行（LLM 意味解析）
  - `--target <dir>`: 対象ディレクトリ（config.json の target_dir を上書き）
  - `--lang <ja|en>`: 出力言語（config.json の language を上書き）

## ディレクトリ構造

```
tools/tracelight/
├── config.json
├── .claude/skills/tracelight-analyzer/scripts/
│   └── dist/
│       └── analyze.js          # Phase 1 スクリプト
└── public/data/                # 最終出力
    ├── index.json              # インデックス
    ├── entity/                 # Phase 1 出力（構文情報）
    │   └── battle_state.json
    └── semantic/               # Phase 2 出力（意味情報）
        └── entity/
            └── battle_state.json
```

## 実行フロー

### 差分判定（デフォルト動作）

`--full` が指定されていない場合、差分実行を行う。

1. **変更ファイルの検出**

   ```bash
   # config.json の last_commit から HEAD までの変更ファイルを取得
   git diff --name-only <last_commit> HEAD -- <target_dir>
   ```

2. **差分がない場合**
   - 「変更なし」と表示して終了

3. **差分がある場合**
   - 変更されたファイルのみを Phase 1 + Phase 2 で処理
   - 処理完了後、config.json の `last_commit` を現在のコミットハッシュに更新

### Phase 1: tree-sitter 構造抽出

`--semantic` が指定されていない場合に実行。

1. **設定読み込み**

   - config.json を読み込む
   - `target_dir`, `extensions`, `exclude`, `language` 設定を取得
   - `$ARGUMENTS` でオプションが指定されていれば上書き

2. **tree-sitter 解析実行**

   ```bash
   cd .claude/skills/tracelight-analyzer/scripts && node dist/analyze.js --config ../../../../config.json
   ```

   - tree-sitter を使用して決定的な構造解析を実行
   - 関数/構造体/enum/trait の検出
   - 行番号、シグネチャ、呼び出し関係の抽出
   - テスト関数の検出
   - 出力: `public/data/` ディレクトリ

3. **出力確認**
   - `public/data/index.json` の存在を確認
   - 統計情報をログ出力

### Phase 2: LLM 意味解析

`--structure` が指定されていない場合に実行。

**重要: エージェントを起動しない。ファイル単位でループ処理する。**

1. **対象ファイルの収集**

   config.json の `target_dir` から .rs ファイルを収集（差分実行時は変更ファイルのみ）

2. **ファイル単位で意味解析**

   ```
   for each .rs file in target_dir:
       a. Read source file directly (元ソースファイルを直接読み込み)
       b. 各 item に対して意味情報を生成:
          - summary: 1行説明（language設定に従い日本語/英語、最大50文字）
          - responsibility: 責務説明（struct/enum のみ、最大100文字）
       c. 各 test に対して意味情報を生成:
          - summary: テストの目的（最大50文字）
          - tested_item: テスト対象のアイテムID（1つ）
       d. Write public/data/semantic/{relative_path}.json
   ```

3. **エラーハンドリング**
   - ファイルあたり最大3回リトライ
   - 失敗時はスキップしてログ出力

4. **完了処理**
   - config.json の `last_commit` を現在のコミットハッシュに更新

## semantic/{file}.json フォーマット

```json
{
  "path": "entity/battle_state.rs",
  "generated_at": "2025-12-30T12:00:00.000Z",
  "items": [
    {
      "id": "battle_state.rs::BattleState::struct",
      "responsibility": "バトルの状態を管理するエンティティ"
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

## LLM プロンプト設計

Phase 2 で各ファイルに対して以下のプロンプトを使用：

```markdown
# 意味解析タスク

以下の Rust ソースコードを解析し、各アイテムとテストに対して意味情報を生成してください。

## 入力
{source_code}

## 出力形式

### items 配列
各 item に対して以下を生成:
- id: "ファイル名::型名::種別" または "ファイル名::型名::メソッド名::method" の形式
- summary: 1行説明（日本語、最大50文字）※関数/メソッドのみ
- responsibility: 責務説明（struct/enum のみ、日本語、最大100文字）

### tests 配列
各 test に対して以下を生成:
- id: "ファイル名::テスト名::test" の形式
- summary: テストの目的（日本語、最大50文字）
- tested_item: テスト対象のアイテムID（1つ。テスト内で最も重要な呼び出し先を推定）

## 出力
JSON形式で { "items": [...], "tests": [...] } を返してください。
```

## エラーハンドリング

| エラー                             | 対応                             |
| ---------------------------------- | -------------------------------- |
| config.json が存在しない           | エラーメッセージ表示、処理中断   |
| target_dir が存在しない            | エラーメッセージ表示、処理中断   |
| tree-sitter スクリプトが未ビルド   | エラーメッセージ表示、ビルド指示 |
| tree-sitter 依存関係未インストール | エラーメッセージ表示、npm install 指示 |
| tree-sitter パースエラー           | 該当ファイルスキップ、ログ出力   |
| LLM 解析失敗                       | 3回リトライ、失敗時スキップ      |

## 使用例

```bash
# 差分実行（デフォルト）- last_commit 以降の変更ファイルのみ
/tracelight

# 全ファイル再実行
/tracelight --full

# Phase 1 のみ（高速、tree-sitter 構造抽出）
/tracelight --structure

# Phase 2 のみ（LLM 意味解析のみ）
/tracelight --semantic

# 対象ディレクトリ指定
/tracelight --target backend/src/lib/domain
```
