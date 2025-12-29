# tracelight

コードベースを解析し、理解を助けるビジュアルツール

## セットアップ

```bash
cp config.example.json config.json
# config.json を編集して target_dir を設定
```

## 使い方

```bash
/tracelight              # 差分更新（初回は全ファイル）
/tracelight --full       # 全体再生成
/tracelight --target dir # 対象ディレクトリ指定
```

## 出力

`public/data/` に以下を生成:

- `index.json` - メインインデックス
- `search_index.json` - 検索用
- `call_graph/` - コールグラフ
