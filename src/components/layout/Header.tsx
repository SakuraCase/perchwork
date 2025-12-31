/**
 * Header.tsx
 *
 * アプリケーションヘッダーコンポーネント
 * ロゴ/プロジェクトタイトルを表示するシンプルな固定ヘッダー
 */
interface HeaderProps {
  /** プロジェクト名（デフォルト: "Perchwork"） */
  projectName?: string;
}

/**
 * アプリケーションヘッダー
 * @param props - ヘッダーのプロパティ
 */
export function Header({ projectName = "Perchwork" }: HeaderProps) {
  return (
    <header className="h-14 border-b border-gray-700 bg-gray-900 flex items-center px-6">
      <h1 className="text-xl font-bold text-white">{projectName}</h1>
    </header>
  );
}
