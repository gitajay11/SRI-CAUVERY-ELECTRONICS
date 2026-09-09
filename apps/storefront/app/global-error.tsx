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
          color: '#12211f',
          fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
          textAlign: 'center',
        }}
      >
        <main style={{ maxWidth: '28rem' }}>
          <div
            style={{
              width: '3.5rem',
              height: '3.5rem',
              margin: '0 auto 1.25rem',
              borderRadius: '0.9rem',
              background: '#14110c',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <svg viewBox="0 0 100 100" width="24" height="24" fill="#d0a94e">
              <path d="M62 12 28 55h17l-7 33 34-43H55Z" />
            </svg>
          </div>
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
              background: '#096b64',
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
