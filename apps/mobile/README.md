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
| `@shop/order-review` | `apps/storefront/lib/order-review.ts` — the checkout review's shape |

Only import shared modules that need no npm package of their own and no
server: `money`, `pricing`, `quantity`, `types`, `utils`. Not `api`,
`crypto`, `rate-limit` or `validation`.

## Run it on your phone

1. Install **Expo Go** from the Play Store or App Store.
2. Start the storefront at the repository root: `npm run dev:local`
   (port 3000, the local database, emails to the console). Not `npm run dev`,
   which uses whatever `DATABASE_URL` the root `.env` names.
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

## Development build (push notifications)

Expo Go cannot receive push notifications on Android, so testing them needs
a development build: this app, built by EAS, installed like any app. One-off
setup, in `apps/mobile`:

1. Create an Expo account at expo.dev, then
   `npx eas-cli@latest login` and `npx eas-cli@latest init`. `init` writes
   `extra.eas.projectId` and `owner` into `app.json`; commit them.
2. In the Firebase console, create a project and add an Android app with the
   package `in.tamizhelectronics.shop`. Download `google-services.json` into
   this folder (`app.json` points at it; it holds public identifiers and may
   be committed).
3. Firebase: Project settings → Service accounts → Generate new private key.
   That JSON is **secret** — keep it outside the repo (`.gitignore` covers
   `*-firebase-adminsdk-*.json`). Upload it with
   `npx eas-cli@latest credentials` → Android → production → Google Service
   Account → Manage your Google Service Account Key for Push Notifications
   (FCM V1) → Set up → Upload a new service account key.
4. `npx eas-cli@latest build --profile development --platform android`, and
   install the APK from the QR code it prints.

Then, each time:

1. Repository root, two terminals: `npm run dev:local` (storefront, :3000)
   and `npm run dev:local:admin` (admin panel, :3001), both on the local
   database. Start the storefront first and stop it last.
2. Here: `npx expo start`, and open the development build (not Expo Go).
3. Place an order, tap "Turn on order updates", allow notifications.
4. In the local admin panel (http://localhost:3001, staff accounts in the
   root README), change that order's status. The phone gets the notification;
   tapping it opens the order. The token is also printed in the Metro log, for
   Expo's push tool at expo.dev/notifications.

Rebuild the development build only when native code changes (a new Expo
module, an `app.json` plugin change); JavaScript changes arrive through Metro.

## Builds for testers and the stores

| Profile       | Command                                                       | Gives |
| ------------- | ------------------------------------------------------------- | ----- |
| `development` | `npx eas-cli@latest build --profile development -p android`  | APK with the dev client, for this machine's Metro |
| `preview`     | `npx eas-cli@latest build --profile preview -p android`      | Installable release APK, for testers |
| `production`  | `npx eas-cli@latest build --profile production -p android`   | `.aab` for the Play Store; build numbers count up on EAS |

`preview` and `production` builds talk to the live storefront, so they need
its address as an EAS environment variable, once per environment:

```bash
npx eas-cli@latest env:create --name EXPO_PUBLIC_API_URL --value https://<shop-domain> --environment preview --visibility plaintext
```

(and the same with `--environment production`). iPhone builds need an Apple
Developer account first.

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

## Links into the app

`sricauvery://…` links open the app today: `sricauvery://product/<slug>`,
`sricauvery://order/<number>` and so on. `src/app/+native-intent.tsx`
translates the website's address shapes (`/categories/<slug>`, `/shop?…`,
`/search?q=…`) into the app's, so a website URL works as well.

For the website's own `https://` links to open the app (Android App Links,
iOS Universal Links), the shop's production domain is needed:

1. **Android:** in `app.json`, add to `expo.android`
   `"intentFilters": [{ "action": "VIEW", "autoVerify": true, "data": [{ "scheme": "https", "host": "<domain>" }], "category": ["BROWSABLE", "DEFAULT"] }]`,
   and serve `/.well-known/assetlinks.json` from the storefront
   (`apps/storefront/public/.well-known/`) with the package
   `in.tamizhelectronics.shop` and the SHA-256 fingerprint from
   `npx eas-cli@latest credentials`.
2. **iOS:** add `"associatedDomains": ["applinks:<domain>"]` to `expo.ios`,
   and serve `/.well-known/apple-app-site-association` with the team id and
   bundle id `in.tamizhelectronics.shop`.

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
