'use client';

/**
 * Mobile Top Navigation Component
 * Shows hamburger menu (left) and search (right) on mobile
 * Only visible on mobile devices
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

type FeedTab = 'for-you' | 'following' | 'likes';

interface MobileTopNavProps {
  activeTab?: FeedTab;
  onTabChange?: (tab: FeedTab) => void;
}

export function MobileTopNav({
  activeTab = 'for-you',
  onTabChange,
}: MobileTopNavProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Add modal-open class when menu is open to hide bottom nav
  useEffect(() => {
    if (showMenu || showSearch) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showMenu, showSearch]);

  const menuItems: { id: FeedTab; label: string; icon: React.ReactNode }[] = [
    { id: 'for-you', label: 'For You', icon: <HomeIcon className="w-5 h-5" /> },
    {
      id: 'following',
      label: 'Following',
      icon: <UsersIcon className="w-5 h-5" />,
    },
    { id: 'likes', label: 'Likes', icon: <HeartIcon className="w-5 h-5" /> },
  ];

  const handleTabSelect = (tab: FeedTab) => {
    onTabChange?.(tab);
    setShowMenu(false);
  };

  return (
    <>
      {/* Top Nav Bar - Mobile only */}
      <div className="sticky top-0 z-40 bg-[#121212] border-b border-border/50 md:hidden">
        <div className="flex items-center justify-between h-12 px-4">
          {/* Hamburger Menu Button */}
          <button
            onClick={() => setShowMenu(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Menu"
          >
            <MenuIcon className="w-5 h-5" />
          </button>

          {/* Logo / Title */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">
              {activeTab === 'for-you' && 'For You'}
              {activeTab === 'following' && 'Following'}
              {activeTab === 'likes' && 'Likes'}
            </span>
          </div>

          {/* Search Button */}
          <button
            onClick={() => setShowSearch(true)}
            className="p-2 -mr-2 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Search"
          >
            <SearchIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Menu Overlay */}
      {showMenu && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMenu(false)}
          />

          {/* Menu Panel - Slide from left */}
          <div className="absolute top-0 left-0 bottom-0 w-72 bg-background border-r border-border animate-slide-in-left">
            {/* Menu Header */}
            <div className="flex items-center justify-between h-14 px-4 border-b border-border/50">
              <span className="text-lg font-semibold">Menu</span>
              <button
                onClick={() => setShowMenu(false)}
                className="p-2 -mr-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Feed Tabs */}
            <div className="p-2">
              <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Feed
              </p>
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleTabSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                    activeTab === item.id
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                  {activeTab === item.id && (
                    <CheckIcon className="w-4 h-4 ml-auto text-primary" />
                  )}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="mx-4 my-2 border-t border-border/50" />

            {/* Quick Actions */}
            <div className="p-2">
              <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Quick Actions
              </p>
              <Link
                href="/create"
                onClick={() => setShowMenu(false)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                <span className="font-medium">Create New Post</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Search Overlay */}
      {showSearch && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSearch(false)}
          />

          {/* Search Panel - Slide from top */}
          <div className="absolute top-0 left-0 right-0 bg-background border-b border-border animate-slide-in-top">
            {/* Search Header */}
            <div className="flex items-center gap-3 h-14 px-4">
              <button
                onClick={() => setShowSearch(false)}
                className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search usernames..."
                  autoFocus
                  className="w-full bg-secondary border-0 rounded-full pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Search Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {searchQuery.length > 0 ? (
                <div className="p-4">
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Search for &quot;{searchQuery}&quot;
                  </p>
                  {/* TODO: Implement user search results */}
                </div>
              ) : (
                <div className="p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Recent Searches
                  </p>
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No recent searches
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Icons
function MenuIcon({ className }: { className?: string }) {
  return (
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
        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
      />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
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
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
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

function UsersIcon({ className }: { className?: string }) {
  return (
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
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
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

function PlusIcon({ className }: { className?: string }) {
  return (
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
        d="M12 4.5v15m7.5-7.5h-15"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
