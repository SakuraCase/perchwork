#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { PerchworkAnalyzer } from '../analyzers/structure/analyze.js';
import { ComplexityAnalyzer } from '../analyzers/complexity/analyze.js';
import { DuplicationAnalyzer } from '../analyzers/duplication/analyze.js';
import { loadConfig, shouldRun, writeConfig } from '../shared/config.js';

const execFileAsync = promisify(execFile);

interface Args {
  configPath: string;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  let configPath = 'config.json';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config' && args[i + 1]) {
      configPath = args[i + 1];
      i++;
    }
  }

  return { configPath };
}

async function cleanupStructureOutput(configDir: string): Promise<void> {
  const structureDir = path.join(configDir, 'public', 'data', 'structure');
  await fs.rm(structureDir, { recursive: true, force: true });
}

async function readTargetHead(targetDir: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', ['-C', targetDir, 'rev-parse', 'HEAD']);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const { configPath } = parseArgs();
  const loaded = await loadConfig(configPath);

  console.log('=== Perchwork Analyze 開始 ===');

  if (shouldRun(loaded.config, 'structure')) {
    await cleanupStructureOutput(loaded.configDir);
    await new PerchworkAnalyzer().analyze(loaded.configPath, { all: true });
  }

  if (shouldRun(loaded.config, 'complexity')) {
    await new ComplexityAnalyzer().analyze(loaded.configPath, { all: true });
  }

  if (shouldRun(loaded.config, 'duplication')) {
    await new DuplicationAnalyzer().analyze(loaded.configPath, {});
  }

  loaded.config.last_commit = await readTargetHead(loaded.targetDir);
  loaded.config.last_run = new Date().toISOString();
  await writeConfig(loaded.configPath, loaded.config);

  console.log('=== Perchwork Analyze 完了 ===');
}

main().catch((error) => {
  console.error('致命的なエラー:', error);
  process.exit(1);
});
