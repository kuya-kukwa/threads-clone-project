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
import { useState, useEffect, useRef, useCallback } from 'react';
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
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
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
      setUnreadCount(0);
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
      className={`fixed bottom-0 left-0 right-0 z-50 md:hidden transition-transform duration-300 ${
        isVisible && !isModalOpen ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      {/* Solid opaque background */}
      <div className="bg-[#121212] border-t border-border/50">
        <div
          className="flex items-center justify-around px-1"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
          {navItems.map((item) => {
            const active = isActive(item);
            const href = getHref(item);
            const Icon = item.icon;

            // Special styling for create button
            if (item.isCreate) {
              return (
                <Link
                  key={item.id}
                  href={href}
                  className="flex items-center justify-center -mt-4"
                  aria-label="Create new post"
                >
                  <div className="w-12 h-12 rounded-full btn-gradient flex items-center justify-center shadow-lg shadow-primary/30">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </Link>
              );
            }

            return (
              <Link
                key={item.id}
                href={href}
                className={`flex flex-col items-center justify-center min-w-[3.5rem] py-2 px-2 rounded-xl transition-all duration-200 ${
                  active
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
              >
                <div className="relative">
                  <Icon className="w-6 h-6" active={active} />
                  {/* Notification badge for Activity tab */}
                  {item.id === 'activity' && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-0.5 font-medium">
                  {item.label}
                </span>
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
      <path d="M12 2L3 9.5V21.5C3 22.05 3.45 22.5 4 22.5H9V15.5C9 14.95 9.45 14.5 10 14.5H14C14.55 14.5 15 14.95 15 15.5V22.5H20C20.55 22.5 21 22.05 21 21.5V9.5L12 2Z" />
    </svg>
  ) : (
    <svg
      className={className}
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

function MessagesIcon({
  className = '',
  active = false,
}: {
  className?: string;
  active?: boolean;
}) {
  return active ? (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
    </svg>
  ) : (
    <svg
      className={className}
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
      strokeWidth={2.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.5v15m7.5-7.5h-15"
      />
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

function ProfileIcon({
  className = '',
  active = false,
}: {
  className?: string;
  active?: boolean;
}) {
  return active ? (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  ) : (
    <svg
      className={className}
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
