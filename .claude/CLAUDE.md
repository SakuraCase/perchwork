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
│       ├── perchwork-duplication/
│       ├── perchwork-review/
│       ├── perchwork-semantic/
│       └── perchwork-structure/
├── public/
│   ├── data/
│   │   ├── complexity/    # rust-code-analysis複雑度データ
│   │   ├── duplication/   # jscpd重複検出データ
│   │   ├── review/        # PRレビュー結果データ
│   │   ├── semantic/      # LLM生成の意味解析データ
│   │   └── structure/     # tree-sitter解析の構造データ
│   └── img/
├── src/
│   ├── assets/            # 静的アセット
│   ├── components/        # Reactコンポーネント
│   │   ├── common/       # 共通コンポーネント
│   │   ├── detail/       # 詳細表示
│   │   ├── duplication/  # 重複表示
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

| 用途             | パス                        |
| ---------------- | --------------------------- |
| 設定ファイル     | `config.json`               |
| エントリポイント | `src/App.tsx`               |
| 型定義           | `src/types/`                |
| 構造データ       | `public/data/structure/`    |
| 意味データ       | `public/data/semantic/`     |
| 複雑度データ     | `public/data/complexity/`   |
| 重複データ       | `public/data/duplication/`  |
| レビューデータ   | `public/data/review/`       |

## デザイン方針

**コンセプト**: 暖かく柔らかいダークテーマ（perch = 鳥の止まり木 → 木の温もり、自然な暖かさ）

### カラー

| 種別             | Tailwind                            |
| ---------------- | ----------------------------------- |
| 背景             | stone-900/800/700（ウォームグレイ） |
| ボーダー         | stone-600                           |
| テキスト         | stone-50/200/400                    |
| プライマリ       | orange-500/600/700                  |
| フォーカス       | ring-orange-500                     |
| 成功/警告/エラー | emerald-500/amber-400/rose-500      |

### UI 要素

- 角丸: ボタン `rounded-lg`、カード `rounded-xl`、バッジ `rounded-md`
- トランジション: ホバー `duration-200`、展開 `duration-300`
