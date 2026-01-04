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

### カラーパレット

| 用途   | クラス                                                       |
| ------ | ------------------------------------------------------------ |
| 背景   | `bg-gray-950` / `bg-gray-900` / `bg-gray-800`                |
| 見出し | `text-gray-50`                                               |
| 本文   | `text-gray-200 leading-relaxed`                              |
| 補助   | `text-gray-400`                                              |
| 情報   | `text-cyan-400` / `bg-cyan-500/10` / `border-cyan-500/30`    |
| 警告   | `text-amber-400` / `bg-amber-500/10` / `border-amber-500/30` |
| コード | `text-violet-400`                                            |

### タイポグラフィ

```
h1: text-4xl font-bold text-gray-50 tracking-tight
h2: text-2xl font-bold text-gray-50 mt-12 mb-6 pb-3 border-b border-gray-800
h3: text-xl font-semibold text-cyan-400 mt-8 mb-4
h4: text-lg font-semibold text-gray-300 mt-6 mb-3
```

### スペーシング

- アーティクル: `space-y-12 px-8 py-8 w-[90%] mx-auto`
- セクション間: `mt-12` / サブセクション: `mt-8` / 段落: `mt-4`
- リスト項目: `space-y-2`

### コンポーネント

```tsx
// CodeBlock
<pre className="bg-gray-900 rounded-lg p-6 overflow-x-auto border border-gray-800 my-6">
  <code className="language-{lang} text-sm leading-relaxed">{code}</code>
</pre>

// Table
<table className="min-w-full border-collapse border border-gray-800">
  <thead><tr className="bg-gray-900">...</tr></thead>
  <tbody className="divide-y divide-gray-800">...</tbody>
</table>

// MermaidDiagram
<div className="bg-gray-900 rounded-lg p-6 border border-gray-800 my-6 overflow-x-auto">
  <div ref={ref} className="flex justify-center" />
</div>

// 注釈ボックス（情報）
<div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-6 my-6">
  <h4 className="text-cyan-400 font-semibold mb-2 text-sm uppercase tracking-wide">Info</h4>
  <p className="text-gray-200 text-sm leading-relaxed">{content}</p>
</div>

// 注釈ボックス（警告）
<div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6 my-6">
  <h4 className="text-amber-400 font-semibold mb-2 text-sm uppercase tracking-wide">Warning</h4>
  <p className="text-gray-200 text-sm leading-relaxed">{content}</p>
</div>

// Framer Motion - ステップアニメーション
import { motion } from "framer-motion";

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, delay: index * 0.1 }}
>
  {content}
</motion.div>

// Framer Motion - SVGパスアニメーション
<motion.svg viewBox="0 0 100 100">
  <motion.path
    d={pathData}
    stroke="currentColor"
    strokeWidth={2}
    fill="none"
    initial={{ pathLength: 0 }}
    animate={{ pathLength: 1 }}
    transition={{ duration: 1.5, ease: "easeInOut" }}
  />
</motion.svg>

// Framer Motion - リストの順次表示
const container = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } };

<motion.ul variants={container} initial="hidden" animate="visible">
  {items.map(i => <motion.li key={i} variants={item}>{i}</motion.li>)}
</motion.ul>

// 展開可能セクション（Progressive Disclosure）
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function ExpandableSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden my-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 bg-gray-900 hover:bg-gray-800 transition-colors"
      >
        <span className="text-gray-200 font-medium">{title}</span>
        <span className="text-gray-400">{expanded ? "▼" : "▶"}</span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-gray-950">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ホバー詳細（ツールチップ）
function Tooltip({ term, explanation }: { term: string; explanation: string }) {
  return (
    <span className="group relative cursor-help border-b border-dotted border-gray-500">
      {term}
      <span className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-800 text-gray-200 text-sm rounded-lg whitespace-nowrap z-10 shadow-lg">
        {explanation}
        <span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-800" />
      </span>
    </span>
  );
}

// コードウォークスルー（行ホバーで説明表示）
interface CodeLine { code: string; note?: string; }
function CodeWalkthrough({ lines, language }: { lines: CodeLine[]; language: string }) {
  return (
    <pre className="bg-gray-900 rounded-lg p-4 border border-gray-800 my-6 overflow-x-auto">
      {lines.map((line, i) => (
        <div key={i} className="group relative hover:bg-gray-800/50 px-2 -mx-2 rounded">
          <code className={`language-${language} text-sm`}>{line.code}</code>
          {line.note && (
            <span className="invisible group-hover:visible absolute left-full ml-4 top-0 px-3 py-1 bg-cyan-500/20 text-cyan-300 text-xs rounded whitespace-nowrap">
              {line.note}
            </span>
          )}
        </div>
      ))}
    </pre>
  );
}
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
