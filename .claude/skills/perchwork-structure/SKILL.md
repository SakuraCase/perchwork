---
name: perchwork-structure
description: tree-sitter を使った Rust コード解析ツール。コードベースの構造を解析し、public/data/structure/ に構造化JSONを生成する。
---

# Perchwork Structure

tree-sitter を使って Rust コードを静的解析し、構造化された JSON データを生成するスキル。

## タスク

**注意**: このスキルは `perchwork` ディレクトリ(root)から実行されることを前提としています。

### 差分実行（デフォルト）

変更ファイルを指定して解析を実行：

```bash
cd .claude/skills/perchwork-structure/scripts && npm run build && \
  node dist/analyze.js --config ../../../../config.json --files <file1,file2,...>
```

例：
```bash
node dist/analyze.js --config ../../../../config.json --files entity/battle_state.rs,service/battle_loop.rs
```

差分実行モードでは：
- 既存の結果ファイルを保持
- 指定された変更ファイルのみ再解析
- index.json は全結果ファイルから再計算

### 全体実行

`--all` オプションで全ファイル再解析：

```bash
cd .claude/skills/perchwork-structure/scripts && npm run build && \
  node dist/analyze.js --config ../../../../config.json --all
```

## オプション

- `--files <file1,file2,...>`: 変更ファイル（カンマ区切り、相対パス）
- `--all`: 全ファイルを解析

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
