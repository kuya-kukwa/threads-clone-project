'use client';

/**
 * EmbeddedSearch — Real search content for multi-column layout.
 * Self-contained: fetches its own data, manages its own state.
 * Renders directly into a column's scroll area (no page wrapper).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThreadsSpinner } from '@/components/skeletons';

interface SearchUser {
  $id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
}

interface SuggestedUser extends SearchUser {
  followersCount?: number;
  isFollowing?: boolean;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debouncedValue;
}

/* ---- Main Component ---- */

export function EmbeddedSearch() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<SearchUser[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(searchQuery, 300);

  // Load recent searches
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Fetch suggested users
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/users/suggested?limit=10', {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) setSuggestedUsers(data.users || []);
        }
      } catch {
        /* ignore */
      } finally {
        setLoadingSuggestions(false);
      }
    })();
  }, []);

  // Handle follow / unfollow
  const handleFollow = useCallback(async (userId: string) => {
    setSuggestedUsers((prev) =>
      prev.map((u) =>
        u.userId === userId ? { ...u, isFollowing: !u.isFollowing } : u,
      ),
    );
    try {
      await fetch(`/api/profile/${userId}/follow`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      setSuggestedUsers((prev) =>
        prev.map((u) =>
          u.userId === userId ? { ...u, isFollowing: !u.isFollowing } : u,
        ),
      );
    }
  }, []);

  // Search users
  const searchUsers = useCallback(async (query: string) => {
    if (!query || query.length < 1) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&limit=20`,
        {
          credentials: 'include',
        },
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success) setSearchResults(data.users || []);
      }
    } catch {
      /* ignore */
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    searchUsers(debouncedQuery);
  }, [debouncedQuery, searchUsers]);

  const handleUserClick = (user: SearchUser) => {
    const updated = [
      user,
      ...recentSearches.filter((u) => u.userId !== user.userId),
    ].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
    router.push(`/profile/${user.userId}`);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const removeRecentSearch = (userId: string) => {
    const updated = recentSearches.filter((u) => u.userId !== userId);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="shrink-0 px-4 pt-3 pb-2">
        <div className="relative">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            className="w-full h-10 pl-10 pr-10 bg-[#262626] border border-border/30 rounded-xl text-[14px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-border transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full bg-muted-foreground/30 text-background"
            >
              <XIcon className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 min-h-0 px-4 py-2">
        {isSearching ? (
          <div className="flex items-center justify-center py-12">
            <ThreadsSpinner size="md" className="text-[#555]" />
          </div>
        ) : searchQuery ? (
          searchResults.length > 0 ? (
            <div className="space-y-0.5">
              {searchResults.map((user) => (
                <button
                  key={user.$id}
                  onClick={() => handleUserClick(user)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors text-left"
                >
                  <Avatar className="w-10 h-10 ring-2 ring-border/30">
                    <AvatarImage src={user.avatarUrl} />
                    <AvatarFallback className="bg-linear-to-br from-primary to-accent text-white">
                      {user.displayName?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[15px] tracking-[-0.02em] truncate">
                      {user.displayName}
                    </p>
                    <p className="text-[14px] text-muted-foreground truncate">
                      @{user.username}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">
                No results for &quot;{searchQuery}&quot;
              </p>
            </div>
          )
        ) : (
          /* Default view: recent searches + follow suggestions */
          <div>
            {recentSearches.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[15px] font-semibold">Recent</h3>
                  <button
                    onClick={clearRecentSearches}
                    className="text-sm text-primary hover:text-primary/80"
                  >
                    Clear all
                  </button>
                </div>
                <div className="space-y-0.5 mb-6">
                  {recentSearches.map((user) => (
                    <div
                      key={user.$id}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/50 transition-colors"
                    >
                      <Link
                        href={`/profile/${user.userId}`}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <Avatar className="w-10 h-10 ring-2 ring-border/30">
                          <AvatarImage src={user.avatarUrl} />
                          <AvatarFallback className="bg-linear-to-br from-primary to-accent text-white">
                            {user.displayName?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[14px] truncate tracking-[-0.02em]">
                            {user.displayName}
                          </p>
                          <p className="text-[13px] text-muted-foreground truncate">
                            @{user.username}
                          </p>
                        </div>
                      </Link>
                      <button
                        onClick={() => removeRecentSearch(user.userId)}
                        className="p-2 text-muted-foreground hover:text-foreground"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Follow Suggestions */}
            <div>
              <h3 className="text-[15px] text-muted-foreground mb-3">
                Follow suggestions
              </h3>
              {loadingSuggestions ? (
                <div className="flex items-center justify-center py-8">
                  <ThreadsSpinner size="md" className="text-[#555]" />
                </div>
              ) : suggestedUsers.length > 0 ? (
                <div className="divide-y divide-border/30">
                  {suggestedUsers.map((user) => (
                    <div key={user.$id} className="py-3 first:pt-0">
                      <div className="flex items-start gap-3">
                        <Link href={`/profile/${user.userId}`}>
                          <Avatar className="w-9 h-9">
                            <AvatarImage src={user.avatarUrl} />
                            <AvatarFallback className="bg-linear-to-br from-primary to-accent text-white text-sm">
                              {user.displayName?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <Link href={`/profile/${user.userId}`}>
                              <p className="font-semibold text-[14px] hover:underline">
                                {user.username}
                              </p>
                              <p className="text-[13px] text-muted-foreground">
                                {user.displayName}
                              </p>
                            </Link>
                            <button
                              onClick={() => handleFollow(user.userId)}
                              className={`px-4 py-1 text-[13px] font-semibold rounded-lg transition-colors ${
                                user.isFollowing
                                  ? 'bg-transparent border border-border text-foreground hover:bg-secondary/50'
                                  : 'bg-foreground text-background hover:bg-foreground/90'
                              }`}
                            >
                              {user.isFollowing ? 'Following' : 'Follow'}
                            </button>
                          </div>
                          {user.bio && (
                            <p className="text-[14px] text-foreground mt-1 line-clamp-2">
                              {user.bio}
                            </p>
                          )}
                          {user.followersCount !== undefined && (
                            <p className="text-[13px] text-muted-foreground mt-1">
                              {user.followersCount.toLocaleString()} followers
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentSearches.length === 0 ? (
                <div className="text-center py-12">
                  <SearchIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Search for users
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Icons ---- */

function SearchIcon({ className }: { className?: string }) {
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
