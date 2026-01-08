# perchwork

コードベースを解析し、理解を助けるローカル用ビジュアルツール

## 前提条件

- [Claude Code](https://github.com/anthropics/claude-code)
- Node.js (v18 以上推奨)

## セットアップ

```bash
cp config.example.json config.json
# config.json を編集して target_dir を設定
```

### 画像生成機能（オプション）

generate-image スキルを使用する場合、Google GenAI API キーの設定が必要:

```bash
export PERCHWORK_GOOGLE_GENAI_API_KEY="your-api-key"
```

## コマンド

Claude Code で利用可能なコマンド:

| コマンド                 | 説明                                                       |
| ------------------------ | ---------------------------------------------------------- |
| `/analyze`               | コードベースを解析し構造化 JSON を生成                     |
| `/analyze-prepare`       | 解析チェックリスト（TODO.md）を作成                        |
| `/perchwork-duplication` | jscpd を使った重複コード検出                               |
| `/i`                     | コードベースへの質疑応答・調査                             |
| `/w`                     | /i での会話内容から セッションとドキュメントファイルを生成 |

詳細は `.claude/commands/` 内の各ファイルを参照。

## 使い方

```bash
npm run dev    # 開発サーバー起動
```
