'use client';

/**
 * Bottom Navigation Component
 * Mobile-first bottom tab bar with glass morphism effect
 * Shows only on mobile devices (md:hidden)
 *
 * Features:
 * - Home/Feed, Search, Create, Activity, Profile tabs
 * - Active state indicators
 * - Glass morphism backdrop
 * - Safe area support for notched devices
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCurrentUser } from '@/hooks';

interface NavItem {
  id: string;
  label: string;
  href: string | ((userId: string) => string);
  icon: React.FC<{ className?: string; active?: boolean }>;
  requiresAuth: boolean;
}

const navItems: NavItem[] = [
  {
    id: 'home',
    label: 'Home',
    href: '/feed',
    icon: HomeIcon,
    requiresAuth: true,
  },
  {
    id: 'search',
    label: 'Search',
    href: '/feed', // TODO: Create search page
    icon: SearchIcon,
    requiresAuth: true,
  },
  {
    id: 'create',
    label: 'Create',
    href: '/feed', // Opens composer - handled differently
    icon: CreateIcon,
    requiresAuth: true,
  },
  {
    id: 'activity',
    label: 'Activity',
    href: '/feed', // TODO: Create activity page
    icon: HeartIcon,
    requiresAuth: true,
  },
  {
    id: 'profile',
    label: 'Profile',
    href: (userId: string) => `/profile/${userId}`,
    icon: ProfileIcon,
    requiresAuth: true,
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user, isLoading } = useCurrentUser();

  // Don't show on auth pages or while loading
  if (isLoading || pathname.startsWith('/login') || pathname.startsWith('/register')) {
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
    return pathname === href;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Glass background */}
      <div className="glass border-t border-border/50">
        <div
          className="flex items-center justify-around px-2"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
          {navItems.map((item) => {
            const active = isActive(item);
            const href = getHref(item);
            const Icon = item.icon;

            return (
              <Link
                key={item.id}
                href={href}
                className={`flex flex-col items-center justify-center min-w-[4rem] py-2 px-3 rounded-xl transition-all duration-200 ${
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="w-6 h-6" active={active} />
                <span className="text-[10px] mt-1 font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

// Icon Components with active state support

function HomeIcon({ className = '', active = false }: { className?: string; active?: boolean }) {
  return active ? (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L3 9.5V21.5C3 22.05 3.45 22.5 4 22.5H9V15.5C9 14.95 9.45 14.5 10 14.5H14C14.55 14.5 15 14.95 15 15.5V22.5H20C20.55 22.5 21 22.05 21 21.5V9.5L12 2Z" />
    </svg>
  ) : (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function SearchIcon({ className = '', active = false }: { className?: string; active?: boolean }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 1.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function CreateIcon({ className = '', active = false }: { className?: string; active?: boolean }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 1.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function HeartIcon({ className = '', active = false }: { className?: string; active?: boolean }) {
  return active ? (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  ) : (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  );
}

function ProfileIcon({ className = '', active = false }: { className?: string; active?: boolean }) {
  return active ? (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  ) : (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}
