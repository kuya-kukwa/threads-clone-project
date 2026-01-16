/**
 * Auth Guard Component
 * Protects routes that require authentication
 * Uses client-side session check since Appwrite uses client-side session management
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks';

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

  useEffect(() => {
    if (!isLoading && !user) {
      // Get current path for redirect after login
      const currentPath = window.location.pathname;
      router.push(`${fallbackUrl}?redirect=${encodeURIComponent(currentPath)}`);
    }
  }, [user, isLoading, router, fallbackUrl]);

  // Show loading state
  if (isLoading) {
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
