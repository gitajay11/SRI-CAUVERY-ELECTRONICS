/**
 * Drops the local development database and starts over.
 *
 *   npm run db:reset
 *
 * Only ever touches the local PGlite data directory; it refuses to run when
 * DATABASE_URL points somewhere else, so it can never wipe a real database.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEV_DB_URL } from '../src/dev-server.ts';

const configured = process.env.DATABASE_URL?.trim();
if (configured && configured !== DEV_DB_URL) {
  console.error(
    `Refusing to reset: DATABASE_URL points at ${configured}, not the local development database.`,
  );
  process.exit(1);
}

const dataDir = path.join(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  '.pglite',
);

if (fs.existsSync(dataDir)) {
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log(`Removed ${dataDir}`);
} else {
  console.log('Nothing to remove — the local database has not been created yet.');
}
console.log('Run `npm run db:deploy && npm run db:seed` to rebuild it.');
