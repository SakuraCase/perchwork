# perchwork

コードベースを解析し、理解を助けるローカル用ビジュアルツール

## 前提条件

- Node.js (v18 以上推奨)
- Rust 複雑度解析を使う場合: `rust-code-analysis-cli` を PATH に配置
  - 例: `cargo install rust-code-analysis-cli`

## セットアップ

```bash
npm install
cp config.example.json config.json
# config.json を編集して target_dir を設定
```

## コマンド

解析 JSON の生成:

| コマンド | 説明 |
| --- | --- |
| `npm run analyze` | structure、complexity、duplication の JSON を生成 |
| `npm run analyze:structure` | 構造・コールグラフ JSON を生成 |
| `npm run analyze:complexity` | 複雑度 JSON を生成 |
| `npm run analyze:duplication` | 重複検出 JSON を生成 |
| `npm run analyze:prepare` | `work/analysis-checklist.md` を作成 |
| `npm run analyze:cleanup` | 生成済み解析 JSON を削除 |

## 使い方

```bash
npm run analyze
npm run dev    # 開発サーバー起動
```
