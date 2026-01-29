/**
 * Auth Guard Component
 * Protects routes that require authentication
 * Uses client-side session check since Appwrite uses client-side session management
 *
 * Cross-device compatibility:
 * - Handles race condition where session may not be immediately available
 * - Uses retry logic before redirecting to login
 * - Added production debugging
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks';
import { debugSessionState } from '@/lib/appwriteClient';
import { logger } from '@/lib/logger/logger';

interface AuthGuardProps {
  children: React.ReactNode;
  fallbackUrl?: string;
}

export function AuthGuard({
  children,
  fallbackUrl = '/login',
}: AuthGuardProps) {
  const { user, isLoading } = useCurrentUser();
  const router = useRouter();
  // Track if we've waited for potential session hydration
  const [hasWaitedForSession, setHasWaitedForSession] = useState(false);

  useEffect(() => {
    // Don't redirect while still loading
    if (isLoading) {
      return;
    }

    // If no user after loading completes, wait a bit more for session hydration
    // This helps with cross-device scenarios where session may take longer to establish
    if (!user && !hasWaitedForSession) {
      logger.debug({
        msg: 'AuthGuard: No user found, waiting for potential session hydration',
      });

      // Debug session state in production
      if (process.env.NODE_ENV === 'production') {
        debugSessionState();
      }

      const timer = setTimeout(() => {
        setHasWaitedForSession(true);
      }, 200); // Reduced from 800ms for faster UX
      return () => clearTimeout(timer);
    }

    // Only redirect after we've waited for session and still no user
    if (!user && hasWaitedForSession) {
      logger.debug({
        msg: 'AuthGuard: Redirecting to login after session check',
      });

      // Debug session state before redirect
      if (process.env.NODE_ENV === 'production') {
        debugSessionState();
        logger.debug({
          msg: 'AuthGuard: Redirecting to login - no valid session found',
        });
      }

      const currentPath = window.location.pathname;
      router.push(`${fallbackUrl}?redirect=${encodeURIComponent(currentPath)}`);
    }
  }, [user, isLoading, router, fallbackUrl, hasWaitedForSession]);

  // Show loading state while checking auth
  if (isLoading || (!user && !hasWaitedForSession)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  // Don't render content if not authenticated
  if (!user) {
    return null;
  }

  return <>{children}</>;
}
