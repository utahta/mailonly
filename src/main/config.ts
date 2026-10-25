import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

export type Account = {
  id: string;
  // Empty until the Gmail title reveals the address.
  label: string;
  color: string;
};

export type Bounds = { x: number; y: number; width: number; height: number };

export type Config = {
  accounts: Account[];
  selected?: string;
  bounds?: Bounds;
};

function configPath(): string {
  return path.join(app.getPath('userData'), 'config.json');
}

// Errors other than a missing file are thrown, so a broken config.json is
// kept for the user to inspect instead of being overwritten.
export function loadConfig(): Config {
  try {
    return JSON.parse(fs.readFileSync(configPath(), 'utf8')) as Config;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { accounts: [] };
    throw err;
  }
}

export function saveConfig(config: Config): void {
  const file = configPath();
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(config, null, 2)}\n`);
  fs.renameSync(tmp, file);
}
