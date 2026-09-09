import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const appRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

/** Maps `@/x` to `<app>/x`, and stubs `server-only`, which Node cannot load. */
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'server-only') {
    return { url: pathToFileURL(path.join(appRoot, 'checks/server-only-stub.mjs')).href, shortCircuit: true };
  }
  if (specifier.startsWith('@/')) {
    // Extensionless, the way TypeScript writes them — try .ts then .tsx.
    const base = path.join(appRoot, specifier.slice(2));
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
      try {
        return await nextResolve(pathToFileURL(candidate).href, context);
      } catch {
        continue;
      }
    }
  }
  return nextResolve(specifier, context);
}
