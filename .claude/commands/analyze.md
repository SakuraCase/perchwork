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
  - Edit
description: コードベースを解析し構造化JSONを生成
---

# タスク

コードベースを解析し、構造化された JSON ドキュメントを生成します。

## 初期設定（config.json）

初回実行時は `config.example.json` を `config.json` にコピーして設定を行う。

| フィールド       | 説明                                                      |
| ---------------- | --------------------------------------------------------- |
| `target_dir`     | 解析対象ディレクトリ（config.json からの相対パス）        |
| `extensions`     | 対象ファイル拡張子の配列                                  |
| `exclude`        | 除外パターン（glob 形式）                                 |
| `language`       | 出力言語（`ja` または `en`など）                          |
| `run.structure`  | 構造解析の実行有無（デフォルト: `true`）                  |
| `run.semantic`   | 意味解析の実行有無（デフォルト: `true`）                  |
| `run.complexity` | 複雑度解析の実行有無（デフォルト: `true`）                |
| `run.review`     | コードレビューの実行有無（デフォルト: `false`）           |
| `last_commit`    | 前回実行時のコミットハッシュ（差分検出用、初期は `null`） |
| `last_run`       | 前回実行日時（ISO 8601 形式、初期は `null`）              |

## 実行フロー

### Phase 1: 準備

1. `config.json` を読み込み、`run` フラグを確認
2. `.claude/TODO.md` を読み込み、タイプ別の未チェックファイル数を取得
3. 有効な解析タイプの SKILL.md をすべて読み込み

### Phase 2: 実行

TODO.md の各セクションを順番に処理する。各セクションの処理完了後、TODO.md の該当ファイルを `- [x]` にマークする。

#### cleanup セクション

public/data 配下の対象ファイル（structure, semantic, complexity, review）を削除する。

#### structure セクション

`.claude/skills/perchwork-structure/SKILL.md` を参照して実行。

- Mode: full の場合は `--all` オプションを使用
- ファイルリストは TODO.md の未チェック項目をカンマ区切りで指定

#### complexity セクション

`.claude/skills/perchwork-complexity/SKILL.md` を参照して実行。

- Mode: full の場合は `--all` オプションを使用
- ファイルリストは TODO.md の未チェック項目をカンマ区切りで指定

#### semantic セクション

`.claude/skills/perchwork-semantic/SKILL.md` を参照して実行。

- TODO.md の未チェックファイルを取得
- Task ツール (general-purpose) で SKILL.md のサブエージェントプロンプトテンプレートに従って実行

#### review セクション

`.claude/skills/perchwork-review/SKILL.md` を参照して実行。

- TODO.md の未チェックファイルを取得
- ファイルごとに Task ツールで エージェントを並列実行

### Phase 3: 完了処理

すべての TODO が処理完了した場合：

1. `.claude/TODO.md` を削除
2. config.json の `last_commit` を現在の HEAD コミットハッシュに更新
3. config.json の `last_run` を現在時刻（ISO 8601 形式）に更新

## 注意事項

- TODO.md が存在しない場合は `/analyze-prepare` を先に実行
- TODO.md は `.claude/TODO.md` に配置される
- 各セクションの処理中にエラーが発生した場合は、エラーを報告して次のセクションに進む
