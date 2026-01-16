'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { logger } from '@/lib/logger/logger';

/**
 * Global Error Boundary for Next.js App Router
 * Catches errors that occur during rendering, in lifecycle methods, and in constructors
 *
 * Best Practices:
 * - Logs error details for debugging
 * - Provides user-friendly error message
 * - Offers recovery options (reset, go home)
 * - Prevents app-wide crashes
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service
    logger.error({
      msg: 'Unhandled application error',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        digest: error.digest,
      },
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-red-600">Something went wrong</CardTitle>
          <CardDescription>
            An unexpected error occurred while rendering this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDevelopment && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">
                Error Details (Development Only)
              </p>
              <p className="mt-2 text-xs text-red-700 font-mono break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="mt-1 text-xs text-red-600">
                  Digest: {error.digest}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button onClick={reset} className="w-full" variant="default">
              Try Again
            </Button>
            <Button
              onClick={() => (window.location.href = '/')}
              className="w-full"
              variant="outline"
            >
              Go to Home
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            If this problem persists, please contact support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
