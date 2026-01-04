---
name: generate-image
description: Nano Banana Pro APIで画像・インフォグラフィックを生成する。ユーザーがイラスト、インフォグラフィック、ビジュアルアート、概念のビジュアル説明画像などを求めた時に使用する。
---

# 画像生成スキル (Nano Banana Pro)

Google Gemini 3 Pro Image (Nano Banana Pro) を使用して画像を生成する。

## セットアップ

### 1. 依存関係のインストール

スクリプト専用の依存関係をインストールする（ルートとは分離）:

```bash
cd .claude/skills/generate-image/scripts
npm install
```

### 2. 環境変数の設定

```bash
export PERCHWORK_GOOGLE_GENAI_API_KEY="your-api-key"
```

## ワークフロー

### 1. プロンプト作成

インフォグラフィック向けの構造化プロンプトを作成する。
詳細は [references/prompt-guide.md](references/prompt-guide.md) を参照。

### 2. 画像生成

```bash
# 高品質モード (Nano Banana Pro)
node .claude/skills/generate-image/scripts/generate_image.mjs \
  "プロンプト" \
  -o public/img/{filename.png}

# 高速モード (Nano Banana)
node .claude/skills/generate-image/scripts/generate_image.mjs \
  "プロンプト" \
  -o public/img/{filename.png} \
  --model gemini-2.5-flash-image
```

## モデル選択

| モデル                       | 用途                                                           |
| ---------------------------- | -------------------------------------------------------------- |
| `gemini-3-pro-image-preview` | 高品質、テキスト精度高、インフォグラフィック向け（デフォルト） |
| `gemini-2.5-flash-image`     | 高速、低コスト、ラフスケッチ向け                               |

## 出力先

画像は `public/img/` に保存する。

## トラブルシューティング

### モジュールが見つからない

```
Error: Cannot find module '@google/genai'
```

`scripts/` ディレクトリで `npm install` を実行してください。

### API キーエラー

```
Error: PERCHWORK_GOOGLE_GENAI_API_KEY 環境変数が設定されていません
```

環境変数を設定してください。
