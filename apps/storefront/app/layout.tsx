import type { Metadata, Viewport } from 'next';
import { Manrope, Noto_Sans_Tamil } from 'next/font/google';
import './globals.css';

import { getI18n } from '@/i18n/server';
import { getDictionary } from '@/i18n';
import { LOCALE_TAGS } from '@/i18n/config';
import { getSessionUser } from '@/lib/auth';
import { getRepository } from '@/services/repository';
import { cookies } from 'next/headers';
import { THEME_COOKIE, normalizeTheme, themeAttribute } from '@tamizh/core/theme';
import { getCartSummary } from '@/services/cart';
import { buildMetadata, organizationJsonLd, websiteJsonLd, SITE_TITLE } from '@/lib/seo';
import { siteUrl } from '@/lib/env';

import { JsonLd } from '@/components/JsonLd';
import { LocaleProvider } from '@/components/providers/LocaleProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { CartProvider } from '@/components/providers/CartProvider';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { ServiceWorkerRegistrar } from '@/components/pwa/ServiceWorkerRegistrar';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { OfflineBanner } from '@/components/pwa/OfflineBanner';

/**
 * Manrope for Latin UI text; Noto Sans Tamil for Tamil.
 *
 * Both are exposed as CSS variables and stacked in one font-family in
 * globals.css, so mixed Tamil/English strings render with the right face for
 * each script without any per-string switching.
 */
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
  fallback: ['Segoe UI', 'system-ui', 'sans-serif'],
});

const notoTamil = Noto_Sans_Tamil({
  subsets: ['tamil'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-tamil',
  display: 'swap',
  fallback: ['Nirmala UI', 'Latha', 'sans-serif'],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  ...buildMetadata({ title: SITE_TITLE, path: '/' }),
  applicationName: 'Sri Cauvery Electronics',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Sri Cauvery Electronics',
  },
  formatDetection: { telephone: true, address: false, email: false },
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#8a6a19' },
    { media: '(prefers-color-scheme: dark)', color: '#6d5414' },
  ],
  width: 'device-width',
  initialScale: 1,
  // Zooming stays available: pinch-to-zoom is an accessibility requirement,
  // not a layout bug to be suppressed.
  maximumScale: 5,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { locale, t } = await getI18n();
  // Read the preference here and stamp it on <html> during the server render:
  // there is no moment where the page has painted in the wrong theme, because
  // the correct one arrives with the markup.
  const theme = normalizeTheme((await cookies()).get(THEME_COOKIE)?.value);
  const repo = getRepository();
  const user = await getSessionUser();

  const [categories, cart, wishlistIds] = await Promise.all([
    repo.listCategoryTree(),
    getCartSummary(),
    user ? repo.listWishlistIds(user.id) : Promise.resolve<string[]>([]),
  ]);

  return (
    <html
      lang={LOCALE_TAGS[locale]}
      data-theme={themeAttribute(theme)}
      className={`${manrope.variable} ${notoTamil.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-dvh flex-col">
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={websiteJsonLd()} />

        <LocaleProvider locale={locale} dictionary={getDictionary(locale)}>
          <ToastProvider>
            <CartProvider
              initialCount={cart.count}
              initialLines={cart.lines}
              initialWishlistIds={wishlistIds}
              isSignedIn={Boolean(user)}
            >
              <a href="#main" className="sr-focusable">
                {t('common.skipToContent')}
              </a>

              <OfflineBanner />
              <Header
                categories={categories}
                user={user}
                wishlistCount={wishlistIds.length}
                theme={theme}
              />

              <main id="main" className="flex-1 pb-20 lg:pb-0">
                {children}
              </main>

              <Footer categories={categories} />
              <BottomNav />

              <ServiceWorkerRegistrar />
              <InstallPrompt />
            </CartProvider>
          </ToastProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
