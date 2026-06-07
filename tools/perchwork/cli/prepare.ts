#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { loadConfig } from '../shared/config.js';

function parseConfigPath(): string {
  const args = process.argv.slice(2);
  const index = args.indexOf('--config');
  return index >= 0 && args[index + 1] ? args[index + 1] : 'config.json';
}

async function main(): Promise<void> {
  const { config, configDir, targetDir } = await loadConfig(parseConfigPath());
  const checklistPath = path.join(configDir, 'work', 'analysis-checklist.md');
  const extensions = config.extensions?.join(', ') ?? '.rs';
  const excludes = config.exclude?.length ? config.exclude.join(', ') : '(なし)';

  await fs.mkdir(path.dirname(checklistPath), { recursive: true });
  await fs.writeFile(
    checklistPath,
    [
      '# Analysis Checklist',
      '',
      `- target_dir: ${targetDir}`,
      `- extensions: ${extensions}`,
      `- exclude: ${excludes}`,
      '',
      'Run:',
      '',
      '```bash',
      'npm run analyze',
      '```',
      '',
    ].join('\n')
  );

  console.log(`解析チェックリストを作成しました: ${checklistPath}`);
}

main().catch((error) => {
  console.error('致命的なエラー:', error);
  process.exit(1);
});
