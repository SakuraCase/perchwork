/**
 * MetricSelector.tsx
 *
 * メトリクス選択コンポーネント
 */

import type { MetricType } from "../../types/complexity";
import { METRIC_CONFIGS } from "../../types/complexity";

interface MetricSelectorProps {
  /** 選択中のメトリクス */
  selected: MetricType;
  /** 選択変更時のコールバック */
  onChange: (metric: MetricType) => void;
  /** 利用可能なメトリクス（指定しない場合は全て） */
  availableMetrics?: MetricType[];
}

const DEFAULT_METRICS: MetricType[] = [
  "cc",
  "cognitive",
  "loc",
  "mi",
  "nargs",
];

/**
 * メトリクス選択ドロップダウン
 */
export function MetricSelector({
  selected,
  onChange,
  availableMetrics = DEFAULT_METRICS,
}: MetricSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-stone-400">メトリクス:</label>
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value as MetricType)}
        className="bg-stone-700 text-white text-sm rounded px-3 py-1.5 border border-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        {availableMetrics.map((metric) => (
          <option key={metric} value={metric}>
            {METRIC_CONFIGS[metric].label}
          </option>
        ))}
      </select>
    </div>
  );
}
