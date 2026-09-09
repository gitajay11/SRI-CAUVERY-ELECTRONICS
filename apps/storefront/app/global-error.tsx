'use client';

import { useEffect } from 'react';

/**
 * Last-resort boundary for errors thrown by the root layout itself.
 *
 * It replaces the whole document, so it cannot use any of the app's providers
 * or Tailwind classes — everything here is inline and self-contained.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global error]', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '2rem',
          background: '#faf9f6',
          color: '#14110c',
          fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
          textAlign: 'center',
        }}
      >
        <main style={{ maxWidth: '28rem' }}>
          {/*
            A plain <img> to a static file: this boundary replaces the whole
            document when the root layout fails, so it cannot use next/image or
            any provider. Static assets are still served when the app is not.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-192.png"
            alt=""
            width={56}
            height={56}
            style={{
              display: 'block',
              margin: '0 auto 1.25rem',
              borderRadius: '0.9rem',
            }}
          />
          <h1 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem' }}>
            Something went wrong
          </h1>
          <p style={{ margin: '0 0 1.5rem', color: '#4d4841', lineHeight: 1.6 }}>
            We hit an unexpected problem. Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: '2.75rem',
              padding: '0 1.5rem',
              borderRadius: '999px',
              border: 'none',
              background: '#8a6a19',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
