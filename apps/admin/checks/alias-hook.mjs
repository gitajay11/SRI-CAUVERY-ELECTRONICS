/**
 * Resolves the app's `@/…` import alias when running a check under plain Node.
 *
 * Next understands the alias from tsconfig; Node does not. This maps it to the
 * app directory so a service module can be exercised directly, without a dev
 * server in front of it.
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register(new URL('./alias-resolver.mjs', import.meta.url), pathToFileURL('./'));
