import fs from 'node:fs';
import path from 'node:path';

/**
 * Loads `.env` files from the workspace root.
 *
 * Next only reads env files sitting beside the app it is building, but in this
 * repo the database URL is shared by two apps and belongs in one place. Each
 * app's `next.config.ts` calls this first, so the root file is loaded before
 * anything reads `process.env`.
 *
 * Precedence, highest first:
 *   1. variables already set (the real environment, CI, the hosting platform)
 *   2. apps/<app>/.env.local        — per-app developer overrides
 *   3. <workspace root>/.env.local  — shared developer overrides
 *   4. <workspace root>/.env        — shared defaults, committed
 *
 * Never overwrites a variable that is already set, so production configuration
 * always wins over a stray file.
 */
export function loadWorkspaceEnv(startDir: string = process.cwd()): void {
  const candidates: string[] = [];

  let dir = path.resolve(startDir);
  for (let depth = 0; depth < 5; depth += 1) {
    candidates.push(path.join(dir, '.env.local'), path.join(dir, '.env'));
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    for (const [key, value] of Object.entries(parseEnvFile(file))) {
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

/**
 * A deliberately small `.env` parser.
 *
 * `process.loadEnvFile` would overwrite variables that are already set, which
 * is exactly backwards for the precedence above — so we read the file and
 * apply only what is missing.
 */
function parseEnvFile(file: string): Record<string, string> {
  const result: Record<string, string> = {};
  const contents = fs.readFileSync(file, 'utf8');

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;

    const equals = line.indexOf('=');
    if (equals <= 0) continue;

    const key = line.slice(0, equals).trim();
    let value = line.slice(equals + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }

  return result;
}
