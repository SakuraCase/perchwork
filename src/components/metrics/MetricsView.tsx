/**
 * MetricsView.tsx
 *
 * メトリクスタブのメインビューコンポーネント
 */

import { useComplexityLoader } from "../../hooks/useComplexityLoader";
import { ComplexityOverview } from "./ComplexityOverview";
import { ComplexityHeatmap } from "./ComplexityHeatmap";
import { FunctionRanking } from "./FunctionRanking";
import { FileRanking } from "./FileRanking";
import { MetricsGuide } from "./MetricsGuide";

interface MetricsViewProps {
  /** ファイル選択時のコールバック */
  onSelectFile?: (relativePath: string, lineNumber?: number) => void;
}

/**
 * メトリクスタブのメインビュー
 */
export function MetricsView({ onSelectFile }: MetricsViewProps) {
  const {
    index,
    isLoading,
    error,
    getTopFunctionsByCC,
    getTopFunctionsByCognitive,
  } = useComplexityLoader();

  // ローディング状態
  if (isLoading && !index) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">複雑度データを読み込み中...</div>
      </div>
    );
  }

  // エラー状態
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-red-400 mb-2">エラーが発生しました</div>
          <div className="text-gray-400 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  // データがない場合
  if (!index) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="text-gray-300 text-lg mb-4">
            複雑度データがありません
          </div>
          <div className="text-gray-400 text-sm mb-4">
            <code className="bg-gray-800 px-2 py-1 rounded">
              /perchwork-complexity
            </code>
            スキルを実行して解析データを生成してください。
          </div>
          <div className="text-gray-500 text-xs">
            <p>前提条件:</p>
            <code className="bg-gray-800 px-2 py-0.5 rounded">
              cargo install rust-code-analysis-cli
            </code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* メトリクスガイド */}
      <section>
        <MetricsGuide />
      </section>

      {/* 統計サマリー */}
      <section>
        <ComplexityOverview
          stats={index.stats}
          generatedAt={index.generated_at}
          language={index.language}
        />
      </section>

      {/* ヒートマップ */}
      <section>
        <ComplexityHeatmap
          files={index.files}
          onSelectFile={onSelectFile}
        />
      </section>

      {/* ファイルランキング（MI含む） */}
      <section>
        <FileRanking
          files={index.files}
          onSelectFile={onSelectFile}
        />
      </section>

      {/* 関数ランキング */}
      <section>
        <FunctionRanking
          getTopByCC={getTopFunctionsByCC}
          getTopByCognitive={getTopFunctionsByCognitive}
          onSelectFile={onSelectFile}
        />
      </section>
    </div>
  );
}
