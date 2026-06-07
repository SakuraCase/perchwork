import fs from 'fs/promises';
import path from 'path';
import type { Config } from '../types/index.js';

/**
 * 対象ファイルを収集するクラス
 */
export class FileCollector {
  private targetDir!: string;

  constructor(private config: Config) {}

  /**
   * 対象ファイルを収集する（再帰的）
   */
  async collectTargetFiles(): Promise<string[]> {
    console.log('対象ファイルを収集しています...');

    this.targetDir = this.config.target_dir;
    const extensions = this.config.extensions || ['.rs'];
    const excludePatterns = this.config.exclude || [];
    const targetFiles: string[] = [];

    await this.walkDirectory(this.targetDir, targetFiles, extensions, excludePatterns);

    console.log(`収集完了: ${targetFiles.length} ファイル`);

    return targetFiles;
  }

  /**
   * ディレクトリを再帰的に走査してファイルを収集
   */
  private async walkDirectory(
    dir: string,
    files: string[],
    extensions: string[],
    excludePatterns: string[]
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(this.targetDir, fullPath);

        if (this.shouldExclude(relativePath, excludePatterns)) {
          continue;
        }

        if (entry.isDirectory()) {
          await this.walkDirectory(fullPath, files, extensions, excludePatterns);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`ディレクトリの読み込みに失敗しました: ${dir} - ${error}`);
    }
  }

  /**
   * シンプルなglobパターンマッチ
   * 対応パターン: ＊＊/X, ＊＊/X/＊＊, ＊＊/X_＊.Y
   */
  private matchGlob(filePath: string, pattern: string): boolean {
    const p = pattern.replace(/\\/g, '/');
    const fp = filePath.replace(/\\/g, '/');

    // **/tests/** → /tests/ を含む
    if (p.startsWith('**/') && p.endsWith('/**')) {
      const dir = p.slice(3, -3);
      return fp.includes('/' + dir + '/') || fp.startsWith(dir + '/');
    }

    // **/で始まるパターン
    if (p.startsWith('**/')) {
      const suffix = p.slice(3);
      // **/test_*.rs → ファイル名がtest_で始まり.rsで終わる
      if (suffix.includes('*')) {
        const [prefix, ext] = suffix.split('*');
        const fileName = fp.split('/').pop() || '';
        return fileName.startsWith(prefix) && fileName.endsWith(ext);
      }
      // **/mod.rs → mod.rsで終わる
      return fp.endsWith('/' + suffix) || fp === suffix;
    }

    return fp.includes(pattern);
  }

  /**
   * exclude パターンにマッチするかチェック
   */
  private shouldExclude(relativePath: string, excludePatterns: string[]): boolean {
    const fp = relativePath.replace(/\\/g, '/');

    // デフォルトの除外パターン
    const defaultExcludes = ['node_modules', 'target', 'dist', '.git', 'vendor'];
    for (const pattern of defaultExcludes) {
      if (fp.includes(pattern)) {
        return true;
      }
    }

    // 設定の除外パターン
    for (const pattern of excludePatterns) {
      if (this.matchGlob(fp, pattern)) {
        return true;
      }
    }

    return false;
  }
}
