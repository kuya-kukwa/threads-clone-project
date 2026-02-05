'use client';

/**
 * Desktop Sidebar Component
 * Fixed left navigation for desktop/tablet screens (lg+)
 * Matches the official Threads app layout - ICON ONLY (no labels)
 *
 * Features:
 * - Logo at top
 * - Navigation icons (Home, Search, Activity, Profile)
 * - Create post button (opens modal)
 * - More menu at bottom with dropdown
 * - Notification badge on Activity
 */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCurrentUser, useAuth } from '@/hooks';
import {
  useState,
  useEffect,
  useCallback,
  startTransition,
  useRef,
} from 'react';
import { getSessionToken } from '@/lib/appwriteClient';
import { logger } from '@/lib/logger/logger';
import { CreatePostModal } from '@/components/threads/CreatePostModal';

export function DesktopSidebar() {
  const { user } = useCurrentUser();
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Handle logout
  const handleLogout = async () => {
    setShowMoreMenu(false);
    await logout();
    router.push('/login');
  };

  // Don't show on auth pages
  const isAuthPage =
    pathname.startsWith('/login') || pathname.startsWith('/register');

  if (!user || isAuthPage) return null;

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-[88px] flex-col bg-background z-50 pl-2">
      {/* Logo */}
      <div className="flex items-center justify-center pt-6 pb-4">
        <Link
          href="/feed"
          className="p-2 rounded-lg hover:scale-110 transition-transform"
        >
          <ThreadsLogo className="w-9 h-9" />
        </Link>
      </div>

      {/* Navigation - Centered vertically */}
      <nav className="flex-1 flex flex-col items-center justify-center gap-1">
        <NavItem
          href="/feed"
          icon={<HomeIcon />}
          activeIcon={<HomeIconFilled />}
          active={pathname === '/feed' || pathname === '/'}
          tooltip="Home"
        />
        <NavItem
          href="/search"
          icon={<SearchIcon />}
          activeIcon={<SearchIconFilled />}
          active={pathname === '/search'}
          tooltip="Search"
        />
        <CreateNavButton
          onClick={() => setIsCreateModalOpen(true)}
          icon={<CreateIcon />}
        />
        <NavItem
          href="/activity"
          icon={<ActivityIcon />}
          activeIcon={<ActivityIconFilled />}
          active={pathname === '/activity'}
          badge={unreadCount}
          tooltip="Activity"
        />
        <NavItem
          href={`/profile/${user.$id}`}
          icon={<ProfileIcon />}
          activeIcon={<ProfileIconFilled />}
          active={pathname.startsWith('/profile')}
          tooltip="Profile"
        />
      </nav>

      {/* Bottom Section - More menu with dropdown */}
      <div className="pb-6 flex flex-col items-center relative" ref={menuRef}>
        <button
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className={`
            p-3.5 rounded-xl transition-all duration-200
            ${
              showMoreMenu
                ? 'text-foreground bg-secondary/50'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }
          `}
          aria-label="More options"
        >
          <MoreIcon />
        </button>

        {/* Dropdown Menu */}
        {showMoreMenu && (
          <div className="absolute bottom-full left-2 mb-2 w-56 bg-[#181818] border border-border/50 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="py-2">
              <MenuLink href="/settings/appearance" icon={<AppearanceIcon />}>
                Appearance
              </MenuLink>
              <MenuLink href="/insights" icon={<InsightsIcon />}>
                Insights
              </MenuLink>
              <MenuLink href="/settings" icon={<SettingsIcon />}>
                Settings
              </MenuLink>
            </div>
            <div className="border-t border-border/50 py-2">
              <MenuLink href="/feeds" icon={<FeedsIcon />} hasArrow>
                Feeds
              </MenuLink>
              <MenuLink href="/saved" icon={<SavedIcon />}>
                Saved
              </MenuLink>
              <MenuLink href="/liked" icon={<LikedIcon />}>
                Liked
              </MenuLink>
            </div>
            <div className="border-t border-border/50 py-2">
              <MenuLink href="/report" icon={<ReportIcon />}>
                Report a problem
              </MenuLink>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-red-500 hover:bg-secondary/50 transition-colors text-left"
              >
                <LogoutIcon />
                <span className="text-[15px]">Log out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </aside>
  );
}

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
  active: boolean;
  badge?: number;
  isCreate?: boolean;
  tooltip: string;
}

function NavItem({
  href,
  icon,
  activeIcon,
  active,
  badge,
  isCreate,
}: NavItemProps) {
  return (
    <Link
      href={href}
      className={`
        relative p-3.5 rounded-xl transition-all duration-200
        ${
          isCreate
            ? 'hover:bg-secondary/50'
            : active
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
        }
      `}
    >
      <div
        className={`relative w-8 h-8 flex items-center justify-center ${isCreate ? 'border-2 border-current rounded-lg' : ''}`}
      >
        {active ? activeIcon : icon}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
    </Link>
  );
}

// Create button component (opens modal instead of navigating)
interface CreateNavButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
}

function CreateNavButton({ onClick, icon }: CreateNavButtonProps) {
  return (
    <button
      onClick={onClick}
      className="relative p-3.5 rounded-xl transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-secondary/50"
      aria-label="Create new thread"
    >
      <div className="relative w-8 h-8 flex items-center justify-center border-2 border-current rounded-lg">
        {icon}
      </div>
    </button>
  );
}

// Menu item component
interface MenuLinkProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  hasArrow?: boolean;
}

function MenuLink({ href, icon, children, hasArrow }: MenuLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 px-4 py-2.5 text-foreground hover:bg-secondary/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-[15px]">{children}</span>
      </div>
      {hasArrow && <ChevronRightIcon />}
    </Link>
  );
}

// Logo
function ThreadsLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 192 192" fill="currentColor">
      <path d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.695 14.724-10.548 21.348-10.548h.229c8.249.053 14.474 2.452 18.503 7.129 2.932 3.405 4.893 8.111 5.864 14.05-7.314-1.243-15.224-1.626-23.68-1.14-23.82 1.371-39.134 15.264-38.105 34.568.522 9.792 5.4 18.216 13.735 23.719 7.047 4.652 16.124 6.927 25.557 6.412 12.458-.683 22.231-5.436 29.049-14.127 5.178-6.6 8.453-15.153 9.899-25.93 5.937 3.583 10.337 8.298 12.767 13.966 4.132 9.635 4.373 25.468-8.546 38.376-11.319 11.308-24.925 16.2-45.488 16.351-22.809-.169-40.06-7.484-51.275-21.742C35.236 139.966 29.808 120.682 29.605 96c.203-24.682 5.63-43.966 16.133-57.317C56.954 24.425 74.204 17.11 97.013 16.94c23.003.173 40.56 7.54 52.198 21.909 5.597 6.903 9.834 15.322 12.674 25.063l15.666-4.18c-3.372-11.613-8.596-21.683-15.69-30.436C146.07 10.053 124.716.951 97.068.751h-.112C69.34.952 48.2 10.106 32.907 29.407 19.593 45.975 12.813 68.164 12.596 95.946l-.001.108.001.108c.217 27.783 6.997 49.971 20.311 66.54 15.291 19.299 36.432 28.453 64.089 28.654h.112c24.596-.173 42.06-6.587 56.716-20.839 20.51-19.923 19.591-45.123 13.376-59.622-4.46-10.417-12.678-18.746-23.663-24.007zM97.892 141.088c-10.464.572-21.318-4.086-22.166-14.012-.628-7.357 5.047-15.557 25.132-16.718 2.205-.127 4.35-.19 6.44-.19 6.22 0 12.04.592 17.39 1.75-1.98 22.758-14.939 28.616-26.796 29.17z" />
    </svg>
  );
}

// Icons - Outline versions (Official Threads style)
function HomeIcon() {
  return (
    <svg
      className="w-7 h-7"
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

function HomeIconFilled() {
  return (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9.005 16.545a2.997 2.997 0 0 1 2.997-2.997A2.997 2.997 0 0 1 15 16.545V22h7V11.543L12 2 2 11.543V22h7.005Z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      className="w-7 h-7"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path
        d="M19 10.5A8.5 8.5 0 1 1 10.5 2a8.5 8.5 0 0 1 8.5 8.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.511 16.511 22 22"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIconFilled() {
  return (
    <svg
      className="w-7 h-7"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path
        d="M19 10.5A8.5 8.5 0 1 1 10.5 2a8.5 8.5 0 0 1 8.5 8.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.511 16.511 22 22"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CreateIcon() {
  return (
    <svg
      className="w-6 h-6"
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

function ActivityIcon() {
  return (
    <svg
      className="w-7 h-7"
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

function ActivityIconFilled() {
  return (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg
      className="w-7 h-7"
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

function ProfileIconFilled() {
  return (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="8" r="4.5" />
      <path d="M20 21a8 8 0 1 0-16 0Z" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg
      className="w-7 h-7"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path d="M3 8h18" strokeLinecap="round" />
      <path d="M3 16h12" strokeLinecap="round" />
    </svg>
  );
}

// Menu icons
function AppearanceIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
      />
    </svg>
  );
}

function InsightsIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function FeedsIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
      />
    </svg>
  );
}

function SavedIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
      />
    </svg>
  );
}

function LikedIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      className="w-4 h-4 text-muted-foreground"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 4.5l7.5 7.5-7.5 7.5"
      />
    </svg>
  );
}
