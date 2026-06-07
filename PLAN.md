# Perchwork 脱 Claude/LLM 依存化計画

## 目的

Perchwork から Claude Code 固有のコマンド、Claude Skill 配置、Google GenAI API キー依存、LLM 前提の生成機能を外す。残す機能は、ローカルで再現可能なコマンドベースの静的解析と、その結果 JSON を表示するフロントエンドに限定する。

## 現状の簡易概要

Perchwork は React + Vite のローカル可視化ツールで、`public/data/*` に生成された JSON を読み込み、構造、コールグラフ、スキーマ、複雑度、重複、レビュー、ノートを表示している。

現在の解析・生成導線は `.claude/` に強く寄っている。

- `.claude/commands/analyze.md`: Claude Code の `/analyze` 用手順。`Task`、`Skill`、`TodoWrite` 前提。
- `.claude/commands/analyze-prepare.md`: `.claude/TODO.md` を作る Claude Code 用手順。
- `.claude/commands/i.md`: Claude Code 上での調査コマンド。
- `.claude/commands/w.md`: 会話履歴からセッション/ドキュメント TSX を生成する LLM 前提コマンド。
- `.claude/settings.json`: Claude Skill と `pr-review-toolkit@claude-plugins-official` を有効化。
- `.claude/skills/generate-image`: `@google/genai` と `PERCHWORK_GOOGLE_GENAI_API_KEY` を使う画像生成。
- `.claude/skills/perchwork-semantic`: LLM で summary/responsibility/tested_item を生成。
- `.claude/skills/perchwork-review`: pr-review-toolkit の LLM エージェントでレビュー結果を生成。
- `.claude/skills/perchwork-duplication`: Phase 1/2 は `jscpd` とスクリプト、Phase 3 は LLM 判断。
- `.claude/skills/perchwork-structure`: `tree-sitter` による Rust 構造解析スクリプト。
- `.claude/skills/perchwork-complexity`: `rust-code-analysis-cli` による複雑度解析スクリプト。

フロントエンド側にも Claude/LLM 前提が残っている。

- `src/App.tsx`: データなし画面で Claude Code `/analyze` を案内。
- `src/components/note/NoteEmptyState.tsx`: Claude Code `/i` と `/w` を案内。
- `src/types/schema.ts`: `semantic/*.json` を LLM 出力として定義。
- `src/services/semanticLoader.ts`、`src/hooks/useDataLoader.ts`: semantic JSON を読み込んで summary/test 紐付けを補完。
- `src/types/review.ts`、`src/components/review/*`、`src/hooks/useReviewDataLoader.ts`: LLM レビュー結果の表示。
- `src/types/duplication.ts`、`src/components/duplication/*`: LLM 判断結果や Claude Code 用プロンプトを扱う。

## 残すもの

ローカルコマンドで再現可能な静的解析は残す。

- 構造解析: `tree-sitter` / `tree-sitter-rust` による item/test/call graph 抽出。
- 複雑度解析: `rust-code-analysis-cli` による CC、Cognitive、MI、LOC、Halstead などの取得。
- 重複検出: `jscpd` による重複ペア検出と、既存スクリプトのグループ化・類似グループマージ・統計算出。
- フロントエンド表示: `public/data/structure`、`public/data/complexity`、`public/data/duplication` の表示。
- `config.json` 相当の設定: `target_dir`、対象拡張子、除外パターン、実行対象フラグ、差分実行用 `last_commit`。

## 削除または置き換えるもの

LLM 依存の機能は、別 LLM への置き換えではなく、削除または機械的な静的解析に置き換える。

| 対象 | 方針 |
| --- | --- |
| `.claude/commands/*` | 削除。CLI サブコマンドと npm scripts に置き換える。 |
| `.claude/settings.json` | 削除。Claude plugin/skill 設定を持たない。 |
| `.claude/TODO.md` | 削除。必要なら CLI 管理の `work/analysis-checklist.md` に移す。 |
| `generate-image` skill | 削除。`@google/genai`、API キー、画像生成プロンプト資料を削除。 |
| `semantic` skill | 削除。summary/responsibility は構造解析由来の機械的ラベル、doc comment 抽出、または未表示にする。 |
| `review` skill の LLM エージェント | 削除。レビュータブは一旦削除、または将来 `eslint`、`tsc`、`cargo clippy`、`cargo test` 等の診断ビューに置き換える。 |
| duplication Phase 3 LLM 判断 | 削除。severity/needs_fix/explanation はヒューリスティックにするか表示しない。 |
| Claude Code 用プロンプト生成/コピー | 削除。必要なら「修正候補」ではなく構造化された機械的なリファクタリング情報だけを残す。 |
| `/i` `/w` ノート生成 | 削除。ノート機能を残す場合は手動追加の Markdown/TSX 表示に限定する。 |

## 新しいディレクトリ構造案

`.claude` 配下に実装を置かない。解析ツールは通常のプロジェクト資産として管理する。

```text
.
├── tools/
│   └── perchwork/
│       ├── cli/
│       │   ├── analyze.ts
│       │   ├── prepare.ts
│       │   └── cleanup.ts
│       ├── analyzers/
│       │   ├── structure/
│       │   ├── complexity/
│       │   └── duplication/
│       ├── shared/
│       │   ├── config.ts
│       │   ├── fileCollector.ts
│       │   └── outputPaths.ts
│       ├── package.json
│       └── tsconfig.json
├── public/
│   └── data/
│       ├── structure/
│       ├── complexity/
│       └── duplication/
├── work/
│   └── analysis-checklist.md
├── config.example.json
├── config.json
└── src/
```

候補として `tools/perchwork/package.json` を分けるか、ルート `package.json` に解析依存を統合する。運用を単純にするならルート npm scripts から直接実行できる形を優先する。

## CLI コマンド案

Claude Code のスラッシュコマンドは npm scripts / CLI に置き換える。

```json
{
  "scripts": {
    "analyze": "tsx tools/perchwork/cli/analyze.ts",
    "analyze:prepare": "tsx tools/perchwork/cli/prepare.ts",
    "analyze:structure": "tsx tools/perchwork/analyzers/structure/analyze.ts --config config.json",
    "analyze:complexity": "tsx tools/perchwork/analyzers/complexity/analyze.ts --config config.json",
    "analyze:duplication": "tsx tools/perchwork/analyzers/duplication/analyze.ts --config config.json"
  }
}
```

実装時は `tsx` を使うか、事前ビルドして `node dist/...` で実行するかを決める。CI や配布を考えるならビルド済み `node dist/...` の方が安定する。

## 設定方針

`config.example.json` は LLM 実行フラグを持たない形にする。

```json
{
  "target_dir": "../projects/src",
  "extensions": [".rs"],
  "exclude": ["**/mod.rs"],
  "language": "rust",
  "run": {
    "structure": true,
    "complexity": true,
    "duplication": true
  },
  "last_commit": null,
  "last_run": null
}
```

`semantic` と `review` は設定から削除する。将来、静的診断ビューを追加する場合は `diagnostics` のような LLM と無関係な名前で追加する。

## データスキーマ方針

残す出力:

- `public/data/structure/index.json`
- `public/data/structure/call_graph/edges.json`
- `public/data/structure/**/*.json`
- `public/data/complexity/index.json`
- `public/data/complexity/**/*.json`
- `public/data/duplication/index.json`
- `public/data/duplication/raw/**/*.json`
- `public/data/duplication/duplicates/*.json`

削除対象:

- `public/data/semantic/**`
- `public/data/review/**`

置き換え候補:

- semantic summary は `structure` 側に `doc_comment_summary` や `display_label` として機械的に付与する。
- test 紐付けは LLM 推定ではなく、テスト関数からの call graph edge で確定できるものだけ表示する。
- review は将来 `public/data/diagnostics/**` として、`eslint`、`tsc`、`cargo clippy`、`cargo test` などの結果を正規化して表示する。

## フロントエンド修正方針

1. Claude Code の表示文言を通常 CLI の案内に変更する。
   - 例: `npm run analyze` を実行して JSON を生成してください。
2. semantic 読み込みを optional 補完として残さない。
   - `src/services/semanticLoader.ts` を削除。
   - `fetchSemanticFile` を削除。
   - `useDataLoader` は structure の情報だけで表示を構築する。
3. review 機能を削除または diagnostics へ置き換える。
   - 最短移行では `review` タブ、`src/components/review/*`、`src/hooks/useReviewDataLoader.ts`、`src/services/reviewLoader.ts`、`src/types/review.ts` を削除。
4. duplication の LLM 判定表示を削る。
   - 「LLM解析結果」「実行プロンプト」「Copy prompt」を削除。
   - 残す場合は重複箇所数、行数、トークン数、機械的 refactoring strategy のみにする。
5. note 生成導線を削る。
   - `/i` `/w` の案内を削除。
   - ノート機能を残す場合は、手動で配置された `src/generated` の閲覧専用にする。

## 移行手順

### Phase 1: 依存点の切り分け

- `.claude/skills/perchwork-structure/scripts` を `tools/perchwork/analyzers/structure` へ移す。
- `.claude/skills/perchwork-complexity/scripts` を `tools/perchwork/analyzers/complexity` へ移す。
- `.claude/skills/perchwork-duplication/scripts` を `tools/perchwork/analyzers/duplication` へ移す。
- ハードコードされた `.claude/skills/...` パスを新配置に合わせて修正する。
- 解析用 `package.json` / `tsconfig.json` / lockfile の扱いを統一する。

### Phase 2: CLI runner の実装

- `analyze:prepare` 相当を TypeScript CLI として実装する。
- `work/analysis-checklist.md` を生成するか、チェックリストを持たずに直接差分解析する方式へ寄せる。
- `analyze` は `config.json` の `run` に従い、structure → complexity → duplication の順で実行する。
- `target_dir` の git を基準に `last_commit` と `last_run` を更新する。
- 削除ファイルの cleanup は `public/data/{structure,complexity,duplication}` の対象 JSON を消す。

### Phase 3: LLM 機能の削除

- `.claude/commands`、`.claude/settings.json`、`.claude/skills/generate-image`、`.claude/skills/perchwork-semantic`、`.claude/skills/perchwork-review` を削除する。
- `@google/genai` を lockfile から除去する。
- README から Claude Code、Google GenAI API キー、スラッシュコマンドの説明を削除する。
- `config.example.json` から `semantic` と `review` を削除する。

### Phase 4: UI と型の整理

- `ViewTab` から `review` を削除するか `diagnostics` に改名する。
- `SemanticFile` / `SemanticItem` / `SemanticTest` 型を削除し、必要な情報は structure 型へ寄せる。
- `Review*` 型、loader、hook、component を削除する。
- duplication 型から `prompt` と LLM 判定専用フィールドを削除するか optional legacy 扱いにする。
- データなし画面とノート空画面の案内を CLI ベースに変える。

### Phase 5: ドキュメントと検証

- README を新しい運用に更新する。
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- 可能なら小さな Rust fixture に対して以下を確認する。
  - `npm run analyze:structure -- --all`
  - `npm run analyze:complexity -- --all`
  - `npm run analyze:duplication`
  - `npm run analyze`

## 実装時の注意点

- 既存の `public/data` は `.gitignore` 対象なので、生成結果を前提にコミットしない。
- `config.json` も `.gitignore` 対象なので、移行時は `config.example.json` を基準にする。
- `target_dir` は Perchwork とは別 git リポジトリである前提を維持する。
- `last_commit` は Perchwork 自身ではなく `target_dir` 側の HEAD を保存する。
- LLM の説明文を単に空文字で残すのではなく、UI から概念ごと消す。表示だけ残すと、データの出所が曖昧になる。
- 重複検出の `severity` を残す場合は、行数、箇所数、対象ファイル数などの明確なヒューリスティックにする。

## 完了条件

- リポジトリに `.claude` が不要になる。
- README と UI に Claude Code、Claude Skill、Google GenAI API キー、LLM、プロンプトコピー前提の案内が残っていない。
- `npm run analyze` だけで structure、complexity、duplication の JSON を生成できる。
- `npm run build` が通る。
- LLM なしで再生成できない `semantic` と `review` の生成・表示導線が削除されている。
