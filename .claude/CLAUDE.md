# Perchwork

コードベース解析のための ClaudeCode 設定とビジュアルツール（React + Vite + TailwindCSS）

## ディレクトリ構成

```
.
├── .claude/
│   ├── commands/          # スラッシュコマンド
│   └── skills/            # Claude スキル定義
│       ├── generate-image/
│       ├── perchwork-complexity/
│       ├── perchwork-review/
│       ├── perchwork-semantic/
│       └── perchwork-structure/
├── public/
│   ├── data/
│   │   ├── complexity/    # rust-code-analysis複雑度データ
│   │   ├── review/        # PRレビュー結果データ
│   │   ├── semantic/      # LLM生成の意味解析データ
│   │   └── structure/     # tree-sitter解析の構造データ
│   └── img/
├── src/
│   ├── assets/            # 静的アセット
│   ├── components/        # Reactコンポーネント
│   │   ├── common/       # 共通コンポーネント
│   │   ├── detail/       # 詳細表示
│   │   ├── graph/        # グラフビジュアライゼーション
│   │   ├── layout/       # レイアウト
│   │   ├── metrics/      # メトリクス表示
│   │   ├── note/         # ノート機能
│   │   ├── review/       # レビュー表示
│   │   ├── sequence/     # シーケンス図
│   │   └── tree/         # ツリービュー
│   ├── generated/         # 生成ファイル
│   ├── hooks/             # カスタムフック
│   ├── services/          # サービス層
│   ├── types/             # TypeScript型定義
│   └── utils/             # ユーティリティ
└── dist/                   # ビルド出力
```

## クイックコマンド

```bash
npm run dev        # 開発サーバー (http://localhost:5173)
npm run lint       # ESLint実行
npm run typecheck  # TypeScript型チェック
```

## 主要ファイル

| 用途             | パス                       |
| ---------------- | -------------------------- |
| 設定ファイル     | `config.json`              |
| エントリポイント | `src/App.tsx`              |
| 型定義           | `src/types/`               |
| 構造データ       | `public/data/structure/`   |
| 意味データ       | `public/data/semantic/`    |
| 複雑度データ     | `public/data/complexity/`  |
| レビューデータ   | `public/data/review/`      |
