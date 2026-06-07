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
  const { configDir } = await loadConfig(parseConfigPath());
  const dataDir = path.join(configDir, 'public', 'data');

  await fs.rm(path.join(dataDir, 'structure'), { recursive: true, force: true });
  await fs.rm(path.join(dataDir, 'complexity'), { recursive: true, force: true });
  await fs.rm(path.join(dataDir, 'duplication'), { recursive: true, force: true });

  console.log('解析データを削除しました');
}

main().catch((error) => {
  console.error('致命的なエラー:', error);
  process.exit(1);
});
