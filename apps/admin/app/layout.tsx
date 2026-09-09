import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_Tamil } from 'next/font/google';
import './globals.css';

import { getI18n } from '@/i18n/server';
import { LOCALE_TAGS } from '@/i18n/config';
import { getDictionary } from '@/i18n';
import { adminSiteUrl } from '@/lib/env';

/**
 * Inter for the interface, Noto Sans Tamil for Tamil.
 *
 * Both are exposed as CSS variables and stacked into one family in
 * globals.css, so a mixed string like "ஆர்டர் TE-260908-4F2A" resolves each
 * script to the right face without switching fonts per span.
 */
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
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
  metadataBase: new URL(adminSiteUrl()),
  title: {
    default: 'Sri Cauvery Admin',
    template: '%s · Sri Cauvery Admin',
  },
  description: 'Internal business management for Sri Cauvery Electronics.',
  applicationName: 'Sri Cauvery Admin',
  manifest: '/manifest.json',
  // An internal tool has no business in a search index.
  robots: { index: false, follow: false, nocache: true },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Sri Cauvery Admin',
  },
  formatDetection: { telephone: false, address: false, email: false },
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#14110c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

/**
 * The root layout stays deliberately thin: it sets up fonts and the document,
 * and nothing more. Authentication and the application chrome live in the
 * `(panel)` route group, so the sign-in page can render without either.
 */
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { locale } = await getI18n();
  void getDictionary(locale);

  return (
    <html
      lang={LOCALE_TAGS[locale]}
      className={`${inter.variable} ${notoTamil.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
