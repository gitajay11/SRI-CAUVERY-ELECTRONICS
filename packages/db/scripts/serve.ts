/**
 * Runs the local development database until interrupted.
 *
 *   npm run dev:db
 *
 * Useful when you want the database to outlive an app restart, or to point
 * `psql`/Prisma Studio at it.
 */
import { startDevDatabase } from '../src/dev-server.ts';

const database = await startDevDatabase();

console.log(`Local PostgreSQL (PGlite) listening on port ${database.port}`);
console.log(`DATABASE_URL="${database.url}"`);
console.log('Press Ctrl+C to stop.');

const shutdown = async () => {
  console.log('\nStopping database…');
  await database.stop();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
