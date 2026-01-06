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

### Phase 2: プロンプト生成

各 SKILL.md を読み込み、一時ファイルにプロンプトを生成する。

**解析タイプと SKILL.md**:

| タイプ     | SKILL.md                                       | 実行方法                    |
| ---------- | ---------------------------------------------- | --------------------------- |
| structure  | `.claude/skills/perchwork-structure/SKILL.md`  | Bash (tree-sitter)          |
| complexity | `.claude/skills/perchwork-complexity/SKILL.md` | Bash (rust-code-analysis)   |
| semantic   | `.claude/skills/perchwork-semantic/SKILL.md`   | Task (general-purpose)      |
| review     | `.claude/skills/perchwork-review/SKILL.md`     | Task (pr-review-toolkit x6) |

**プロンプト生成手順**:

1. TODO.md から有効なタイプセクションを抽出
2. 各タイプの SKILL.md を Read ツールで読み込む
3. `.claude/ralph-loop-prompt.md` に以下の構造で出力(これ以外の構造は絶対に追加せず、TODO.md の内容は記載しないこと):

```markdown
# Perchwork Analysis Task

## パス情報

{config.json から解決したパス}

## 処理フロー

.claude/TODO.md の各タイプセクションを並列に処理する。
各タイプ内の未チェックファイル（`- [ ]`）に対して解析を実行し、完了後に `- [x]` にマークする。

## cleanup 対象がある場合

public/data 配下の対象ファイルを削除する

## 各タイプの処理内容

{各タイプの SKILL.md を読み込み、実行コマンドを動的に構築する。}

## 完了条件

全ての TODO がマーク済みの場合:

1. `.claude/TODO.md` を削除
2. `.claude/ralph-loop-prompt.md` を削除
3. config.json の`last_commit`,`last_run`を更新
4. 以下を出力

<promise>ANALYZE_COMPLETE</promise>
```

### Phase 3: 実行

#### SubAgent ありの場合 (semantic または review セクションが TODO.md に存在)

/ralph-wiggum:ralph-loop .claude/ralph-loop-prompt.md --max-iterations 3 --completion-promise "ANALYZE_COMPLETE"

#### SubAgent なしの場合 (structure と complexity のみ)

Bash スクリプトで実行

## 注意事項

- TODO.md が存在しない場合は `/analyze-prepare` を先に実行
- TODO.md は `.claude/TODO.md` に配置される
- プロンプトファイルは `.claude/ralph-loop-prompt.md` に生成される
- structure/complexity は Mode: full の場合、`--all` オプションで実行
