'use client';

/**
 * Bottom Navigation Component
 * Mobile-first bottom tab bar with glass morphism effect
 * Hides on scroll down, shows on scroll up
 *
 * Features:
 * - Home, Messages, Create (+), Activity, Profile tabs
 * - Active state indicators
 * - Glass morphism backdrop
 * - Safe area support for notched devices
 * - Hide on scroll behavior
 * - Notification badge on Activity tab
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCurrentUser } from '@/hooks';
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  startTransition,
} from 'react';
import { logger } from '@/lib/logger/logger';
import { getSessionToken } from '@/lib/appwriteClient';

interface NavItem {
  id: string;
  label: string;
  href: string | ((userId: string) => string);
  icon: React.FC<{ className?: string; active?: boolean }>;
  isCreate?: boolean;
}

const navItems: NavItem[] = [
  {
    id: 'home',
    label: 'Home',
    href: '/feed',
    icon: HomeIcon,
  },
  {
    id: 'messages',
    label: 'Messages',
    href: '/messages',
    icon: MessagesIcon,
  },
  {
    id: 'create',
    label: '',
    href: '/create',
    icon: CreateIcon,
    isCreate: true,
  },
  {
    id: 'activity',
    label: 'Activity',
    href: '/activity',
    icon: ActivityIcon,
  },
  {
    id: 'profile',
    label: 'Profile',
    href: (userId: string) => `/profile/${userId}`,
    icon: ProfileIcon,
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user, isLoading } = useCurrentUser();
  const [isVisible, setIsVisible] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

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

  // Listen for modal-open class on body to hide nav
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsModalOpen(document.body.classList.contains('modal-open'));
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // Handle scroll to show/hide nav
  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;

          // Show when scrolling up, hide when scrolling down
          if (currentScrollY < lastScrollY.current - 5) {
            setIsVisible(true);
          } else if (
            currentScrollY > lastScrollY.current + 5 &&
            currentScrollY > 100
          ) {
            setIsVisible(false);
          }

          lastScrollY.current = currentScrollY;
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Don't show on auth pages or while loading
  if (
    isLoading ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register')
  ) {
    return null;
  }

  // Don't show if not authenticated
  if (!user) {
    return null;
  }

  const getHref = (item: NavItem): string => {
    if (typeof item.href === 'function') {
      return item.href(user.$id);
    }
    return item.href;
  };

  const isActive = (item: NavItem): boolean => {
    const href = getHref(item);
    if (item.id === 'home') {
      return pathname === '/feed' || pathname === '/';
    }
    if (item.id === 'profile') {
      return pathname.startsWith('/profile');
    }
    if (item.id === 'messages') {
      return pathname.startsWith('/messages');
    }
    if (item.id === 'activity') {
      return pathname.startsWith('/activity');
    }
    return pathname === href;
  };

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden transition-transform duration-300 ${
        isVisible && !isModalOpen ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      {/* Solid opaque background */}
      <div className="bg-black border-t border-border/30">
        <div
          className="flex items-center justify-around px-1"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
          {navItems.map((item) => {
            const active = isActive(item);
            const href = getHref(item);
            const Icon = item.icon;

            // Create button - Threads style (outlined square icon, same grey as others)
            if (item.isCreate) {
              return (
                <Link
                  key={item.id}
                  href={href}
                  className="flex items-center justify-center min-w-14 py-3 px-2 rounded-xl transition-all duration-200 text-[#B8B8B8] hover:text-white"
                  aria-label="Create new post"
                >
                  <Icon className="w-7 h-7" />
                </Link>
              );
            }

            return (
              <Link
                key={item.id}
                href={href}
                className={`flex items-center justify-center min-w-14 py-3 px-2 rounded-xl transition-all duration-200 ${
                  active ? 'text-white' : 'text-[#B8B8B8] hover:text-white'
                }`}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
              >
                <div className="relative">
                  <Icon className="w-7 h-7" active={active} />
                  {/* Notification badge for Activity tab */}
                  {item.id === 'activity' && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

// Icon Components with active state support

function HomeIcon({
  className = '',
  active = false,
}: {
  className?: string;
  active?: boolean;
}) {
  return active ? (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M9.005 16.545a2.997 2.997 0 0 1 2.997-2.997A2.997 2.997 0 0 1 15 16.545V22h7V11.543L12 2 2 11.543V22h7.005Z" />
    </svg>
  ) : (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path
        d="M9.005 16.545a2.997 2.997 0 0 1 2.997-2.997A2.997 2.997 0 0 1 15 16.545V22h7V11.543L12 2 2 11.543V22h7.005Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MessagesIcon({
  className = '',
  active = false,
}: {
  className?: string;
  active?: boolean;
}) {
  return active ? (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.003 1.131a10.487 10.487 0 0 0-10.87 10.497 10.44 10.44 0 0 0 3.476 7.764l.474 6.467a.5.5 0 0 0 .81.362l3.109-2.59a10.3 10.3 0 0 0 3.001.44 10.487 10.487 0 0 0 10.87-10.498A10.487 10.487 0 0 0 12.003 1.13Z" />
    </svg>
  ) : (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path
        d="M12.003 2.001a9.705 9.705 0 1 1 0 19.4 10.15 10.15 0 0 1-2.839-.401l-3.1 2.59a.502.502 0 0 1-.814-.362l-.474-6.467A9.66 9.66 0 0 1 2.298 11.7a9.705 9.705 0 0 1 9.705-9.7Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CreateIcon({
  className = '',
}: {
  className?: string;
  active?: boolean;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path d="M12 8v8m-4-4h8" strokeLinecap="round" />
      <rect x="3" y="3" width="18" height="18" rx="5" strokeLinecap="round" />
    </svg>
  );
}

function ActivityIcon({
  className = '',
  active = false,
}: {
  className?: string;
  active?: boolean;
}) {
  return active ? (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  ) : (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProfileIcon({
  className = '',
  active = false,
}: {
  className?: string;
  active?: boolean;
}) {
  return active ? (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="8" r="4.5" />
      <path d="M20 21a8 8 0 1 0-16 0Z" />
    </svg>
  ) : (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 1 0-16 0" strokeLinecap="round" />
    </svg>
  );
}
