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
import {
  ThreadsLogo,
  HomeIcon,
  SearchIcon,
  CreatePlusIcon,
  ActivityIcon,
  ProfileIcon,
  MoreIcon,
  AppearanceIcon,
  InsightsIcon,
  SettingsIcon,
  FeedsIcon,
  SavedIcon,
  LikedIcon,
  ReportIcon,
  LogoutIcon,
  ChevronRightIcon,
} from '@/components/icons/ThreadsIcons';

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
    <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-[76px] flex-col items-center z-50 bg-black/40 backdrop-blur-2xl">
      {/* Logo */}
      <div className="flex items-center justify-center pt-4 pb-2">
        <Link
          href="/feed"
          className="p-2.5 rounded-xl hover:bg-white/[0.06] active:scale-95 transition-all duration-200"
        >
          <ThreadsLogo className="w-8 h-8" />
        </Link>
      </div>

      {/* Navigation - Centered vertically */}
      <nav className="flex-1 flex flex-col items-center justify-center gap-0.5">
        <NavItem
          href="/feed"
          Icon={HomeIcon}
          active={pathname === '/feed' || pathname === '/'}
          tooltip="Home"
        />
        <NavItem
          href="/search"
          Icon={SearchIcon}
          active={pathname === '/search'}
          tooltip="Search"
        />
        <CreateNavButton
          onClick={() => setIsCreateModalOpen(true)}
          icon={<CreatePlusIcon />}
        />
        <NavItem
          href="/activity"
          Icon={ActivityIcon}
          active={pathname === '/activity'}
          badge={unreadCount}
          tooltip="Activity"
        />
        <NavItem
          href={`/profile/${user.$id}`}
          Icon={ProfileIcon}
          active={pathname.startsWith('/profile')}
          tooltip="Profile"
        />
      </nav>

      {/* Bottom Section - More menu with dropdown */}
      <div className="pb-5 flex flex-col items-center relative" ref={menuRef}>
        <button
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className={`
            p-3 rounded-xl transition-all duration-200
            ${
              showMoreMenu
                ? 'text-white bg-white/[0.08]'
                : 'text-[#4d4d4d] hover:text-white hover:bg-white/[0.06]'
            }
          `}
          aria-label="More options"
        >
          <MoreIcon className="w-[26px] h-[26px]" />
        </button>

        {/* Dropdown Menu */}
        {showMoreMenu && (
          <div className="absolute bottom-full left-1 mb-2 w-[230px] bg-[#181818] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="py-1">
              <MenuLink
                href="/settings/appearance"
                icon={<AppearanceIcon className="w-[18px] h-[18px]" />}
              >
                Appearance
              </MenuLink>
              <MenuLink
                href="/insights"
                icon={<InsightsIcon className="w-[18px] h-[18px]" />}
              >
                Insights
              </MenuLink>
              <MenuLink
                href="/settings"
                icon={<SettingsIcon className="w-[18px] h-[18px]" />}
              >
                Settings
              </MenuLink>
            </div>
            <div className="border-t border-white/[0.08] py-1">
              <MenuLink
                href="/feeds"
                icon={<FeedsIcon className="w-[18px] h-[18px]" />}
                hasArrow
              >
                Feeds
              </MenuLink>
              <MenuLink
                href="/saved"
                icon={<SavedIcon className="w-[18px] h-[18px]" />}
              >
                Saved
              </MenuLink>
              <MenuLink
                href="/liked"
                icon={<LikedIcon className="w-[18px] h-[18px]" />}
              >
                Liked
              </MenuLink>
            </div>
            <div className="border-t border-white/[0.08] py-1">
              <MenuLink
                href="/report"
                icon={<ReportIcon className="w-[18px] h-[18px]" />}
              >
                Report a problem
              </MenuLink>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-white/[0.06] transition-colors text-left"
              >
                <LogoutIcon className="w-[18px] h-[18px]" />
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
  Icon: React.ComponentType<{ className?: string; active?: boolean }>;
  active: boolean;
  badge?: number;
  isCreate?: boolean;
  tooltip: string;
}

function NavItem({ href, Icon, active, badge }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`
        relative p-3 rounded-xl transition-all duration-200
        ${
          active
            ? 'text-white'
            : 'text-[#4d4d4d] hover:text-white hover:bg-white/[0.06]'
        }
      `}
    >
      <div className="relative w-7 h-7 flex items-center justify-center">
        <Icon className="w-[26px] h-[26px]" active={active} />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-[5px] flex items-center justify-center text-[10px] font-semibold text-white bg-[#ff3040] rounded-full">
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
      className="relative p-1.5 my-1 rounded-xl transition-all duration-200"
      aria-label="Create new thread"
    >
      <div className="relative w-[52px] h-[44px] flex items-center justify-center bg-white/[0.05] rounded-[14px] hover:bg-white/[0.1] transition-colors">
        <div className="text-[#5a5a5a]">{icon}</div>
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
      className="flex items-center justify-between gap-3 px-4 py-2.5 text-[#f3f5f7] hover:bg-white/[0.06] transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className="text-[#a8a8a8]">{icon}</span>
        <span className="text-[15px]">{children}</span>
      </div>
      {hasArrow && <ChevronRightIcon className="w-3.5 h-3.5 text-[#666]" />}
    </Link>
  );
}
