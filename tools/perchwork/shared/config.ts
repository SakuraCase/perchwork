import fs from 'fs/promises';
import path from 'path';

export interface PerchworkConfig {
  target_dir: string;
  extensions?: string[];
  exclude?: string[];
  language?: string;
  run?: {
    structure?: boolean;
    complexity?: boolean;
    duplication?: boolean;
  };
  last_commit?: string | null;
  last_run?: string | null;
}

export interface LoadedConfig {
  config: PerchworkConfig;
  configPath: string;
  configDir: string;
  targetDir: string;
}

export async function loadConfig(configPath: string): Promise<LoadedConfig> {
  const resolvedConfigPath = path.resolve(configPath);
  const configDir = path.dirname(resolvedConfigPath);
  const content = await fs.readFile(resolvedConfigPath, 'utf-8');
  const config = JSON.parse(content) as PerchworkConfig;

  return {
    config,
    configPath: resolvedConfigPath,
    configDir,
    targetDir: path.resolve(configDir, config.target_dir),
  };
}

export function shouldRun(
  config: PerchworkConfig,
  analyzer: keyof NonNullable<PerchworkConfig['run']>
): boolean {
  return config.run?.[analyzer] !== false;
}

export async function writeConfig(
  configPath: string,
  config: PerchworkConfig
): Promise<void> {
  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
}
