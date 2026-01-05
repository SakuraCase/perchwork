---
name: perchwork-complexity
description: rust-code-analysis-cli を使ったコード複雑度解析ツール。コードベースのメトリクスを解析し、public/data/complexity/ に構造化JSONを生成する。
---

# Perchwork Complexity

rust-code-analysis-cli を使ってコードの複雑度メトリクスを解析し、構造化された JSON データを生成するスキル。

## 前提条件

rust-code-analysis-cli がインストールされている必要があります。

### インストール方法

**方法 1: cargo install**

```bash
cargo install rust-code-analysis-cli
```

> **注意**: 2025 年 1 月現在、tree-sitter の依存関係バージョン不整合により
> ビルドに失敗することがあります。その場合は方法 2 を使用してください。

**方法 2: プレビルドバイナリ**

```bash
# Linux x86_64
cd /tmp
curl -L -o rust-code-analysis-cli.tar.gz \
  https://github.com/mozilla/rust-code-analysis/releases/download/v0.0.25/rust-code-analysis-linux-cli-x86_64.tar.gz
tar -xzf rust-code-analysis-cli.tar.gz
mkdir -p ~/.local/bin
mv rust-code-analysis-cli ~/.local/bin/
# ~/.local/bin が PATH に含まれていることを確認
```

## タスク

以下のコマンドを順番に実行してください:

```bash
cd .claude/skills/perchwork-complexity/scripts && npm install && npm run build && node dist/analyze.js --config ../../../../config.json
```

**注意**: このスキルは `perchwork` ディレクトリ(root)から実行されることを前提としています。

## オプション

- `--target <path>`: 解析対象のパス（config.json の設定を上書き）
- `--lang <rust|typescript>`: 対象言語（デフォルト: rust）
- `--files <file1,file2,...>`: 差分実行時の変更ファイル（カンマ区切り、相対パス）
- `--deleted <file1,file2,...>`: 差分実行時の削除ファイル（カンマ区切り、相対パス）

### 差分実行

`--files` または `--deleted` を指定すると差分実行モードになります：

```bash
# 変更ファイルのみ解析
node dist/analyze.js --config ../../../../config.json --files core/entity/unit.rs,core/service/battle.rs

# 削除ファイルの結果を削除
node dist/analyze.js --config ../../../../config.json --deleted old_module.rs

# 変更と削除を同時に処理
node dist/analyze.js --config ../../../../config.json --files core/entity/unit.rs --deleted old_module.rs
```

差分実行モードでは：
- 既存の結果ファイルを保持
- 指定された変更ファイルのみ再解析
- 指定された削除ファイルの結果JSONを削除
- index.json は全結果ファイルから再計算

## 出力

出力先: `public/data/complexity/`

```
public/data/complexity/
├── index.json           # インデックス（統計サマリー含む）
└── files/
    └── *.json           # 各ファイルの詳細メトリクス
```

## メトリクス

| メトリクス | 説明                                       | 警告しきい値 |
| ---------- | ------------------------------------------ | ------------ |
| CC         | 循環的複雑度 (Cyclomatic Complexity)       | > 10         |
| Cognitive  | 認知的複雑度                               | > 15         |
| MI         | 保守性指標 (Maintainability Index)         | < 20         |
| Halstead   | 難易度、労力、推定バグ数                   | -            |
| LOC        | 行数（総行数、コード行、コメント行、空行） | -            |
| NArgs      | 引数の数                                   | > 5          |
| NExits     | 出口の数                                   | -            |
