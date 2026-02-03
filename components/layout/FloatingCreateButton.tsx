'use client';

/**
 * Floating Create Button
 * Fixed position button at bottom right of screen (desktop only)
 * Matches the official Threads app layout
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCurrentUser } from '@/hooks';

export function FloatingCreateButton() {
  const { user } = useCurrentUser();
  const pathname = usePathname();

  // Don't show on auth pages or create page
  const isAuthPage =
    pathname.startsWith('/login') || pathname.startsWith('/register');
  const isCreatePage = pathname === '/create';

  if (!user || isAuthPage || isCreatePage) return null;

  return (
    <Link
      href="/create"
      className="hidden lg:flex fixed bottom-6 right-6 w-14 h-14 items-center justify-center bg-background border border-border/50 rounded-2xl shadow-lg hover:bg-secondary/50 transition-all duration-200 z-50"
      aria-label="Create new thread"
    >
      <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 4.5v15m7.5-7.5h-15"
        />
      </svg>
    </Link>
  );
}
