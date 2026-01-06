---
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
description: 解析チェックリスト（TODO.md）を作成
---

# タスク

解析対象ファイルのチェックリスト（TODO.md）を作成します。

## 引数

- `$ARGUMENTS` に以下のオプションを指定可能:
  - `(デフォルト)`: 差分モード（last_commit 以降の変更ファイル）
  - `--full`: 全ファイルモード（除外パターン以外の全ファイル）

## 出力

`.claude/TODO.md` に以下の形式でチェックリストを生成:

```markdown
# Analysis Checklist

Generated: 2026-01-06T10:00:00Z
Target: last_commit..HEAD
Mode: diff
Files: 15
Types: structure, semantic, complexity

## cleanup

- [ ] entity/old_file.json
- [ ] service/removed_service.json

## structure

- [ ] entity/battle_state.rs
- [ ] entity/unit.rs

## semantic

- [ ] entity/battle_state.rs
- [ ] entity/unit.rs

## complexity

- [ ] entity/battle_state.rs
- [ ] entity/unit.rs
```

## 実行手順

### 1. 設定読み込み

`config.json` を読み込み、以下を取得:

- `target_dir`: 解析対象ディレクトリ
- `extensions`: 対象ファイル拡張子
- `exclude`: 除外パターン
- `last_commit`: 前回コミットハッシュ
- `run`: 実行対象タイプ
  - `run.structure`: 構造解析
  - `run.semantic`: 意味解析
  - `run.complexity`: 複雑度解析
  - `run.review`: コードレビュー

### 2. 有効タイプの確認

`run` オブジェクトから `true` のタイプを抽出し、リスト化する。
順序: structure → semantic → complexity → review

### 3. ファイル収集

#### 差分モード（デフォルト）

1. git diff で変更・追加ファイルを検出:
   ```bash
   git diff --name-only --diff-filter=AM <last_commit>..HEAD -- <target_dir>
   ```
2. 削除ファイルを検出:
   ```bash
   git diff --name-only --diff-filter=D <last_commit>..HEAD -- <target_dir>
   ```
3. 削除ファイルをリスト化（cleanup 用）
4. 変更がない場合は「変更なし」と表示

#### 全ファイルモード（--full）

1. target_dir 配下の全ファイルを収集
2. exclude パターンに一致するものを除外

### 4. TODO.md 生成

1. ヘッダー情報を書き込み（Generated, Target, Mode, Files, Types）
2. **削除ファイルがある場合**、最初に `## cleanup` セクションを生成:
   - 削除されたソースファイルをリスト化
   - 削除ファイルがない場合はセクション自体を省略
3. 有効な各タイプごとにセクション（`## type`）を作成
4. 各セクションにファイルリストをチェックボックス形式で書き込み
5. パスは target_dir からの相対パス

### 5. 完了報告

- 生成されたファイル数
- 有効なタイプ数
- TODO.md のパスを表示

## 使用例

```bash
# 差分モード（前回コミット以降の変更ファイル）
/analyze-prepare

# 全ファイルモード
/analyze-prepare --full
```

## 注意事項

- 既存の TODO.md は上書きされる
- チェック済み（[x]）のファイルは `/analyze` 実行時にスキップされる
- 手動で TODO.md を編集してファイルを追加/除外可能
- `run.*: false` のタイプはセクション自体が生成されない
- `## cleanup` セクションは削除ファイルがある場合のみ生成される
- cleanup のファイル削除は `/analyze` 実行時に**最初に**一括処理される
