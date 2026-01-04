# Nano Banana Pro プロンプトガイド

Nano Banana Pro (Gemini 3 Pro Image) でインフォグラフィックやイラストを生成するためのプロンプト設計ガイド。

## 目次

- [基本原則](#基本原則)
- [プロンプト構造](#プロンプト構造)
- [詳細記述のコツ](#詳細記述のコツ)
- [テキストレンダリング](#テキストレンダリング)
- [スタイル指定](#スタイル指定)
- [構図とカメラ](#構図とカメラ)
- [プロンプト例](#プロンプト例)
- [制限事項](#制限事項)
- [Tips](#tips)

## 基本原則

### 1. ナラティブで記述する（キーワード羅列NG）

```
❌ "infographic, 4k, trending, masterpiece, beautiful"
✅ "A clean, modern infographic explaining the coffee brewing process,
   with step-by-step illustrations and warm brown color scheme."
```

### 2. 目的と意図を明確に

```
❌ "Create an image"
✅ "Create an educational poster for elementary school students
   explaining the water cycle"
```

## プロンプト構造

推奨構造:

```
[主題 + 形容詞] doing [アクション] in [場所/コンテキスト].
[構図/カメラアングル]. [ライティング/雰囲気]. [スタイル/メディア].
```

例:
```
A friendly robot barista with glowing blue optics brewing coffee
in a futuristic cafe on Mars.
Wide shot with shallow depth of field.
Warm ambient lighting with neon accents.
3D animation style with clean lines.
```

## 詳細記述のコツ

### 曖昧→具体的に

```
❌ "fantasy armor"
✅ "ornate elven plate armor, etched with silver leaf patterns,
   with a high collar and pauldrons shaped like falcon wings"
```

### 否定形より肯定形

```
❌ "a street with no cars"
✅ "an empty, deserted street"
```

### 複雑なシーンはステップで

```
"First, create a sunset beach background.
Then, add a lighthouse on the right side.
Finally, place a sailboat in the distance."
```

## テキストレンダリング

Nano Banana Pro はテキスト描画に優れている。

### 明確に指定する

```
✅ "Write the text 'HELLO WORLD' in bold, red, serif font on the sign"
✅ "Headline 'URBAN EXPLORER' rendered in white, sans-serif font at the top"
```

### ポイント

- テキスト内容を正確に指定
- フォントスタイルを記述（bold, sans-serif, handwritten など）
- 配置場所を明示（at the top, on the banner, below the image）
- 色とサイズを指定

## スタイル指定

### イラスト・アート

```
- "3D animation style with clean lines"
- "Watercolor painting with soft edges"
- "Flat design with bold colors"
- "Isometric illustration"
- "Kawaii-style with bold outlines and cel-shading"
```

### フォトリアリスティック

写真用語を使用:
```
- "Shot with 85mm portrait lens"
- "Golden hour lighting"
- "Shallow depth of field (f/1.8)"
- "Three-point softbox lighting setup"
```

### インフォグラフィック

```
- "Clean, modern infographic style"
- "Minimalist data visualization"
- "Professional business presentation style"
```

## 構図とカメラ

```
- "Wide shot" / "Close-up" / "Extreme close-up"
- "Low angle shot" / "High angle shot" / "Eye level"
- "Centered composition" / "Rule of thirds"
- "Negative space on the left"
- "Portrait orientation" / "Landscape orientation"
- "16:9 cinematic aspect ratio"
```

## プロンプト例

### データインフォグラフィック

```
A clean, modern infographic showing global coffee consumption statistics.
Features a world map with consumption data by region,
pie chart showing top 5 consuming countries,
and bar graph of yearly trends.
Minimalist style with brown and cream color scheme.
All text in English with clearly legible sans-serif labels.
White background, professional business presentation style.
```

### 概念説明イラスト

```
An educational illustration explaining how photosynthesis works,
designed for elementary school students.
Shows a friendly cartoon tree with labeled parts:
sun, leaves, water, CO2, oxygen with arrows showing the flow.
Soft green and yellow colors, friendly accessible style.
Clear text labels in English, rounded sans-serif font.
```

### 製品比較インフォグラフィック

```
A side-by-side comparison infographic of electric vs gasoline cars.
Two columns with icons for each category:
cost, environmental impact, maintenance, range.
Checkmarks and crosses indicating pros and cons.
Clean flat design, blue for electric, orange for gasoline.
White background, professional style.
Bold header text 'EV vs Gas: Which is Right for You?'
```

### コンセプトビジュアル

```
An inspiring illustration representing creative thinking.
A glowing lightbulb at center with colorful ideas flowing out,
surrounded by symbols of innovation: gears, stars, sparkles.
Vibrant gradient colors from purple to orange.
Modern flat style with subtle shadows.
Square format, suitable for social media.
```

### ロゴ・テキスト重視

```
Modern minimalist logo for a coffee shop called 'The Daily Grind'.
Clean, bold, sans-serif text in dark brown.
Circular frame incorporating a stylized coffee bean.
White background, suitable for print and digital use.
Text perfectly centered and legible.
```

## 制限事項

Nano Banana Pro の既知の制限:

- **小さなテキスト**: 小さいフォントサイズは読みにくくなる場合がある
- **複雑なスペル**: 長い単語や専門用語は誤字が発生することがある
- **細かいディテール**: 非常に細かい要素は正確に描画されない場合がある
- **多言語テキスト**: 英語以外の言語はエラーが発生しやすい
- **データ精度**: インフォグラフィックの数値データは事実確認が必要

## Tips

1. **キーワード羅列を避ける**: "4k, masterpiece" などは不要
2. **具体的に記述**: 曖昧な表現より詳細な描写
3. **目的を明示**: 何のための画像かを伝える
4. **色は2-3色**: 多すぎると雑然とする
5. **英語推奨**: テキストは英語が最も正確
6. **1shotで決める**: 必要な情報をすべてプロンプトに含める

Sources:
- [Gemini Image Generation - Google AI for Developers](https://ai.google.dev/gemini-api/docs/image-generation)
- [Nano Banana Pro prompting tips - Google Blog](https://blog.google/products/gemini/prompting-tips-nano-banana-pro/)
