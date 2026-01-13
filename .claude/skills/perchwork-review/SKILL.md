---
name: perchwork-review
description: pr-review-toolkit の 6 エージェントを使ってコードレビューを実行し、fix_plans を生成する。scriptで出力済みファイルから index.json を生成。
---

# Perchwork Review

pr-review-toolkit のサブエージェント 6 種を使ってコードレビューを実行し、
修正計画（fix_plans）を含む統合レビュー結果を生成する。

## Output

```
public/data/review/
├── index.json          # サマリー
├── entity/
│   └── battle_state.json
└── ...
```

## Workflow

### Default Mode (Full Review)

6 エージェントでレビュー実行、結果を JSON 出力

1. 対象ファイルを取得
2. **ファイルごとに** 6 エージェントを並列実行（Task ツール）
3. 結果を統合し fix_plans を生成
4. JSON ファイルを出力

### index Mode

出力済み review ファイルを解析し index.json 生成

```bash
cd scripts && npm install && npm run build
node dist/generate-index.js ../../../../public/data/review
```

---

## Agent Details

### Agent Overview

| Agent                 | Purpose                   | Score Format         |
| --------------------- | ------------------------- | -------------------- |
| comment-analyzer      | Comment accuracy check    | High/Medium/Low      |
| pr-test-analyzer      | Test coverage quality     | 1-10 scale           |
| silent-failure-hunter | Error handling detection  | CRITICAL/HIGH/MEDIUM |
| type-design-analyzer  | Type design quality       | 4-axis 1-10 each     |
| code-reviewer         | Code quality & compliance | 0-100                |
| code-simplifier       | Code simplification       | Suggestion list      |

### Parallel Invocation

Use Task tool to invoke 6 pr-review-toolkit sub-agents in parallel for each file.

**重要**: 各エージェントへのプロンプトには以下を含めること：

- ファイルパス
- 言語設定（`config.json` の `language` の値）
- 出力形式の指定（下記参照）

```
Task tool x6 parallel calls:

1. subagent_type: "pr-review-toolkit:comment-analyzer"
   prompt: |
     ファイル {file_path} のコメントを検証してください。
     出力言語: {language}
     結果を以下のJSON形式で返してください:
     {
       "status": "success",
       "issues": [{ "line": 数値, "confidence": "high|medium|low", "message": "説明" }]
     }

2. subagent_type: "pr-review-toolkit:pr-test-analyzer"
   prompt: |
     ファイル {file_path} のテストカバレッジを分析してください。
     出力言語: {language}
     結果を以下のJSON形式で返してください:
     {
       "status": "success",
       "coverage_score": 1-10の数値,
       "gaps": [{ "item": "テスト不足の関数名", "description": "説明" }]
     }

3. subagent_type: "pr-review-toolkit:silent-failure-hunter"
   prompt: |
     ファイル {file_path} のサイレントエラーを検出してください。
     出力言語: {language}
     結果を以下のJSON形式で返してください:
     {
       "status": "success",
       "findings": [{ "line": 数値, "severity": "critical|high|medium", "message": "説明" }]
     }

4. subagent_type: "pr-review-toolkit:type-design-analyzer"
   prompt: |
     ファイル {file_path} の型設計を分析してください。
     出力言語: {language}
     結果を以下のJSON形式で返してください:
     {
       "status": "success",
       "scores": { "encapsulation": 1-10, "invariant": 1-10, "usefulness": 1-10, "enforcement": 1-10 },
       "recommendations": ["推奨事項1", "推奨事項2"]
     }

5. subagent_type: "pr-review-toolkit:code-reviewer"
   prompt: |
     ファイル {file_path} のコード品質をレビューしてください。
     出力言語: {language}
     結果を以下のJSON形式で返してください:
     {
       "status": "success",
       "score": 0-100の数値,
       "issues": [{ "line": 数値, "message": "説明" }]
     }

6. subagent_type: "pr-review-toolkit:code-simplifier"
   prompt: |
     ファイル {file_path} のコード簡素化提案をしてください。
     出力言語: {language}
     結果を以下のJSON形式で返してください:
     {
       "status": "success",
       "suggestions": [{ "line_start": 数値, "line_end": 数値, "description": "説明", "improvement": "改善案" }]
     }
```

After all agents complete, integrate results to generate fix_plans and write JSON files.

---

## Per-File JSON Format

**重要**: 以下の形式を厳守すること。`generate-index.js` がこの形式を期待している。

```json
{
  "path": "entity/battle_state.rs",
  "agents": {
    "comment-analyzer": {
      "status": "success",
      "issues": [
        { "line": 45, "confidence": "high", "message": "コメントが古い可能性" }
      ]
    },
    "pr-test-analyzer": {
      "status": "success",
      "coverage_score": 8,
      "gaps": [
        {
          "item": "new_from_config",
          "description": "エラーケースのテストがない"
        }
      ]
    },
    "silent-failure-hunter": {
      "status": "success",
      "findings": [
        {
          "line": 67,
          "severity": "high",
          "message": "unwrap()がパニックを引き起こす可能性"
        }
      ]
    },
    "type-design-analyzer": {
      "status": "success",
      "scores": {
        "encapsulation": 8,
        "invariant": 7,
        "usefulness": 9,
        "enforcement": 7
      },
      "recommendations": ["フィールドの可視性を検討"]
    },
    "code-reviewer": {
      "status": "success",
      "score": 85,
      "issues": [{ "line": 23, "message": "マジックナンバーを定数化推奨" }]
    },
    "code-simplifier": {
      "status": "success",
      "suggestions": [
        {
          "line_start": 30,
          "line_end": 35,
          "description": "if-else チェーンをmatchに置き換え可能",
          "improvement": "match式を使用してより簡潔に"
        }
      ]
    }
  },
  "fix_plans": [
    {
      "priority": "high",
      "title": "unwrap()をResultの伝播に変更",
      "description": "67行目でunwrap()を使用しており、パニックの原因となる",
      "prompt": "entity/battle_state.rs の67行目にある unwrap() を ? 演算子と map_err を使った形に修正してください",
      "agent": "silent-failure-hunter"
    }
  ]
}
```

---

## Path Conversion Rules

Source file's relative path: remove `.rs` extension, add `.json`.

| Source File            | Output File                     |
| ---------------------- | ------------------------------- |
| entity/battle_state.rs | review/entity/battle_state.json |
| service/battle_loop.rs | review/service/battle_loop.json |

---

## fix_plans Generation Rules

1. **Consolidate all agent results**: Review all 6 agent outputs before generating
2. **Merge duplicates**: Combine findings from different agents for same location
3. **Priority criteria**:
   - `high`: Security, panic risk, critical bugs
   - `medium`: Code quality, maintainability issues
   - `low`: Style, optimization suggestions
4. **Limit**: Max ~10 items per file
5. **Prompt format**: Copy-paste ready for Claude Code execution

---

## Notes

- 各エージェントの結果は `status` フィールドで成功/エラー/スキップを示す
- エラー時は空の issues/findings を返し、処理を継続
- fix_plans の prompt は具体的で実行可能な指示を含める
- 同一ファイル内の類似指摘は統合して重複を避ける

## Language Setting

**出力メッセージの言語は `config.json` の `language` に従う。**

エージェント呼び出し時に言語設定を明示的に渡すこと：

```json
{
  "language": "ja"
}
```

日本語の場合、すべての message, description, recommendation, prompt は日本語で出力する。
