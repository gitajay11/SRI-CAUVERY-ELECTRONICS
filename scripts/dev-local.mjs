#!/usr/bin/env node
/**
 * The shop against the local database, with nothing leaving the machine.
 *
 *   npm run dev:local         the storefront on :3000
 *   npm run dev:local:admin   the admin panel on :3001
 *
 * `npm run dev` and `npm run dev:admin` use whatever DATABASE_URL the root
 * .env names — which may be the live Neon database, with real SMTP settings
 * beside it. That is no place to test the mobile app: every test order would
 * be a real order, every confirmation a real email.
 *
 * This starts the local PGlite database (packages/db/.pglite, the one
 * `npm run dev:db` serves and `npm run db:reset` wipes), applies any pending
 * migrations to it, and starts the app pointed at it, with emails written to
 * the console. Run both commands, in two terminals, and the two apps talk only
 * to each other: the shop's order alerts reach the local admin panel, and the
 * panel's catalogue edits refresh the local shop. The first to start owns the
 * database; stop that one last. Variables set here win over every .env file,
 * because the apps never overwrite one that is already set.
 *
 * Changing an order's status in the local admin panel sends a real push
 * notification to any phone registered in the local database — which is how
 * the mobile app's development build is tested.
 *
 * Phones on the same Wi-Fi reach the storefront at the "Network" address Next
 * prints.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');
const app = process.argv[2] === 'admin' ? 'admin' : 'storefront';

const { startDevDatabase } = await import(
  pathToFileURL(path.join(ROOT, 'packages/db/src/dev-server.ts')).href
);

const database = await startDevDatabase();
console.log(`Local PostgreSQL (PGlite) on port ${database.port}`);

const safe = {
  DATABASE_URL: database.url,
  DATABASE_URL_UNPOOLED: database.url,
  // Emails are printed in the terminal instead of sent.
  EMAIL_PROVIDER: 'console',
  SMTP_HOST: '',
  SMTP_USER: '',
  SMTP_PASS: '',
  RESEND_API_KEY: '',
  // The two local apps find each other here, never what the .env names.
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  ADMIN_SITE_URL: 'http://localhost:3001',
  // A secret for these two local processes only; not a real one.
  INTERNAL_NOTIFY_SECRET: 'local-development-only-not-a-secret',
};

// Bring the local database up to the current schema first. Both URLs are set
// above, so Prisma's CLI — which prefers DATABASE_URL_UNPOOLED — cannot reach
// past them to whatever the .env names. Asynchronously: the database runs in
// this very process, and a blocking spawn would leave it unable to answer.
const migrated = await new Promise((resolve) => {
  spawn('npx prisma migrate deploy', {
    cwd: path.join(ROOT, 'packages/db'),
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...safe },
  }).on('exit', (code) => resolve(code ?? 1));
});
if (migrated !== 0) {
  await database.stop();
  process.exit(migrated);
}

// One command string through the shell: npm is a .cmd file on Windows, which
// Node will only start through a shell, and it warns about argument arrays there.
const child = spawn(`npm run dev --workspace @tamizh/${app}`, {
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
