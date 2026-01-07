/**
 * MetricsGuide.tsx
 *
 * 複雑度メトリクスの説明ガイド
 */

import { useState } from "react";

interface MetricInfo {
  name: string;
  shortName: string;
  description: string;
  interpretation: string;
  thresholds: {
    good: string;
    warning: string;
    danger: string;
  };
  tips: string;
}

const METRICS: MetricInfo[] = [
  {
    name: "循環的複雑度",
    shortName: "CC",
    description:
      "コード内の独立した実行パス（分岐）の数を測定します。if文、ループ、switch文などの制御構造が増えるほど値が大きくなります。",
    interpretation:
      "テストに必要な最小ケース数の目安になります。CC=10なら、完全にカバーするには最低10個のテストケースが必要です。",
    thresholds: {
      good: "1〜10: 理解しやすく、テストも容易",
      warning: "11〜20: 複雑。リファクタリングを検討",
      danger: "21以上: 非常に複雑。バグが潜みやすい",
    },
    tips: "大きな関数を小さな関数に分割することでCCを下げられます。早期リターン（ガード句）も効果的です。",
  },
  {
    name: "認知的複雑度",
    shortName: "Cognitive",
    description:
      "コードを読む人間にとっての理解しやすさを測定します。ネストの深さ、ループの入れ子、break/continueなどを考慮し、「読みにくさ」を数値化します。",
    interpretation:
      "CCが「テストの難しさ」を測るのに対し、Cognitiveは「保守の難しさ」を測ります。同じCCでも、ネストが深いコードはCognitiveが高くなります。",
    thresholds: {
      good: "1〜8: 読みやすく保守しやすい",
      warning: "9〜15: 理解に時間がかかる",
      danger: "16以上: 非常に読みにくい。改善が必要",
    },
    tips: "ネストを浅くする、条件を反転して早期リターンする、複雑な条件を関数に抽出するなどが効果的です。",
  },
  {
    name: "保守性指標",
    shortName: "MI",
    description:
      "コードの保守しやすさを0〜100のスコアで表します。行数、複雑度、Halstead指標から算出されます。",
    interpretation:
      "高いほど保守しやすいコードです。ファイル単位で計算され、プロジェクト全体の健全性を把握するのに役立ちます。",
    thresholds: {
      good: "65以上: 保守性が高い",
      warning: "20〜64: 注意が必要",
      danger: "20未満: 保守が困難。大規模リファクタリングを検討",
    },
    tips: "関数を小さく保つ、意味のある変数名を使う、コメントを適切に追加することでMIが向上します。",
  },
  {
    name: "引数の数",
    shortName: "NArgs",
    description:
      "関数が受け取る引数の数を測定します。引数が多すぎると、関数の役割が不明確になりがちです。",
    interpretation:
      "引数が多い関数は、複数の責務を持っている可能性があります。データをまとめる構造体の導入を検討してください。",
    thresholds: {
      good: "1〜3: 適切な数",
      warning: "4〜5: やや多い",
      danger: "6以上: 多すぎる。構造体でまとめることを検討",
    },
    tips: "関連する引数をまとめた構造体を作成する、ビルダーパターンを使用するなどで改善できます。",
  },
];

interface MetricsGuideProps {
  /** 初期表示状態 */
  defaultExpanded?: boolean;
}

/**
 * メトリクス説明ガイド
 */
export function MetricsGuide({ defaultExpanded = false }: MetricsGuideProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-stone-800 rounded-lg border border-stone-700">
      {/* ヘッダー */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-stone-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-orange-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-lg font-medium text-white">
            メトリクスの見方
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-stone-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* コンテンツ */}
      {isExpanded && (
        <div className="border-t border-stone-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {METRICS.map((metric) => (
              <MetricCard key={metric.shortName} metric={metric} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  metric: MetricInfo;
}

function MetricCard({ metric }: MetricCardProps) {
  return (
    <div className="bg-stone-900/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="bg-orange-600 text-white text-xs font-bold px-2 py-0.5 rounded">
          {metric.shortName}
        </span>
        <span className="text-white font-medium">{metric.name}</span>
      </div>

      <p className="text-sm text-stone-400 mb-3">{metric.description}</p>

      <div className="text-xs space-y-1 mb-3">
        <div className="flex items-start gap-2">
          <span className="w-2 h-2 rounded bg-green-500 mt-1 shrink-0" />
          <span className="text-stone-300">{metric.thresholds.good}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="w-2 h-2 rounded bg-yellow-500 mt-1 shrink-0" />
          <span className="text-stone-300">{metric.thresholds.warning}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="w-2 h-2 rounded bg-red-500 mt-1 shrink-0" />
          <span className="text-stone-300">{metric.thresholds.danger}</span>
        </div>
      </div>

      <div className="text-xs text-stone-500 border-t border-stone-700 pt-2">
        💡 {metric.tips}
      </div>
    </div>
  );
}
