# Tracelight

コードベースの構造と依存関係を可視化するツール。

## 特徴

- LLM によるコード解析と概要生成
- 依存関係グラフの可視化
- Callers（呼び出し元）と影響範囲分析
- テスト紐付けとカバレッジ表示

## クイックスタート

```bash
# 1. リポジトリをクローン
git clone <tracelight-repo> tools/tracelight
cd tools/tracelight

# 2. 依存関係をインストール
npm install

# 3. 設定ファイルを作成
cp config.example.json config.json
# config.json の target_dir を編集

# 4. コードベースを解析（Claude Code）
claude
> /tracelight

# 5. 閲覧用 SPA を起動
npm run dev
# → http://localhost:5173
```

## 設定

`config.json` で以下を設定:

| 項目 | 説明 |
|------|------|
| target_dir | 解析対象ディレクトリ |
| split_depth | JSON 分割の深さ |
| extensions | 対象ファイル拡張子 |
| exclude | 除外パターン |

## 開発

```bash
npm run dev       # 開発サーバー起動
npm run build     # 本番ビルド
npm run lint      # Lint 実行
npm run typecheck # 型チェック
```

## ライセンス

MIT
