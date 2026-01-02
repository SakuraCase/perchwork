import fs from 'fs/promises';
import path from 'path';
import type { Config } from '../types/index.js';

/**
 * 対象ファイルを収集するクラス
 */
export class FileCollector {
  constructor(private config: Config) {}

  /**
   * 対象ファイルを収集する（再帰的）
   */
  async collectTargetFiles(): Promise<string[]> {
    console.log('対象ファイルを収集しています...');

    const targetDir = this.config.target_dir;
    const extensions = this.config.extensions || ['.rs'];
    const excludePatterns = this.config.exclude || [];
    const targetFiles: string[] = [];

    await this.walkDirectory(targetDir, targetFiles, extensions, excludePatterns);

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

        if (this.shouldExclude(fullPath, excludePatterns)) {
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
   * exclude パターンにマッチするかチェック
   */
  private shouldExclude(filePath: string, excludePatterns: string[]): boolean {
    for (const pattern of excludePatterns) {
      if (pattern.includes('**/')) {
        const regex = pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
        if (new RegExp(regex).test(filePath)) {
          return true;
        }
      } else if (pattern.includes('*')) {
        const regex = pattern.replace(/\*/g, '.*');
        if (new RegExp(regex).test(path.basename(filePath))) {
          return true;
        }
      } else if (filePath.includes(pattern)) {
        return true;
      }
    }
    return false;
  }
}
