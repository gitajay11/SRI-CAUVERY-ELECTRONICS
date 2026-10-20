// The app is not an npm workspace — it would pull React Native into every
// website deploy and force the website onto the app's React version — but it
// reads a few plain TypeScript folders from the rest of the repo. The aliases
// themselves come from tsconfig.json `paths`; Metro only needs to watch them.
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const repoRoot = path.resolve(__dirname, '../..');

const config = getDefaultConfig(__dirname);

config.watchFolders = [
  ...(config.watchFolders ?? []),
  path.join(repoRoot, 'packages/core/src'),
  path.join(repoRoot, 'packages/db/src'),
  path.join(repoRoot, 'apps/storefront/i18n'),
];

module.exports = config;
