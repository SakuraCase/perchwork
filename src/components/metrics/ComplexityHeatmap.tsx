/**
 * ComplexityHeatmap.tsx
 *
 * 複雑度ヒートマップ（ツリーマップ）コンポーネント
 * EChartsを使用してファイル/関数の複雑度を可視化
 */

import { useEffect, useRef, useState, useCallback } from "react";
import * as echarts from "echarts";
import type { ComplexityFileSummary } from "../../types/complexity";

interface ComplexityHeatmapProps {
  /** ファイルサマリーリスト */
  files: ComplexityFileSummary[];
  /** ファイル選択時のコールバック */
  onSelectFile?: (relativePath: string) => void;
}

type HeatmapMetric = "cc_avg" | "cognitive_avg" | "mi" | "loc";

interface MetricConfig {
  label: string;
  description: string;
  thresholds: [number, number]; // [warn, danger]
  lowerIsBetter: boolean; // MIのように低いほど悪いメトリクス用
}

const HEATMAP_METRIC_CONFIGS: Record<HeatmapMetric, MetricConfig> = {
  cc_avg: {
    label: "平均CC",
    description: "循環的複雑度（分岐の多さ）",
    thresholds: [5, 10],
    lowerIsBetter: false,
  },
  cognitive_avg: {
    label: "平均Cognitive",
    description: "認知的複雑度（理解しにくさ）",
    thresholds: [8, 15],
    lowerIsBetter: false,
  },
  mi: {
    label: "MI",
    description: "保守性指標（低いほど保守困難）",
    thresholds: [40, 20], // 40未満で警告、20未満で危険
    lowerIsBetter: true,
  },
  loc: {
    label: "行数",
    description: "コードの物理的なサイズ",
    thresholds: [200, 500],
    lowerIsBetter: false,
  },
};

/**
 * 値に基づく色を取得
 */
function getColor(value: number, metric: HeatmapMetric): string {
  const config = HEATMAP_METRIC_CONFIGS[metric];
  const [warn, danger] = config.thresholds;

  if (config.lowerIsBetter) {
    // MI: 低いほど悪い
    if (value <= danger) return "#ef4444"; // red-500
    if (value <= warn) return "#eab308"; // yellow-500
    return "#22c55e"; // green-500
  } else {
    // CC, Cognitive, LOC: 高いほど悪い
    if (value >= danger) return "#ef4444"; // red-500
    if (value >= warn) return "#eab308"; // yellow-500
    return "#22c55e"; // green-500
  }
}

/**
 * メトリクス値を取得
 */
function getMetricValue(file: ComplexityFileSummary, metric: HeatmapMetric): number {
  switch (metric) {
    case "cc_avg":
      return file.cc_avg;
    case "cognitive_avg":
      return file.cognitive_avg;
    case "mi":
      return file.mi ?? 100; // MI未定義は良好とみなす
    case "loc":
      return file.loc;
  }
}

/**
 * 面積用の値を計算（MIは反転させる）
 */
function getAreaValue(file: ComplexityFileSummary, metric: HeatmapMetric): number {
  const config = HEATMAP_METRIC_CONFIGS[metric];
  const value = getMetricValue(file, metric);

  if (config.lowerIsBetter) {
    // MI: 低いほど大きく表示（100から引く）
    return Math.max(1, 100 - value);
  }
  // CC, Cognitive, LOC: そのまま（最小値1を保証）
  return Math.max(1, value);
}

/**
 * パスからディレクトリ構造を構築
 */
function buildTreeData(
  files: ComplexityFileSummary[],
  metric: HeatmapMetric
): echarts.TreemapSeriesOption["data"] {
  const root: Record<string, unknown> = {};

  for (const file of files) {
    const parts = file.relative_path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (isLast) {
        // ファイルノード
        const value = getMetricValue(file, metric);
        const areaValue = getAreaValue(file, metric);

        if (!current.children) {
          current.children = [];
        }
        (current.children as unknown[]).push({
          name: part,
          value: areaValue, // 面積もメトリクスに連動
          metricValue: value, // ツールチップ用に元の値を保持
          path: file.relative_path,
          itemStyle: {
            color: getColor(value, metric),
          },
        });
      } else {
        // ディレクトリノード
        if (!current.children) {
          current.children = [];
        }
        let child = (
          current.children as { name: string; children?: unknown[] }[]
        ).find((c) => c.name === part);
        if (!child) {
          child = { name: part, children: [] };
          (current.children as unknown[]).push(child);
        }
        current = child as Record<string, unknown>;
      }
    }
  }

  return (root.children as echarts.TreemapSeriesOption["data"]) || [];
}

/**
 * 複雑度ヒートマップ
 */
export function ComplexityHeatmap({
  files,
  onSelectFile,
}: ComplexityHeatmapProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [metric, setMetric] = useState<HeatmapMetric>("cc_avg");

  // メトリクス変更ハンドラ
  const handleMetricChange = useCallback((m: HeatmapMetric) => {
    setMetric(m);
  }, []);

  // クリックハンドラ
  const handleClick = useCallback(
    (params: unknown) => {
      const p = params as { data?: { path?: string } };
      if (p.data?.path) {
        onSelectFile?.(p.data.path);
      }
    },
    [onSelectFile]
  );

  // チャートの初期化・更新・クリーンアップを1つのuseEffectで管理
  useEffect(() => {
    if (!chartRef.current) return;

    // チャートの初期化
    const chart = echarts.init(chartRef.current, "dark");
    chartInstance.current = chart;

    const treeData = buildTreeData(files, metric);
    const metricConfig = HEATMAP_METRIC_CONFIGS[metric];

    const option: echarts.EChartsOption = {
      tooltip: {
        formatter: (params: unknown) => {
          const p = params as {
            name: string;
            value?: number;
            data?: { path?: string; metricValue?: number };
          };
          const metricValue = p.data?.metricValue;
          if (metricValue !== undefined) {
            return `
              <div style="font-weight: bold">${p.name}</div>
              <div>${metricConfig.label}: ${typeof metricValue === "number" ? metricValue.toFixed(2) : metricValue}</div>
              <div style="font-size: 11px; color: #888;">${metricConfig.description}</div>
            `;
          }
          return p.name;
        },
      },
      series: [
        {
          type: "treemap",
          data: treeData,
          leafDepth: 10, // 全階層を表示（十分大きな値）
          roam: "move",
          nodeClick: "zoomToNode",
          visibleMin: 300, // 小さすぎる要素も表示
          breadcrumb: {
            show: true,
            top: 5,
            left: 5,
            itemStyle: {
              color: "#374151",
            },
            emphasis: {
              itemStyle: {
                color: "#4b5563",
              },
            },
          },
          label: {
            show: true,
            formatter: "{b}",
            fontSize: 10,
            color: "#fff",
            textShadowColor: "rgba(0,0,0,0.5)",
            textShadowBlur: 2,
          },
          upperLabel: {
            show: true,
            height: 20,
            color: "#fff",
            backgroundColor: "rgba(0,0,0,0.3)",
          },
          itemStyle: {
            borderColor: "#1f2937",
            borderWidth: 1,
            gapWidth: 1,
          },
          levels: [
            {
              // ルートレベル（core）
              itemStyle: {
                borderWidth: 3,
                gapWidth: 3,
                borderColor: "#374151",
              },
              upperLabel: {
                show: true,
              },
            },
            {
              // 第2レベル（battle, unit等）
              itemStyle: {
                borderWidth: 2,
                gapWidth: 2,
                borderColor: "#4b5563",
              },
              upperLabel: {
                show: true,
              },
            },
            {
              // 第3レベル（entity, service等）
              itemStyle: {
                borderWidth: 1,
                gapWidth: 1,
                borderColor: "#6b7280",
              },
              upperLabel: {
                show: true,
              },
            },
            {
              // 第4レベル以降（ファイル）- 色を保持
              itemStyle: {
                borderWidth: 1,
                gapWidth: 1,
              },
            },
          ],
        },
      ],
    };

    chart.setOption(option);

    // クリックイベント
    chart.on("click", handleClick);

    // リサイズ対応
    const handleResize = () => {
      chart.resize();
    };
    window.addEventListener("resize", handleResize);

    // クリーンアップ
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.off("click", handleClick);
      chart.dispose();
      chartInstance.current = null;
    };
  }, [files, metric, handleClick]);

  const currentConfig = HEATMAP_METRIC_CONFIGS[metric];

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-lg font-medium text-white">複雑度ヒートマップ</h3>
        <select
          value={metric}
          onChange={(e) => handleMetricChange(e.target.value as HeatmapMetric)}
          className="bg-gray-700 text-white text-sm rounded px-3 py-1.5 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {(Object.keys(HEATMAP_METRIC_CONFIGS) as HeatmapMetric[]).map((m) => (
            <option key={m} value={m}>
              {HEATMAP_METRIC_CONFIGS[m].label}
            </option>
          ))}
        </select>
      </div>

      {/* 凡例 */}
      <div className="px-4 py-3 text-xs border-b border-gray-700">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="text-gray-400">
            <span className="text-gray-300">{currentConfig.label}</span>
            <span className="mx-2">-</span>
            <span>{currentConfig.description}</span>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-500" />
              <span className="text-green-400">良好</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-yellow-500" />
              <span className="text-yellow-400">注意</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-red-500" />
              <span className="text-red-400">危険</span>
            </span>
          </div>
        </div>
        <div className="mt-2 text-gray-500">
          面積・色ともに選択したメトリクスに連動します。
          {currentConfig.lowerIsBetter
            ? "値が低いほど面積が大きく、赤く表示されます。"
            : "値が高いほど面積が大きく、赤く表示されます。"}
        </div>
      </div>

      {/* チャート */}
      <div ref={chartRef} className="h-[500px] w-full" />
    </div>
  );
}
