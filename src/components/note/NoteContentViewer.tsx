/**
 * NoteContentViewer.tsx
 *
 * 生成されたTSXコンポーネントを動的インポートで表示
 * import.meta.glob を使用してファイルが存在しない場合もエラーにならない
 */

import { NoteEmptyState } from "./NoteEmptyState";

type ComponentRegistry = Record<string, React.ComponentType>;

interface ComponentModule {
  components: ComponentRegistry;
}

const sessionModules = import.meta.glob<ComponentModule>(
  "../../generated/sessions/index.ts",
  { eager: true }
);

const documentModules = import.meta.glob<ComponentModule>(
  "../../generated/document/index.ts",
  { eager: true }
);

const sessionComponents = Object.values(sessionModules)[0]?.components ?? {};
const documentComponents = Object.values(documentModules)[0]?.components ?? {};

interface NoteContentViewerProps {
  /** 表示するコンポーネントのパス（例: "sessions/battle-run-flow"） */
  contentPath: string | null;
}

export function NoteContentViewer({ contentPath }: NoteContentViewerProps) {
  if (!contentPath) {
    return <NoteEmptyState type="no-selection" />;
  }

  // パスからタイプとキーを抽出
  // "sessions/battle-run-flow" → type: "sessions", key: "battle-run-flow"
  // "document/battle/battle-loop" → type: "document", key: "battle/battle-loop"
  const [type, ...rest] = contentPath.split("/");
  const key = rest.join("/");

  const registry = type === "sessions" ? sessionComponents : documentComponents;
  const Component = registry?.[key];

  if (!Component) {
    return <NoteEmptyState type="no-selection" />;
  }

  return (
    <div className="h-full overflow-auto">
      <Component />
    </div>
  );
}
