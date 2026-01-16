'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger/logger';

/**
 * Global Error Boundary for Root Layout
 * Catches errors in the root layout or global components
 *
 * Note: This must be a minimal implementation without external dependencies
 * as it replaces the entire root layout when an error occurs
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log critical error
    logger.error({
      msg: 'Critical global error',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        digest: error.digest,
      },
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            display: 'flex',
            minHeight: '100vh',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: '500px',
              padding: '2rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              backgroundColor: 'white',
            }}
          >
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#dc2626',
                marginBottom: '1rem',
              }}
            >
              Critical Error
            </h1>
            <p
              style={{
                color: '#6b7280',
                marginBottom: '1.5rem',
              }}
            >
              A critical error occurred that prevented the application from
              loading.
            </p>

            {process.env.NODE_ENV === 'development' && (
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: '#fef2f2',
                  borderRadius: '0.375rem',
                  marginBottom: '1.5rem',
                }}
              >
                <p
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#991b1b',
                    marginBottom: '0.5rem',
                  }}
                >
                  Error Details (Development Only)
                </p>
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: '#7f1d1d',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                  }}
                >
                  {error.message}
                </p>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                flexDirection: 'column',
              }}
            >
              <button
                onClick={reset}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                }}
              >
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                }}
              >
                Reload Application
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
