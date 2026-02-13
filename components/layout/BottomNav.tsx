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
import {
  HomeIcon,
  SearchIcon,
  CreateIcon,
  ActivityIcon,
  ProfileIcon,
} from '@/components/icons/ThreadsIcons';

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
    id: 'search',
    label: 'Search',
    href: '/search',
    icon: SearchIcon,
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
  // Keep nav always visible on /create to prevent gap with audience bar
  const isCreatePage = pathname === '/create';

  useEffect(() => {
    // On /create page, always keep nav visible — no scroll-based hiding
    if (isCreatePage) {
      setIsVisible(true);
      return;
    }

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
  }, [isCreatePage]);

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
    if (item.id === 'search') {
      return pathname.startsWith('/search');
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
      <div className="bg-black/95 backdrop-blur-xl border-t border-white/[0.08]">
        <div
          className="flex items-center justify-around px-1"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
          {navItems.map((item) => {
            const active = isActive(item);
            const href = getHref(item);
            const Icon = item.icon;

            // Create button - subtle outlined square
            if (item.isCreate) {
              return (
                <Link
                  key={item.id}
                  href={href}
                  className="flex items-center justify-center min-w-[52px] py-2.5 px-2 rounded-xl transition-all duration-200 text-[#4d4d4d] active:scale-90"
                  aria-label="Create new post"
                >
                  <Icon className="w-[26px] h-[26px]" />
                </Link>
              );
            }

            return (
              <Link
                key={item.id}
                href={href}
                className={`flex items-center justify-center min-w-[52px] py-2.5 px-2 rounded-xl transition-all duration-200 active:scale-90 ${
                  active ? 'text-white' : 'text-[#4d4d4d]'
                }`}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
              >
                <div className="relative">
                  <Icon className="w-[26px] h-[26px]" active={active} />
                  {item.id === 'activity' && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[16px] h-[16px] px-1 flex items-center justify-center text-[9px] font-semibold text-white bg-[#ff3040] rounded-full">
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
