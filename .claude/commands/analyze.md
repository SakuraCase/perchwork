---
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - TodoWrite
  - Task
  - TaskOutput
  - Skill
description: コードベースを解析し構造化JSONを生成
---

# タスク

コードベースを解析し、構造化された JSON ドキュメントを生成します。

## 引数

- `$ARGUMENTS` に以下のオプションを指定可能:
  - `(デフォルト)`: 差分実行（last_commit 以降の変更ファイルのみ解析）
  - `--full`: 全ファイル再実行（Phase 1 + Phase 2）
  - `--structure`: Phase 1 のみ実行（tree-sitter 構造抽出）
  - `--semantic`: Phase 2 のみ実行（LLM 意味解析）
  - `--target <dir>`: 対象ディレクトリ（config.json の target_dir を上書き）
  - `--lang <ja|en>`: 出力言語（config.json の language を上書き）

## 初期設定（config.json）

初回実行時は `config.example.json` を `config.json` にコピーして設定を行う。

| フィールド    | 説明                                                      |
| ------------- | --------------------------------------------------------- |
| `target_dir`  | 解析対象ディレクトリ（config.json からの相対パス）        |
| `extensions`  | 対象ファイル拡張子の配列                                  |
| `exclude`     | 除外パターン（glob 形式）                                 |
| `language`    | 出力言語（`ja` または `en`など）                          |
| `last_commit` | 前回実行時のコミットハッシュ（差分検出用、初期は `null`） |
| `last_run`    | 前回実行日時（ISO 8601 形式、初期は `null`）              |

## 実行フロー

### 差分判定（デフォルト動作）

`--full` が指定されていない場合、差分実行を行う。

1. config.json の `last_commit` から HEAD までの変更ファイルを検出
2. 差分がない場合は「変更なし」と表示して終了
3. 差分がある場合、変更ファイルのみを処理
4. 処理完了後、`last_commit` を現在のコミットに更新

### 並列実行（デフォルト動作）

Phase 1 と Phase 2 の両方を実行する場合、**並列実行**する。

1. 以下を**同時に**起動（単一メッセージで複数ツール呼び出し）:
   - Phase 1: Bash ツール（`run_in_background: true`）で tree-sitter 構造抽出
   - Phase 2: Task ツールでサブエージェント群を起動（LLM 意味解析、最大 5 並列）
2. TaskOutput で全タスクの完了を待機
3. `last_commit` を更新

### Phase 1: tree-sitter 構造抽出

`--semantic` が指定されていない場合に実行。

**Bash ツールで以下を実行（並列実行時は `run_in_background: true` を指定）:**

```bash
cd .claude/skills/perchwork-structure/scripts && npm run build && node dist/analyze.js --config ../../../../config.json
```

出力: `public/data/structure/`

### Phase 2: LLM 意味解析

`--structure` が指定されていない場合に実行。

**実行前に [perchwork-semantic SKILL.md](../skills/perchwork-semantic/SKILL.md) を参照すること。**

1. 対象ファイルを収集（差分実行時は変更ファイルのみ）
2. ファイルを均等に分割（最大 5 グループ）
3. Task ツールで `general-purpose` サブエージェントを並列起動
4. TaskOutput で完了を待機

出力: `public/data/semantic/`

## 使用例

```bash
# 差分実行（デフォルト）- last_commit 以降の変更ファイルのみ
/analyze

# 全ファイル再実行
/analyze --full

# Phase 1 のみ（高速、tree-sitter 構造抽出）
/analyze --structure

# Phase 2 のみ（LLM 意味解析のみ）
/analyze --semantic

# 対象ディレクトリ指定
/analyze --target backend/src/lib/domain
```
