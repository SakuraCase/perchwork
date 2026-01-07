---
description: 会話内容からセッションとドキュメント用ファイルを生成
allowed-tools:
  - Read
  - Write
  - Grep
  - Glob
  - Task
---

これまでの会話履歴を解析し、セッションとドキュメント用のファイルを詳細かつわかりやすくシンプルな内容を生成してください。

## 手順

1. 会話履歴から調査内容と結論を要約する
2. Task ツールで以下の 2 つのサブエージェントを並列起動する

## セッションとドキュメントの役割

### セッション（調査レポート）

単発の調査・会話をレポートとして記録する。

- **内容**: 問い、調査内容、調査結果を含めたレポート
- **特徴**: その時点での調査の記録であり、履歴として残る
- **出力先**: `src/generated/sessions/{id}.tsx`

### ドキュメント（知識ベース）

セッションの内容を踏まえた wiki 的な知識ベース。

- **内容**: 今までのセッションでの内容を統合・整理した最新情報
- **特徴**: 継続的に更新され、常に最新の状態を維持する
- **出力先**: `src/generated/document/{category}/{id}.tsx`

## 利用可能なパッケージ

| パッケージ     | 用途                       | 使用タイミング                                |
| -------------- | -------------------------- | --------------------------------------------- |
| React 19       | UI 構築の基盤              | 常時使用                                      |
| Tailwind CSS 4 | スタイリング               | レイアウト・装飾全般                          |
| Framer Motion  | アニメーション             | UI トランジション、SVG アニメ、ステップ表示   |
| Cytoscape.js   | グラフ・ネットワーク可視化 | 依存関係図、ネットワーク図、フロー図          |
| Mermaid        | ダイアグラム描画           | シーケンス図、フローチャート、ER 図、クラス図 |
| D3.js          | カスタム可視化             | 標準チャートで表現できない複雑な可視化        |
| ECharts        | チャート・グラフ           | 棒グラフ、折れ線、円グラフ、ヒートマップ等    |
| PrismJS        | コードハイライト           | ソースコード表示（テーマ CSS 必須）           |

上記パッケージで表現困難かつテキストでは複雑な説明が必要な場合:

- `generate-image` スキルを利用して画像を生成
- 出力先: `public/img/{sessions|document}/{id}/`
- ファイル名: 内容を表す一意の名前（例: `architecture-overview.png`, `data-flow.png`）
- TSX からは `<img src="/img/{path}/{画像名}.png" />` で参照

## サブエージェント 1: セッション生成

単発の調査・会話を「調査レポート」として記録する。

Task ツールを以下の設定で呼び出す:

- subagent_type: "general-purpose"
- description: "セッション生成"
- prompt: 以下のルールで調査レポートを生成
  - **目的**: 問い、調査内容、調査結果を含めたレポートとして記録
  - **出力先**: src/generated/sessions/{id}.tsx
  - **インデックス更新**: src/generated/sessions/index.ts（components と sessions を追加）
  - **型定義**: 「型定義」セクションを参照
  - **表現の質を高める**:
    - 「表現手法ガイドライン」に従い、説明内容に最適な可視化手法を選択
    - 「UX 原則」に従い、インタラクティブ要素を積極的に活用
    - テキストだけで説明可能でも、視覚化で理解が深まる場合はパッケージを活用
    - 処理フローや因果関係はアニメーションでの表現を検討
  - **スタイル**: 「利用可能なパッケージ」「デザインルール」に従い実装

## サブエージェント 2: ドキュメント更新

セッションの内容を踏まえた「wiki 的な知識ベース」を作成・更新する。
古いセッションの内容更新はしない。

Task ツールを以下の設定で呼び出す:

- subagent_type: "general-purpose"
- description: "ドキュメント更新"
- prompt: 以下のルールで知識ベースを更新
  - **目的**: 今までのセッションでの内容を踏まえて、wiki 的に最新情報で情報を整理
  - **関連性判定**: 既存ドキュメントとの関連性を判定（関連あり → 追記、なし → 新規作成）
  - **出力先**: src/generated/document/{category}/{id}.tsx
  - **インデックス更新**: src/generated/document/index.ts（components と categories を追加）
  - **カテゴリ管理**: 内容に応じて動的に判断・作成、必要に応じて再設計・分割・統合
  - **型定義**: 「型定義」セクションを参照
  - **表現の質を高める**:
    - 「表現手法ガイドライン」に従い、説明内容に最適な可視化手法を選択
    - 「UX 原則」に従い、インタラクティブ要素を積極的に活用
    - テキストだけで説明可能でも、視覚化で理解が深まる場合はパッケージを活用
    - 処理フローや因果関係はアニメーションでの表現を検討
  - **スタイル**: 「利用可能なパッケージ」「デザインルール」に従い実装

## 型定義

### sessions/index.ts

```typescript
// src/generated/sessions/index.ts
import type { ComponentType } from "react";
import type { NoteSessionEntry } from "../../types/note";
import ComponentName from "./{id}";

// コンポーネント登録
export const components: Record<string, ComponentType> = {
  "{id}": ComponentName,
};

// メタデータ（サイドパネル表示用）
export const sessions: NoteSessionEntry[] = [
  {
    id: "{id}",
    title: "タイトル",
    createdAt: "YYYY-MM-DD",
    path: "sessions/{id}",
  },
];
```

### document/index.ts

```typescript
// src/generated/document/index.ts
import type { ComponentType } from "react";
import type { NoteDocumentCategory } from "../../types/note";
import ComponentName from "./{category}/{id}";

// コンポーネント登録
export const components: Record<string, ComponentType> = {
  "{category}/{id}": ComponentName,
};

// メタデータ（サイドパネル表示用）
export const categories: NoteDocumentCategory[] = [
  {
    id: "{category}",
    name: "カテゴリ表示名",
    items: [
      {
        id: "{id}",
        title: "タイトル",
        path: "document/{category}/{id}",
      },
    ],
  },
];
```

### 型定義参照

```typescript
// src/types/note.ts
interface NoteSessionEntry {
  id: string;
  title: string;
  createdAt: string;
  path: string;
}

interface NoteDocumentEntry {
  id: string;
  title: string;
  path: string;
}

interface NoteDocumentCategory {
  id: string;
  name: string;
  items: NoteDocumentEntry[];
}
```

## 表現手法ガイドライン

説明内容に応じて最適なパッケージと手法を選択する。

| 説明内容         | 推奨手法               | パッケージ         |
| ---------------- | ---------------------- | ------------------ |
| 処理フロー・手順 | ステップアニメーション | Framer Motion      |
| 依存関係・構造   | インタラクティブグラフ | Cytoscape.js       |
| シーケンス・状態 | ダイアグラム           | Mermaid            |
| コード解説       | ホバーハイライト       | PrismJS + 独自実装 |
| 数値比較・統計   | チャート               | ECharts            |
| 複雑な因果関係   | SVG パスアニメーション | Framer Motion + D3 |

**選択基準**:

- テキストだけで説明可能でも、視覚化で理解が深まる場合は積極的にパッケージを活用
- 処理フローや因果関係はアニメーションで表現を検討
- 複数手法の組み合わせも有効（例: Mermaid 図 + ホバー詳細）

**注意事項**:

- **Mermaid の過度な使用を避ける**: 何でも図にすれば良いわけではない。シンプルな関係性やリストはテキスト・テーブルで十分
- **文字での説明を必ず含める**: 図だけでは「何を伝えたいか」が曖昧になる。図の前後に目的・要点・補足をテキストで記述
- **図は補助、文章が主**: 読者が図を見なくても概要を理解できる程度の文章を書く
- **Mermaid が適切な場面**: シーケンス図（時系列の相互作用）、状態遷移図、複雑なフローチャートなど、テキストでは表現しにくい構造

## UX 原則

### Progressive Disclosure（段階的開示）

- 概要 → 詳細の階層構造で情報を整理
- 展開可能なセクションで深掘りを可能に
- 初見で圧倒されない情報量に制御

### Interactive Exploration（対話的探索）

- **ホバー**: 用語や概念の補足説明を表示
- **クリック**: 詳細セクションの展開/折りたたみ
- **ツールチップ**: 専門用語や略語の説明

### Focused Animation（焦点を絞ったアニメーション）

- **使用する場面**: 処理の流れ、因果関係、状態遷移の可視化
- **使用しない場面**: 装飾目的、単なる見た目の演出
- 理解を助ける場面でのみアニメーションを活用

## デザインルール

**コンセプト**: 暖かく柔らかいダークテーマ（ウォームグレイ + オレンジ系アクセント）

### カラーパレット

| 用途       | クラス                                                        |
| ---------- | ------------------------------------------------------------- |
| 背景       | `bg-stone-900` / `bg-stone-800` / `bg-stone-700`              |
| ボーダー   | `border-stone-600`                                            |
| 見出し     | `text-stone-50`                                               |
| 本文       | `text-stone-200 leading-relaxed`                              |
| 補助       | `text-stone-400`                                              |
| プライマリ | `text-orange-500` / `bg-orange-500/20` / `ring-orange-500`    |
| 情報       | `text-cyan-400` / `bg-cyan-500/10` / `border-cyan-500/30`     |
| 警告       | `text-amber-400` / `bg-amber-500/10` / `border-amber-500/30`  |
| コード     | `text-violet-400`                                             |

### タイポグラフィ

```
h1: text-4xl font-bold text-stone-50 tracking-tight
h2: text-2xl font-bold text-stone-50 mt-12 mb-6 pb-3 border-b border-stone-700
h3: text-xl font-semibold text-orange-400 mt-8 mb-4
h4: text-lg font-semibold text-stone-300 mt-6 mb-3
```

### UI要素

- 角丸: ボタン `rounded-lg`、カード `rounded-xl`、バッジ `rounded-md`
- トランジション: ホバー `duration-200`、展開 `duration-300`
- フォーカス: `focus:ring-orange-500`

### スペーシング

- アーティクル: `space-y-12 px-8 py-8 w-[90%] mx-auto`
- セクション間: `mt-12` / サブセクション: `mt-8` / 段落: `mt-4`
- リスト項目: `space-y-2`

### コンポーネント

```tsx
// CodeBlock
<pre className="bg-stone-900 rounded-xl p-6 overflow-x-auto border border-stone-700 my-6">
  <code className="language-{lang} text-sm leading-relaxed">{code}</code>
</pre>

// Table
<table className="min-w-full border-collapse border border-stone-700">
  <thead><tr className="bg-stone-800">...</tr></thead>
  <tbody className="divide-y divide-stone-700">...</tbody>
</table>

// MermaidDiagram
<div className="bg-stone-900 rounded-xl p-6 border border-stone-700 my-6 overflow-x-auto">
  <div ref={ref} className="flex justify-center" />
</div>

// 注釈ボックス（情報）
<div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-6 my-6">
  <h4 className="text-cyan-400 font-semibold mb-2 text-sm uppercase tracking-wide">Info</h4>
  <p className="text-stone-200 text-sm leading-relaxed">{content}</p>
</div>

// 注釈ボックス（警告）
<div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 my-6">
  <h4 className="text-amber-400 font-semibold mb-2 text-sm uppercase tracking-wide">Warning</h4>
  <p className="text-stone-200 text-sm leading-relaxed">{content}</p>
</div>

// 展開可能セクション
<div className="border border-stone-700 rounded-xl overflow-hidden my-4">
  <button className="w-full flex items-center justify-between p-4 bg-stone-800 hover:bg-stone-700 transition-colors duration-200">
    <span className="text-stone-200 font-medium">{title}</span>
    <span className="text-stone-400">{expanded ? "▼" : "▶"}</span>
  </button>
  <div className="p-4 bg-stone-900">{children}</div>
</div>

// ホバー詳細（ツールチップ）
<span className="group relative cursor-help border-b border-dotted border-stone-500">
  {term}
  <span className="invisible group-hover:visible absolute ... bg-stone-800 text-stone-200 ...">
    {explanation}
  </span>
</span>
```

### PrismJS 使用時の注意

シンタックスハイライトを有効にするには、**言語定義とテーマ CSS 両方**のインポートが必要:

```typescript
import Prism from "prismjs";
import "prismjs/components/prism-rust"; // 言語定義
import "prismjs/themes/prism-tomorrow.css"; // テーマCSS（必須）

// 利用可能なテーマ: prism-tomorrow, prism-okaidia, prism-twilight, prism-dark
```

---

$ARGUMENTS
