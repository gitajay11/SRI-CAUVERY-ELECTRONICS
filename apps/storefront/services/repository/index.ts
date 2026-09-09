import 'server-only';
import { PrismaRepository } from './prisma-repository';
import type { Repository } from './types';

export type { Repository, CartOwner, ResolvedCart } from './types';

/**
 * The storefront's data access.
 *
 * There is one implementation, backed by the shared PostgreSQL database. An
 * in-memory stand-in used to live here for zero-config development; it was
 * removed once `@tamizh/db` gained a real local Postgres (PGlite over the wire
 * protocol), because a second implementation of the same interface is a second
 * thing to keep honest — and the admin's transactional guarantees cannot be
 * verified against a fake.
 */

/**
 * Module-scoped, deliberately not on `globalThis`.
 *
 * The repository holds no state of its own — it reads the Prisma client on
 * every call, and that client is the thing that must survive a hot reload.
 * Caching this instance globally instead meant an edited method never took
 * effect in development: the old object outlived the module that defined it.
 */
let repository: Repository | undefined;

export function getRepository(): Repository {
  repository ??= new PrismaRepository();
  return repository;
}
