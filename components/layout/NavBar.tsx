'use client';

/**
 * Navigation Bar Component
 * Minimal top navigation - just logo centered
 * Desktop shows horizontal nav icons with notification badge
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCurrentUser } from '@/hooks';
import { useState, useEffect, useCallback, startTransition } from 'react';
import { getSessionToken } from '@/lib/appwriteClient';
import { logger } from '@/lib/logger/logger';

export function NavBar() {
  const { user } = useCurrentUser();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread notification count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const sessionId = getSessionToken();
      if (!sessionId) return;

      const response = await fetch('/api/notifications/count', {
        headers: {
          'x-session-id': sessionId,
          'x-csrf-token': 'true',
        },
      });

      if (response.ok) {
        const data = await response.json();
        startTransition(() => {
          setUnreadCount(data.count || 0);
        });
      }
    } catch (error) {
      logger.warn({ msg: 'Failed to fetch notification count', error });
    }
  }, []);

  // Fetch count on mount and periodically
  useEffect(() => {
    if (!user) return;

    fetchUnreadCount();

    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, [user, fetchUnreadCount]);

  // Reset count when visiting activity page
  useEffect(() => {
    if (pathname === '/activity') {
      startTransition(() => {
        setUnreadCount(0);
      });
    }
  }, [pathname]);

  // Don't show on auth pages
  const isAuthPage =
    pathname.startsWith('/login') || pathname.startsWith('/register');

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 glass hidden md:block">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex h-12 items-center justify-between">
          {/* Logo - centered on mobile */}
          <div className="flex-1 md:flex-none" />

          {/* Desktop Navigation - horizontal icons */}
          <div className="flex-1 flex justify-end">
            <div className="hidden md:flex items-center gap-1">
              {user && !isAuthPage ? (
                <>
                  <NavLink
                    href="/feed"
                    active={pathname === '/feed' || pathname === '/'}
                  >
                    <HomeIcon />
                  </NavLink>
                  <NavLink
                    href="/messages"
                    active={pathname.startsWith('/messages')}
                  >
                    <MessagesIcon />
                  </NavLink>
                  <NavLink href="/create" active={pathname === '/create'}>
                    <CreateIcon />
                  </NavLink>
                  <NavLink
                    href="/activity"
                    active={pathname.startsWith('/activity')}
                    badge={unreadCount}
                  >
                    <ActivityIcon />
                  </NavLink>
                  <NavLink
                    href={`/profile/${user.$id}`}
                    active={pathname.startsWith('/profile')}
                  >
                    <ProfileIcon />
                  </NavLink>
                </>
              ) : !user && !isAuthPage ? (
                <>
                  <Link
                    href="/login"
                    className="text-sm text-muted-foreground hover:text-foreground px-3 py-2"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="text-sm px-4 py-2 btn-gradient text-white rounded-lg"
                  >
                    Sign up
                  </Link>
                </>
              ) : null}
            </div>

            {/* Empty div for mobile to balance the flex */}
            <div className="md:hidden w-8" />
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  active,
  children,
  badge,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`relative p-3 rounded-lg transition-colors ${
        active
          ? 'text-foreground bg-secondary'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
      }`}
    >
      {children}
      {badge && badge > 0 && (
        <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}

// Icon components
function HomeIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
      />
    </svg>
  );
}

function MessagesIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
      />
    </svg>
  );
}

function CreateIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.5v15m7.5-7.5h-15"
      />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}
