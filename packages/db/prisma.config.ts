import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 keeps the connection URL out of schema.prisma and stops auto-loading
 * `.env`, so we load it here with Node's built-in loader (no dotenv).
 *
 * The URL below is used only by the Prisma CLI (migrate / studio). The runtime
 * client connects through the pg driver adapter in src/client.ts.
 */
const roots = [process.cwd(), path.join(process.cwd(), '..', '..')];
for (const root of roots) {
  for (const file of ['.env.local', '.env']) {
    const full = path.join(root, file);
    if (fs.existsSync(full)) process.loadEnvFile(full);
  }
}

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'node --experimental-strip-types prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
