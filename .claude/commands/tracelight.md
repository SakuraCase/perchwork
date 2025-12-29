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

- **[tracelight-analysis](../skills/tracelight-knowledge/SKILL.md)**: 出力スキーマ、検証ルール、エラー復旧パターン

解析対象の言語に応じて、適切な言語スキルを参照してください。

## 引数

- `$ARGUMENTS` に以下のオプションを指定可能:
  - `--target <dir>`: 対象ディレクトリ（config.json の target_dir を上書き）
  - `--full`: 全体再生成（差分更新ではなく全ファイル解析）
  - `--since <commit>`: 差分の基準コミット（config.json の last_commit を上書き）
  - `--lang <ja|en>`: 出力言語（config.json の language を上書き）

## 実行フロー

1. **設定読み込み**

   - config.json を読み込む
   - `target_dir`, `split_depth`, `extensions`, `exclude`, `language` 設定を取得
   - `language` のデフォルトは `"ja"`（日本語）
   - `$ARGUMENTS` でオプションが指定されていれば上書き

2. **対象ファイル特定**

   - `--full` 指定時 または `last_commit` が null → 全ファイル対象
   - それ以外 → `git diff --name-only <last_commit>` で変更ファイルのみ取得
   - `extensions` と `exclude` でフィルタリング

3. **ファイル解析**

   - 対象ファイルの拡張子から言語を判定（SKILL.md の Language Detection 参照）
   - 言語別スキル（rust.md, typescript.md）を参照して解析:
     - 関数/構造体/クラス/インターフェース等を抽出
     - 1 行概要と責務説明を `language` 設定に従って生成（ja=日本語, en=英語）
     - テスト関数との紐付けを解析
     - 呼び出し関係を解析

4. **検証**

   - SKILL.md の Validation Rules に従って検証
   - JSON スキーマバリデーション
   - ID 一意性チェック
   - 参照整合性チェック
   - エラーがあればログ出力、該当項目をスキップ

5. **出力生成**

   - SKILL.md の Output Schema に従って出力:
     - `public/data/index.json` - メインインデックス
     - `public/data/<path>/*.json` - 分割コードデータ
     - `public/data/search_index.json` - 検索インデックス
     - `public/data/call_graph/index.json` - コールグラフインデックス
     - `public/data/call_graph/*.json` - 分割グラフデータ

6. **設定更新**
   - config.json の `last_commit` を現在の HEAD に更新
   - `last_run` を現在時刻に更新

## エラーハンドリング

SKILL.md の Error Recovery に従って処理：

| エラー                   | 対応                             |
| ------------------------ | -------------------------------- |
| config.json が存在しない | エラーメッセージ表示、処理中断   |
| target_dir が存在しない  | エラーメッセージ表示、処理中断   |
| git コマンド使用不可     | 全ファイル解析にフォールバック   |
| スキーマ違反             | エラーログ出力、該当項目スキップ |
| LLM 解析失敗             | 3 回リトライ、失敗時スキップ     |

## 使用例

```bash
# 初回実行（全ファイル解析）
/tracelight

# 差分更新（前回コミットからの変更のみ）
/tracelight

# 全体再生成
/tracelight --full

# 特定コミットからの差分
/tracelight --since abc123

# 対象ディレクトリ指定
/tracelight --target backend/src/lib/domain
```
