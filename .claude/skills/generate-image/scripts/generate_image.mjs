#!/usr/bin/env node
/**
 * Nano Banana Pro API を呼び出して画像を生成するスクリプト
 *
 * 使用方法:
 *   node generate_image.mjs "プロンプト" -o 出力パス [--model モデル名]
 *
 * 環境変数:
 *   PERCHWORK_GOOGLE_GENAI_API_KEY - Google GenAI API キー（必須）
 *
 * モデル:
 *   - gemini-3-pro-image-preview (デフォルト、高品質)
 *   - gemini-2.5-flash-image (高速、低コスト)
 */
import { GoogleGenAI } from "@google/genai";
import { writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { parseArgs } from "util";

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    output: { type: "string", short: "o" },
    model: { type: "string", default: "gemini-3-pro-image-preview" },
    help: { type: "boolean", short: "h" },
  },
  allowPositionals: true,
});

if (values.help) {
  console.log(`
Usage: generate_image.mjs <prompt> -o <output-path> [options]

Arguments:
  prompt              画像生成のプロンプト

Options:
  -o, --output        出力ファイルパス（必須）
  --model             使用するモデル (default: gemini-3-pro-image-preview)
                      - gemini-3-pro-image-preview: 高品質（Nano Banana Pro）
                      - gemini-2.5-flash-image: 高速（Nano Banana）
  -h, --help          ヘルプを表示

Environment:
  PERCHWORK_GOOGLE_GENAI_API_KEY  Google GenAI API キー（必須）
`);
  process.exit(0);
}

const prompt = positionals[0];
const output = values.output;
const model = values.model || "gemini-3-pro-image-preview";

if (!prompt || !output) {
  console.error("Error: プロンプトと出力パスは必須です");
  console.error("Usage: generate_image.mjs <prompt> -o <output-path>");
  console.error("       generate_image.mjs --help でヘルプを表示");
  process.exit(1);
}

const apiKey = process.env.PERCHWORK_GOOGLE_GENAI_API_KEY;
if (!apiKey) {
  console.error(
    "Error: PERCHWORK_GOOGLE_GENAI_API_KEY 環境変数が設定されていません"
  );
  console.error(
    "       export PERCHWORK_GOOGLE_GENAI_API_KEY='your-api-key' を実行してください"
  );
  process.exit(1);
}

const genai = new GoogleGenAI({ apiKey });

console.log(`モデル: ${model}`);
console.log(`プロンプト: ${prompt.substring(0, 50)}...`);
console.log("画像を生成中...");

try {
  const response = await genai.models.generateContent({
    model,
    contents: prompt,
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      const imageData = Buffer.from(part.inlineData.data, "base64");
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, imageData);
      console.log(`画像を保存しました: ${output}`);
      process.exit(0);
    }
  }

  console.error("Error: 画像データがレスポンスに含まれていません");
  console.error("レスポンス:", JSON.stringify(response, null, 2));
  process.exit(1);
} catch (error) {
  console.error(`Error: ${error.message}`);
  if (error.response) {
    console.error("Response:", error.response);
  }
  process.exit(1);
}
