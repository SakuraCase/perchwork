/**
 * tracelight 設定ファイルの型定義
 */
export interface Config {
  /** 解析対象ディレクトリ（プロジェクトルートからの相対パス） */
  target_dir: string;

  /** JSON分割の深さ（ディレクトリ階層） */
  split_depth: number;

  /** 出力先ディレクトリ（デフォルト: "public/data"） */
  output_dir: string;

  /** 対象ファイル拡張子 */
  extensions: string[];

  /** 除外パターン（glob形式） */
  exclude: string[];

  /** 差分更新用: 最後に解析したコミットハッシュ */
  last_commit: string | null;

  /** 最終実行時刻（ISO 8601形式） */
  last_run: string | null;
}

/**
 * コマンドライン引数の型定義
 */
export interface CliArgs {
  /** 対象ディレクトリ（config.json の target_dir を上書き） */
  target?: string;

  /** 全体再生成フラグ */
  full?: boolean;

  /** 差分の基準コミット（config.json の last_commit を上書き） */
  since?: string;
}

/**
 * 実行時の設定（Config + CliArgs のマージ結果）
 */
export interface RuntimeConfig {
  target_dir: string;
  split_depth: number;
  output_dir: string;
  extensions: string[];
  exclude: string[];
  base_commit: string | null;  // --since または last_commit
  is_full_scan: boolean;       // --full フラグ
}
