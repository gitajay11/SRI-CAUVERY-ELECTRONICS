#!/usr/bin/env node
/**
 * The storefront against the local database, with nothing leaving the machine.
 *
 *   npm run dev:local
 *
 * `npm run dev` uses whatever DATABASE_URL the root .env names — which may be
 * the live Neon database, with real SMTP settings beside it. That is no place
 * to test checkout from the mobile app: every test order would be a real
 * order, and every confirmation a real email.
 *
 * This starts the local PGlite database (packages/db/.pglite, the one
 * `npm run dev:db` serves and `npm run db:reset` wipes), applies any pending
 * migrations to it, and starts the storefront on port 3000 pointed at it,
 * with emails written to the console and the admin
 * panel's order alerts switched off. Variables set here win over every .env
 * file, because the apps never overwrite one that is already set.
 *
 * Phones on the same Wi-Fi reach it at the "Network" address Next prints.
 */
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');
const { startDevDatabase } = await import(
  pathToFileURL(path.join(ROOT, 'packages/db/src/dev-server.ts')).href
);

const database = await startDevDatabase();
console.log(`Local PostgreSQL (PGlite) on port ${database.port}`);

const safe = {
  DATABASE_URL: database.url,
  DATABASE_URL_UNPOOLED: database.url,
  // Order emails are printed in this terminal instead of sent.
  EMAIL_PROVIDER: 'console',
  SMTP_HOST: '',
  SMTP_USER: '',
  SMTP_PASS: '',
  RESEND_API_KEY: '',
  // No staff alerts to whatever admin panel the .env points at.
  ADMIN_SITE_URL: '',
  INTERNAL_NOTIFY_SECRET: '',
};

// Bring the local database up to the current schema first. Both URLs are set
// above, so Prisma's CLI — which prefers DATABASE_URL_UNPOOLED — cannot reach
// past them to whatever the .env names.
const migrate = spawnSync('npx prisma migrate deploy', {
  cwd: path.join(ROOT, 'packages/db'),
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, ...safe },
});
if (migrate.status !== 0) {
  await database.stop();
  process.exit(migrate.status ?? 1);
}

// One command string through the shell: npm is a .cmd file on Windows, which
// Node will only start through a shell, and it warns about argument arrays there.
const child = spawn('npm run dev --workspace @tamizh/storefront', {
  cwd: ROOT,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, ...safe },
});

const stop = async (code) => {
  await database.stop();
  process.exit(code ?? 0);
};

child.on('exit', (code) => void stop(code));
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
