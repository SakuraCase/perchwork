---
name: perchwork-duplication
description: jscpd を使った重複コード検出ツール。コードベースの重複を解析し、public/data/duplication/ に構造化JSONを生成する。
---

# Perchwork Duplication

jscpd を使ってコードの重複を検出し、グループ化・解析を行い、LLM で意味判断を行うスキル。

**特徴**:

- 3 箇所以上で重複するコードのみを検出（2 箇所だけの重複はノイズとして除外）
- 類似度ベースのマッチング（変数名・リテラルの揺らぎを吸収）
- 85%以上の類似度を持つグループを自動マージ

## 3 フェーズ構成

| Phase | 名前 | 処理                 | ツール     |
| ----- | ---- | -------------------- | ---------- |
| 1     | 検出 | jscpd で重複検出     | jscpd      |
| 2     | 解析 | グループ化・統計計算 | スクリプト |
| 3     | 判断 | 意味解析・修正判定   | LLM        |

### Phase 1: 検出 (Detection)

jscpd を使って機械的に重複ペアを検出。

- 入力: ソースコード
- 出力: 重複ペアのリスト（A-B 形式）

### Phase 2: 解析 (Analysis)

検出されたペアをグループ化し、類似グループをマージして統計情報を計算。

- 入力: Phase 1 の重複ペア
- 出力: 3 箇所以上のグループ、統計情報、リファクタリング提案（機械的）
- 処理内容:
  - 同じ fragment を持つペアをグループ化
  - min-locations 以上の箇所があるグループをフィルタリング
  - **類似度が閾値以上のグループをマージ（変数名・リテラルの揺らぎを吸収）**
  - 行数ベースのリファクタリング戦略を提案

```bash
cd .claude/skills/perchwork-duplication/scripts && npm install && npm run build && \
  node dist/analyze.js --config ../../../../config.json
```

### Phase 3: 判断 (Decision) - LLM

Phase 2 の結果を LLM で意味解析し、各重複グループの重要度と修正必要性を判定。

- 入力: Phase 2 のグループデータ
- 出力: severity, is_meaningful, explanation, needs_fix

## オプション

| オプション               | デフォルト | 説明                                |
| ------------------------ | ---------- | ----------------------------------- |
| `--min-lines`            | 5          | 最小重複行数                        |
| `--min-tokens`           | 50         | 最小重複トークン数                  |
| `--min-locations`        | 3          | 最小重複箇所数                      |
| `--similarity-threshold` | 0.85       | 類似グループマージの閾値（0.0-1.0） |

## 類似度検出アルゴリズム

Phase 2 では、変数名やリテラルの違いを吸収して構造的に類似したコードを検出する。

### 正規化処理

1. **コメント除去**: `//` 行コメント、`/* */` ブロックコメント
2. **リテラル統一**: 文字列 → `$STR`、文字 → `$CHAR`、数値 → `$NUM`
3. **変数名統一**: キーワード・型以外の識別子 → `$VAR`
4. **空白正規化**: 連続空白を単一スペースに

### 類似度計算

2 つの方式を組み合わせて総合類似度を算出:

| 方式           | 重み | 説明                                 |
| -------------- | ---- | ------------------------------------ |
| Jaccard 類似度 | 30%  | トークン集合の一致率（順序無視）     |
| LCS 類似度     | 70%  | 最長共通部分列の比率（構造的類似性） |

### マージ処理

- Union-Find アルゴリズムで類似グループを統合
- 閾値（デフォルト 85%）以上の類似度を持つグループを同一とみなす
- マージ後は場所数の多いグループを優先

### 対応言語

| 言語       | キーワード・型の保持                      |
| ---------- | ----------------------------------------- |
| Rust       | `fn`, `let`, `impl`, `Vec`, `Option` など |
| TypeScript | `function`, `const`, `interface` など     |
| JavaScript | `function`, `const`, `let` など           |

## 出力

出力先: `public/data/duplication/`

```
public/data/duplication/
├── index.json           # Phase 2 インデックス（グループ化済み）
├── duplicates/
│   └── grp_*.json       # 各重複グループの詳細
└── raw/                 # Phase 1 出力
    ├── index.json       # Phase 1 インデックス（生ペアデータ）
    └── pairs/
        └── dup_*.json   # 各重複ペアの詳細
```

## Phase 1 出力（生ペアデータ）

Phase 1 では jscpd の検出結果をそのまま保存:

| フィールド | 型     | 説明                          |
| ---------- | ------ | ----------------------------- |
| `id`       | string | ペア ID（例: `dup_abc12345`） |
| `lines`    | number | 重複行数                      |
| `tokens`   | number | トークン数                    |
| `fileA`    | object | 1 つ目のファイル位置          |
| `fileB`    | object | 2 つ目のファイル位置          |
| `fragment` | string | コード断片                    |

## Phase 2 出力（グループデータ）

Phase 2 では類似グループをマージし、以下のフィールドを生成:

| フィールド               | 型     | 説明                              |
| ------------------------ | ------ | --------------------------------- |
| `id`                     | string | グループ ID（例: `grp_abc12345`） |
| `fragment_hash`          | string | コード断片のハッシュ              |
| `lines`                  | number | 重複行数                          |
| `tokens`                 | number | トークン数                        |
| `locations`              | array  | 重複箇所のリスト（3 箇所以上）    |
| `fragment`               | string | コード断片                        |
| `refactoring_suggestion` | object | 機械的なリファクタリング提案      |

## Phase 3 出力（LLM 判断結果）

Phase 3 で以下のフィールドを追加:

| フィールド      | 型      | 説明                                             |
| --------------- | ------- | ------------------------------------------------ |
| `severity`      | string  | 重要度: `high` / `medium` / `low` / `none`       |
| `is_meaningful` | boolean | 意味のある重複かどうか                           |
| `explanation`   | string  | この重複の説明（なぜ問題か、または問題でないか） |
| `needs_fix`     | boolean | 修正が必要か                                     |

### severity の判定基準

| severity | 説明                                           |
| -------- | ---------------------------------------------- |
| high     | ビジネスロジックの重複。バグの温床になりやすい |
| medium   | ユーティリティ的な重複。統一の余地あり         |
| low      | ボイラープレート的な重複。改善は任意           |
| none     | 意図的な重複、またはフレームワーク的なパターン |

## 統計情報

| 項目                   | 説明                             |
| ---------------------- | -------------------------------- |
| total_files            | 解析対象ファイル数               |
| total_duplicates       | 検出された重複グループ数         |
| total_duplicated_lines | 重複行数の合計                   |
| duplication_percentage | 重複率（%）                      |
| high_severity_count    | high 重要度の数（Phase 3 後）    |
| needs_fix_count        | 修正必要な重複の数（Phase 3 後） |

## Phase 3 サブエージェントプロンプトテンプレート

サブエージェントに渡すプロンプト：

````markdown
# 重複コード判断タスク

以下の重複グループに対して意味判断を実行し、JSON ファイルを更新してください。

## 対象ファイル

{duplicate_files} # 例: grp_abc123.json, grp_def456.json, ...

## 作業ディレクトリ

- 重複データ: {duplication_dir}/duplicates/
- ソースコード: {target_dir}
- 出力先: 同じファイルを更新

## 各重複グループの処理手順

1. 重複グループの JSON を Read ツールで読み込み
2. `locations` 内の各ソースファイルを Read ツールで読み込み
3. コード断片（`fragment`）と周辺コンテキストを分析
4. 以下を判定:
   - この重複は意味のある重複か？（単なるボイラープレートではないか）
   - 重要度はどの程度か？（ビジネスロジック重複 vs ユーティリティ重複）
   - 修正が必要か？
5. JSON ファイルに判断結果を追加して Write ツールで保存

## 判定ガイドライン

### テストコード内の重複（優先処理 - 詳細分析をスキップ）

テストコード内（`#[cfg(test)]`、`#[test]`、`tests/` ディレクトリ内、関数名が `test_` で始まる）の重複は以下の通り即座に処理し、**詳細な分析をスキップ**してください：

- severity: `none`
- is_meaningful: `false`
- needs_fix: `false`
- explanation: 「テストコード内の重複のため対象外」
- refactoring_suggestion: `{ "strategy": "no_refactoring", "title": "対応不要", "summary": "テストコードのため対象外", "targets": "", "changes": "", "prompt": null }`

### is_meaningful = true の例（本番コード）

- 同じビジネスロジックが複数箇所に存在
- 同じ計算やバリデーションが重複
- コピペで追加された機能コード

### is_meaningful = false の例（本番コード）

- Rust の `impl` ボイラープレート
- マクロ展開による類似パターン
- エラーハンドリングの共通パターン

### severity 判定（本番コードのみ）

- **high**: ビジネスロジック（ドメイン層、計算、バリデーション）
- **medium**: ユーティリティ（ヘルパー関数、変換ロジック）
- **low**: ボイラープレート（impl, new, getter/setter）
- **none**: 意図的な重複（マクロ展開、フレームワーク的なパターン）

### needs_fix 判定

- severity が high または medium → true
- severity が low で 20 行以上 → true
- それ以外 → false

### refactoring_suggestion の生成

#### severity が high または medium の場合（LLM で生成）

コードのコンテキストを理解した上で、以下のフィールドを生成してください：

- `strategy`: "extract_function" | "extract_trait" | "use_macro" | "parameterize" から選択
- `title`: 短い要約（例: 「HP計算ロジックの共通化」）
- `summary`: なぜこの変更が必要か、どのような問題があるか
- `targets`: 対象ファイル・箇所の説明（ファイル名と行番号、何をしているコードか）
- `changes`: 具体的な修正手順（1. 共通関数を作成 2. 各箇所から呼び出し など）
- `prompt`: Claude Code で実行可能な具体的なリファクタリング指示

**重要**: 機械的な文言ではなく、コードの意味を理解した具体的な提案を記述してください。

#### severity が low または none の場合

```json
{
  "strategy": "no_refactoring",
  "title": "対応不要",
  "summary": "リファクタリング不要の理由",
  "targets": "",
  "changes": "",
  "prompt": null
}
```

## 出力フォーマット（既存フィールドに追加）

```json
{
  "id": "grp_abc123",
  "fragment_hash": "...",
  "lines": 15,
  "tokens": 120,
  "locations": [
    { "path": "entity/unit.rs", "startLine": 100, "endLine": 115 },
    { "path": "entity/hero.rs", "startLine": 50, "endLine": 65 },
    { "path": "entity/player.rs", "startLine": 200, "endLine": 215 }
  ],
  "fragment": "...",
  "refactoring_suggestion": { ... },
  "severity": "medium",
  "is_meaningful": true,
  "explanation": "HP計算ロジックが3箇所で重複しています。仕様変更時にバグの原因になる可能性があります。",
  "needs_fix": true
}
```
````

## 注意事項

- Phase 1+2 は高速な機械的処理（jscpd + スクリプト）
- Phase 3 のみ LLM を使用（判断処理）
- 3 箇所以上の重複のみを検出（2 箇所の重複は除外）
- Phase 3 はバッチ処理で並列実行可能
- 解析に失敗した場合は severity を設定せずスキップ
