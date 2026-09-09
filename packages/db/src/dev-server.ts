import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Local development database.
 *
 * PGlite is a real PostgreSQL build compiled to WebAssembly; `pglite-server`
 * puts it behind the actual Postgres wire protocol. The result is a genuine
 * Postgres — transactions, `pg_trgm`, GIN indexes, `SERIALIZABLE` — reachable
 * over a normal `postgresql://` URL, with nothing to install.
 *
 * That matters more here than convenience: the admin panel's correctness rests
 * on transactional stock movements and audit rows, and testing those against a
 * hand-rolled in-memory fake would prove nothing. Development, tests and
 * production all now run the same SQL.
 *
 * Data persists in `packages/db/.pglite` so a restart keeps the catalogue.
 */

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const DEV_DB_PORT = Number(process.env.DEV_DB_PORT ?? 55432);
export const DEV_DB_URL = `postgresql://postgres:postgres@127.0.0.1:${DEV_DB_PORT}/postgres`;

export interface DevDatabase {
  url: string;
  port: number;
  stop: () => Promise<void>;
}

/** True when something is already listening — i.e. the DB is already up. */
export function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net
      .connect({ port, host: '127.0.0.1' })
      .once('connect', () => {
        socket.destroy();
        resolve(true);
      })
      .once('error', () => resolve(false));
    socket.setTimeout(700, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

/**
 * Starts the local database, unless one is already listening on the port.
 *
 * @param dataDir  Directory for persistence; pass `":memory:"` for tests, which
 *                 want a clean database per run.
 */
export async function startDevDatabase(
  dataDir: string = path.join(packageRoot, '.pglite'),
): Promise<DevDatabase> {
  if (await isPortInUse(DEV_DB_PORT)) {
    return {
      url: DEV_DB_URL,
      port: DEV_DB_PORT,
      stop: async () => {
        /* not ours to stop */
      },
    };
  }

  // Imported lazily so production never loads the WASM build.
  const [{ PGlite }, { pg_trgm }, { createServer }] = await Promise.all([
    import('@electric-sql/pglite'),
    import('@electric-sql/pglite/contrib/pg_trgm'),
    import('pglite-server'),
  ]);

  if (dataDir !== ':memory:') fs.mkdirSync(dataDir, { recursive: true });

  const pglite = await PGlite.create({
    dataDir: dataDir === ':memory:' ? undefined : dataDir,
    extensions: { pg_trgm },
  });

  // logLevel 0 keeps the wire-protocol chatter out of the dev server output.
  const server = createServer(pglite, { logLevel: 0 });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(DEV_DB_PORT, '127.0.0.1', () => resolve());
  });

  return {
    url: DEV_DB_URL,
    port: DEV_DB_PORT,
    stop: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await pglite.close();
    },
  };
}

/**
 * Resolves the URL the apps should use.
 *
 * An explicit DATABASE_URL always wins, so production and any real Postgres
 * are untouched. Only a developer with nothing configured gets PGlite.
 */
export function resolveDatabaseUrl(): string {
  const configured = process.env.DATABASE_URL?.trim();
  return configured && configured.length > 0 ? configured : DEV_DB_URL;
}
