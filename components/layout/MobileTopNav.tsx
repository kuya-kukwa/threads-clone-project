'use client';

/**
 * Mobile Top Navigation Component
 * Shows hamburger menu (left) and search (right) on mobile
 * Only visible on mobile devices
 *
 * Features:
 * - Real-time user search with debouncing
 * - Search by username or display name
 * - Navigate to user profiles from search results
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SearchResultsSkeleton } from '@/components/ui/skeletons';

type FeedTab = 'for-you' | 'following' | 'likes';

interface SearchUser {
  $id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
}

interface MobileTopNavProps {
  activeTab?: FeedTab;
  onTabChange?: (tab: FeedTab) => void;
}

/**
 * Custom hook for debounced search
 * Prevents excessive API calls during typing
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function MobileTopNav({
  activeTab = 'for-you',
  onTabChange,
}: MobileTopNavProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce search query by 300ms for real-time feel without excessive API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  /**
   * Perform user search when debounced query changes
   * Uses AbortController for request cancellation on new searches
   */
  const searchUsers = useCallback(
    async (query: string, signal: AbortSignal) => {
      if (!query || query.length < 1) {
        setSearchResults([]);
        setSearchError(null);
        return;
      }

      setIsSearching(true);
      setSearchError(null);

      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&limit=10`,
          {
            signal,
            credentials: 'include',
          },
        );

        if (!response.ok) {
          throw new Error('Search request failed');
        }

        const data = await response.json();

        if (data.success) {
          setSearchResults(data.users || []);
        } else {
          setSearchError(data.error || 'Search failed');
          setSearchResults([]);
        }
      } catch (error) {
        // Ignore abort errors (user typed new query)
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        console.error('Search error:', error);
        setSearchError('Failed to search. Please try again.');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [],
  );

  // Effect to trigger search on debounced query change
  useEffect(() => {
    const abortController = new AbortController();

    if (debouncedSearchQuery) {
      searchUsers(debouncedSearchQuery, abortController.signal);
    } else {
      setSearchResults([]);
      setSearchError(null);
    }

    return () => {
      abortController.abort();
    };
  }, [debouncedSearchQuery, searchUsers]);

  // Focus input when search opens
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Clear search when closing
  const handleCloseSearch = () => {
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
  };

  // Navigate to user profile from search
  const handleUserClick = (userId: string) => {
    handleCloseSearch();
    router.push(`/profile/${userId}`);
  };

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
            onClick={handleCloseSearch}
          />

          {/* Search Panel - Slide from top */}
          <div className="absolute top-0 left-0 right-0 bg-background border-b border-border animate-slide-in-top">
            {/* Search Header */}
            <div className="flex items-center gap-3 h-14 px-4">
              <button
                onClick={handleCloseSearch}
                className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search usernames or names..."
                  autoFocus
                  className="w-full bg-secondary border-0 rounded-full pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {/* Loading indicator */}
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {/* Search Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {/* Error state */}
              {searchError && (
                <div className="p-4">
                  <p className="text-sm text-red-500 text-center py-4">
                    {searchError}
                  </p>
                </div>
              )}

              {/* Results */}
              {!searchError && searchQuery.length > 0 && (
                <div className="py-2">
                  {isSearching && searchResults.length === 0 ? (
                    <>
                      <p className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Searching...
                      </p>
                      <SearchResultsSkeleton count={4} />
                    </>
                  ) : searchResults.length > 0 ? (
                    <>
                      <p className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Users
                      </p>
                      <div className="space-y-1 px-2">
                        {searchResults.map((user) => (
                          <button
                            key={user.$id}
                            onClick={() => handleUserClick(user.userId)}
                            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-secondary/50 transition-colors text-left"
                          >
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex-shrink-0 overflow-hidden">
                              {user.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={user.avatarUrl}
                                  alt={user.displayName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white font-medium text-sm">
                                  {user.displayName[0]?.toUpperCase() ||
                                    user.username[0]?.toUpperCase()}
                                </div>
                              )}
                            </div>
                            {/* User Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">
                                {user.displayName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                @{user.username}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No users found for &quot;{searchQuery}&quot;
                    </p>
                  )}
                </div>
              )}

              {/* Empty state - no query */}
              {!searchError && searchQuery.length === 0 && (
                <div className="p-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Search Tips
                  </p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• Search by username (e.g., @john)</p>
                    <p>• Search by display name</p>
                    <p>• Results update as you type</p>
                  </div>
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
