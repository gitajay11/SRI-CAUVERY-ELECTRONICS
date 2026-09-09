import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.ts';

/**
 * The shared Prisma client.
 *
 * Both applications import this, so there is exactly one schema and one
 * connection-pool configuration for the whole business. Prisma 7 has no Rust
 * engine, so the connection goes through the node-postgres driver adapter.
 *
 * The instance is cached on `globalThis` because Next's dev server re-evaluates
 * modules on every edit, and a new pool per edit exhausts connections quickly.
 */

declare global {
  var __tamizhPrisma: PrismaClient | undefined;
}

export type { PrismaClient };

export class MissingDatabaseUrlError extends Error {
  constructor() {
    super(
      'DATABASE_URL is not set. Copy .env.example to .env.local, or run `npm run dev:db` to start the local PGlite database.',
    );
    this.name = 'MissingDatabaseUrlError';
  }
}

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new MissingDatabaseUrlError();

  const adapter = new PrismaPg({
    connectionString,
    // A shop of this size never needs a large pool, and a small one surfaces
    // leaked connections during development instead of hiding them.
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
  });
}

export function getPrisma(): PrismaClient {
  if (!globalThis.__tamizhPrisma) {
    globalThis.__tamizhPrisma = createClient();
  }
  return globalThis.__tamizhPrisma;
}

/** Convenience alias so call sites read as `db.product.findMany(...)`. */
export const db = new Proxy({} as PrismaClient, {
  get(_target, property) {
    return Reflect.get(getPrisma(), property);
  },
});
