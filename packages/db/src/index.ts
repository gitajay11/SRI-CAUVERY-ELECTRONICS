/**
 * Public surface of the shared database package.
 *
 * Server code imports `db` (or `getPrisma()`); client components import only
 * from `@tamizh/db/enums`, which carries no runtime dependency on Prisma.
 */
export { db, getPrisma, MissingDatabaseUrlError } from './client.ts';
export type { PrismaClient } from './client.ts';
export * from './enums.ts';
