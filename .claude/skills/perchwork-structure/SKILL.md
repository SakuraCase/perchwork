---
name: perchwork-structure
description: tree-sitter を使った Rust コード解析ツール。コードベースの構造を解析し、public/data/structure/ に構造化JSONを生成する。
allowed-tools:
  - Bash
---

# Perchwork Structure

tree-sitter を使って Rust コードを静的解析し、構造化されたJSONデータを生成するスキル。

## タスク

以下のコマンドを順番に実行してください:

```bash
cd .claude/skills/perchwork-structure/scripts && npm run build && node dist/analyze.js --config ../../../../config.json
```

**注意**: このスキルは `tools/perchwork` ディレクトリから実行されることを前提としています。

## 出力

出力先: `public/data/structure/`

```
public/data/structure/
├── index.json           # インデックス
├── call_graph/
│   └── edges.json       # コールグラフ
├── {dir_from_target}/   # target_dir 配下のディレクトリ構造
│   └── *.json           # 各モジュールの解析結果
└── ...
```
