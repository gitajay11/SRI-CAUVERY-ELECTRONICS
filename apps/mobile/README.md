# Sri Cauvery Electronics — mobile app

The shop's native app for Android and iOS, built with Expo (SDK 57) and
Expo Router. It talks to the storefront's API (`apps/storefront/app/api`),
the same one the website uses.

SDK 57 because that is what Expo Go in the app stores runs. Move to a newer
SDK once Expo Go supports it: `npx expo install expo@^<version> --fix`.

## Not a workspace

This folder has its own `package.json`, `package-lock.json` and
`node_modules`, and is deliberately left out of the root npm workspaces:

- every website deploy would otherwise install React Native, and
- one install cannot hold two React versions, so the website would have to
  move to whatever React the app's Expo SDK pins, in step with it.

It still shares code with the website, read straight from source through
`tsconfig.json` paths (Metro watches those folders, see `metro.config.js`):

| Import            | From                              |
| ----------------- | --------------------------------- |
| `@tamizh/core/*`  | `packages/core/src` — money, pricing, types, utils |
| `@tamizh/db/enums`| `packages/db/src/enums.ts`        |
| `@shop/i18n`      | `apps/storefront/i18n` — the Tamil and English copy |

Only import shared modules that need no npm package of their own and no
server: `money`, `pricing`, `quantity`, `types`, `utils`. Not `api`,
`crypto`, `rate-limit` or `validation`.

## Run it on your phone

1. Install **Expo Go** from the Play Store or App Store.
2. Start the storefront at the repository root: `npm run dev` (port 3000).
   That uses whatever `DATABASE_URL` the root `.env` names.
3. In this folder:

   ```bash
   npm install
   npx expo start
   ```

4. Scan the QR code with Expo Go (Android) or the Camera app (iPhone). The
   phone and the computer must be on the same Wi-Fi.

In development the app calls the storefront on the computer running
`expo start`, so nothing needs configuring. If products do not load, allow
Node.js through the Windows firewall for private networks, or set
`EXPO_PUBLIC_API_URL` in `.env` (see `.env.example`).

## How it stands in for cookies

The website keeps the session, the guest cart and the coupon in cookies. The
app keeps them in the device keychain (`src/lib/session.ts`) and sends them as
headers on every request (`src/lib/api.ts`):

| Header                     | When                         |
| -------------------------- | ---------------------------- |
| `Authorization: Bearer …`  | signed in                    |
| `X-Guest-Id: <32 hex>`     | not signed in (guest cart)   |
| `X-Coupon-Code: …`         | always; empty for no coupon  |
| `X-Auth-Transport: bearer` | always; sign-in returns the token in the body |

## Checks

```bash
npm run typecheck
npm run lint
```

## Layout

```
src/app/            screens (Expo Router: every file is a route)
  _layout.tsx       providers, session load, root stack
  (tabs)/           Home, Shop, Cart, Account
src/components/     shared UI
src/lib/            API client, session, i18n, config, query cache
src/theme/          the website's palette, light and dark
```
