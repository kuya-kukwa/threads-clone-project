'use client';

/**
 * Mobile Top Navigation — Global Header
 * Matches official Threads mobile: centered logo + right-side menu icon
 * Logo click navigates to /feed
 * Menu icon opens dropdown with Appearance, Settings, Feeds, Saved, Liked, etc.
 * Only visible on mobile/tablet (< lg)
 */

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, useCurrentUser } from '@/hooks';
import {
  ThreadsLogo,
  MenuIcon,
  ChevronRightIcon,
} from '@/components/icons/ThreadsIcons';

export function MobileTopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useCurrentUser();
  const { logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    const t = setTimeout(
      () => document.addEventListener('mousedown', handler),
      0,
    );
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', handler);
    };
  }, [showMenu]);

  // Close menu on navigation
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowMenu(false);
  }, [pathname]);

  // Hide on auth pages or when not logged in
  const isAuthPage =
    pathname.startsWith('/login') || pathname.startsWith('/register');
  if (!user || isAuthPage) return null;

  const handleLogout = async () => {
    setShowMenu(false);
    await logout();
    router.push('/login');
  };

  return (
    <div className="sticky top-0 z-40 lg:hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between h-14 px-4 bg-black">
        {/* Spacer for symmetry */}
        <div className="w-10" />

        {/* Centered Threads Logo */}
        <Link
          href="/feed"
          className="p-2 rounded-xl active:scale-90 transition-transform"
          aria-label="Home"
        >
          <ThreadsLogo className="w-7 h-7" />
        </Link>

        {/* Menu button */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu((v) => !v)}
            className={`p-2 rounded-xl transition-colors ${
              showMenu ? 'text-white' : 'text-[#4d4d4d] active:text-white'
            }`}
            aria-label="Menu"
          >
            <MenuIcon className="w-[22px] h-[22px]" />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-[220px] bg-[#181818] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 z-50">
              <div className="py-1">
                <MenuButton
                  label="Appearance"
                  hasArrow
                  onClick={() => {
                    setShowMenu(false);
                    router.push('/settings/appearance');
                  }}
                />
                <MenuButton
                  label="Settings"
                  onClick={() => {
                    setShowMenu(false);
                    router.push('/settings');
                  }}
                />
              </div>
              <div className="border-t border-white/[0.08] py-1">
                <MenuButton
                  label="Feeds"
                  hasArrow
                  onClick={() => {
                    setShowMenu(false);
                    router.push('/feeds');
                  }}
                />
                <MenuButton
                  label="Saved"
                  onClick={() => {
                    setShowMenu(false);
                    router.push('/saved');
                  }}
                />
                <MenuButton
                  label="Liked"
                  onClick={() => {
                    setShowMenu(false);
                    router.push('/liked');
                  }}
                />
              </div>
              <div className="border-t border-white/[0.08] py-1">
                <MenuButton
                  label="Report a problem"
                  onClick={() => {
                    setShowMenu(false);
                    router.push('/report');
                  }}
                />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-[15px] text-red-400 hover:bg-white/[0.06] transition-colors"
                >
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Menu button item ─────────────────────────────────────────────────── */

function MenuButton({
  label,
  hasArrow,
  onClick,
}: {
  label: string;
  hasArrow?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.06] transition-colors text-left"
    >
      <span className="text-[15px] text-[#f3f5f7] font-normal">{label}</span>
      {hasArrow && <ChevronRightIcon className="w-3.5 h-3.5 text-[#666]" />}
    </button>
  );
}
