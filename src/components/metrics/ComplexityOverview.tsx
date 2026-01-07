/**
 * ComplexityOverview.tsx
 *
 * 複雑度統計サマリーコンポーネント
 */

import type { ComplexityStats } from "../../types/complexity";

interface ComplexityOverviewProps {
  /** 統計データ */
  stats: ComplexityStats;
  /** 生成日時 */
  generatedAt?: string;
  /** 対象言語 */
  language?: string;
}

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  warning?: boolean;
  danger?: boolean;
}

function StatCard({ label, value, subtext, warning, danger }: StatCardProps) {
  let valueColor = "text-white";
  if (danger) valueColor = "text-red-400";
  else if (warning) valueColor = "text-yellow-400";

  return (
    <div className="bg-stone-800 rounded-lg p-4 border border-stone-700">
      <div className="text-sm text-stone-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
      {subtext && <div className="text-xs text-stone-500 mt-1">{subtext}</div>}
    </div>
  );
}

/**
 * 複雑度統計サマリー
 */
export function ComplexityOverview({
  stats,
  generatedAt,
  language,
}: ComplexityOverviewProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      {/* ヘッダー情報 */}
      <div className="flex items-center justify-between text-sm text-stone-400">
        <div className="flex items-center gap-4">
          {language && (
            <span className="bg-stone-700 px-2 py-0.5 rounded">{language}</span>
          )}
          <span>{stats.total_files} ファイル</span>
          <span>{stats.total_functions} 関数</span>
          <span>{stats.total_loc.toLocaleString()} 行</span>
        </div>
        {generatedAt && <span>生成: {formatDate(generatedAt)}</span>}
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard
          label="平均 CC"
          value={stats.avg_cc.toFixed(2)}
          subtext="循環的複雑度"
          warning={stats.avg_cc > 5}
          danger={stats.avg_cc > 10}
        />
        <StatCard
          label="最大 CC"
          value={stats.max_cc}
          warning={stats.max_cc > 10}
          danger={stats.max_cc > 20}
        />
        <StatCard
          label="平均 Cognitive"
          value={stats.avg_cognitive.toFixed(2)}
          subtext="認知的複雑度"
          warning={stats.avg_cognitive > 8}
          danger={stats.avg_cognitive > 15}
        />
        <StatCard
          label="最大 Cognitive"
          value={stats.max_cognitive}
          warning={stats.max_cognitive > 15}
          danger={stats.max_cognitive > 25}
        />
        <StatCard label="ファイル数" value={stats.total_files} />
        <StatCard label="関数数" value={stats.total_functions} />
      </div>

      {/* 警告サマリー */}
      {(stats.warnings.high_cc > 0 ||
        stats.warnings.high_cognitive > 0 ||
        stats.warnings.low_mi > 0) && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-400 font-medium mb-3">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            リファクタリング候補
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {stats.warnings.high_cc > 0 && (
              <div className="bg-stone-800/50 rounded p-3">
                <div className="text-yellow-400 font-medium mb-1">
                  高い循環的複雑度
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {stats.warnings.high_cc}
                  <span className="text-sm font-normal text-stone-400 ml-1">
                    関数
                  </span>
                </div>
                <div className="text-xs text-stone-500">
                  CC &gt; 10 → 分岐が多くテストが困難
                </div>
              </div>
            )}
            {stats.warnings.high_cognitive > 0 && (
              <div className="bg-stone-800/50 rounded p-3">
                <div className="text-yellow-400 font-medium mb-1">
                  高い認知的複雑度
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {stats.warnings.high_cognitive}
                  <span className="text-sm font-normal text-stone-400 ml-1">
                    関数
                  </span>
                </div>
                <div className="text-xs text-stone-500">
                  Cognitive &gt; 15 → 理解・保守が困難
                </div>
              </div>
            )}
            {stats.warnings.low_mi > 0 && (
              <div className="bg-stone-800/50 rounded p-3">
                <div className="text-yellow-400 font-medium mb-1">
                  低い保守性指標
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {stats.warnings.low_mi}
                  <span className="text-sm font-normal text-stone-400 ml-1">
                    ファイル
                  </span>
                </div>
                <div className="text-xs text-stone-500">
                  MI &lt; 20 → 大規模リファクタリングが必要
                </div>
              </div>
            )}
          </div>
          <div className="mt-3 text-xs text-stone-500">
            ↓ 下の「関数ランキング」で具体的な対象を確認できます
          </div>
        </div>
      )}
    </div>
  );
}
