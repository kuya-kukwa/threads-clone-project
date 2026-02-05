'use client';

/**
 * Search Page
 * Search for users and content
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface SearchUser {
  $id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
}

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

interface SuggestedUser extends SearchUser {
  followersCount?: number;
  isFollowing?: boolean;
}

function SearchContent() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<SearchUser[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Fetch suggested users
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const response = await fetch('/api/users/suggested?limit=10', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setSuggestedUsers(data.users || []);
          }
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
      } finally {
        setLoadingSuggestions(false);
      }
    };
    fetchSuggestions();
  }, []);

  // Handle follow/unfollow
  const handleFollow = async (userId: string) => {
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
      // Revert on error
      setSuggestedUsers((prev) =>
        prev.map((u) =>
          u.userId === userId ? { ...u, isFollowing: !u.isFollowing } : u,
        ),
      );
    }
  };

  // Search users
  const searchUsers = useCallback(async (query: string) => {
    if (!query || query.length < 1) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&limit=20`,
        {
          credentials: 'include',
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSearchResults(data.users || []);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    searchUsers(debouncedSearchQuery);
  }, [debouncedSearchQuery, searchUsers]);

  const handleUserClick = (user: SearchUser) => {
    // Save to recent searches
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
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      {/* Desktop Content Container - Fixed height with internal scroll */}
      <div className="hidden lg:flex lg:flex-col max-w-160 mx-auto lg:pl-6 lg:pr-4 h-screen overflow-hidden">
        {/* Fixed Header - Outside bordered area */}
        <div className="shrink-0 bg-background pt-6 pb-2">
          <div className="flex items-center justify-center h-12 px-4 relative">
            <span className="text-[15px] font-medium">Search</span>
            <button className="absolute right-4 p-2 rounded-full hover:bg-secondary/50 transition-colors -mr-2">
              <MoreHorizontalIcon className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content wrapper with border and rounded corners - scrollable area contained */}
        <div className="border border-border/30 rounded-t-2xl flex-1 min-h-0 overflow-y-auto bg-background [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Desktop Search Bar */}
          <div className="px-4 pt-4">
            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="w-full h-11 pl-12 pr-12 bg-[#262626] border border-border/30 rounded-xl text-[15px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-border transition-all"
              />
              <button className="absolute right-4 top-1/2 -translate-y-1/2">
                <FilterIcon className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Desktop Content */}
          <div className="px-4 py-4">
            <SearchResults
              searchQuery={searchQuery}
              isSearching={isSearching}
              searchResults={searchResults}
              suggestedUsers={suggestedUsers}
              loadingSuggestions={loadingSuggestions}
              recentSearches={recentSearches}
              handleUserClick={handleUserClick}
              handleFollow={handleFollow}
              clearRecentSearches={clearRecentSearches}
              removeRecentSearch={removeRecentSearch}
            />
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-40 bg-black border-b border-border/30">
        <div className="max-w-160 mx-auto px-4 py-3">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full h-12 pl-12 pr-4 bg-secondary/50 border border-border/50 rounded-2xl text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-muted-foreground/30 text-background"
              >
                <XIcon className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Content */}
      <div className="lg:hidden max-w-160 mx-auto px-4 py-4">
        <SearchResults
          searchQuery={searchQuery}
          isSearching={isSearching}
          searchResults={searchResults}
          suggestedUsers={suggestedUsers}
          loadingSuggestions={loadingSuggestions}
          recentSearches={recentSearches}
          handleUserClick={handleUserClick}
          handleFollow={handleFollow}
          clearRecentSearches={clearRecentSearches}
          removeRecentSearch={removeRecentSearch}
        />
      </div>
    </div>
  );
}

interface SearchResultsProps {
  searchQuery: string;
  isSearching: boolean;
  searchResults: SearchUser[];
  suggestedUsers: SuggestedUser[];
  loadingSuggestions: boolean;
  recentSearches: SearchUser[];
  handleUserClick: (user: SearchUser) => void;
  handleFollow: (userId: string) => void;
  clearRecentSearches: () => void;
  removeRecentSearch: (userId: string) => void;
}

function SearchResults({
  searchQuery,
  isSearching,
  searchResults,
  suggestedUsers,
  loadingSuggestions,
  recentSearches,
  handleUserClick,
  handleFollow,
  clearRecentSearches,
  removeRecentSearch,
}: SearchResultsProps) {
  if (isSearching) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (searchQuery) {
    // Search Results
    return searchResults.length > 0 ? (
      <div className="space-y-1">
        {searchResults.map((user) => (
          <button
            key={user.$id}
            onClick={() => handleUserClick(user)}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors text-left"
          >
            <Avatar className="w-12 h-12 ring-2 ring-border/30">
              <AvatarImage src={user.avatarUrl} />
              <AvatarFallback className="bg-linear-to-br from-primary to-accent text-white">
                {user.displayName?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{user.displayName}</p>
              <p className="text-sm text-muted-foreground truncate">
                @{user.username}
              </p>
            </div>
          </button>
        ))}
      </div>
    ) : (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No results found for &quot;{searchQuery}&quot;
        </p>
      </div>
    );
  }

  // Recent Searches + Follow Suggestions
  return (
    <div>
      {recentSearches.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold">Recent</h3>
            <button
              onClick={clearRecentSearches}
              className="text-sm text-primary hover:text-primary/80"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-1">
            {recentSearches.map((user) => (
              <div
                key={user.$id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors"
              >
                <Link
                  href={`/profile/${user.userId}`}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <Avatar className="w-12 h-12 ring-2 ring-border/30">
                    <AvatarImage src={user.avatarUrl} />
                    <AvatarFallback className="bg-linear-to-br from-primary to-accent text-white">
                      {user.displayName?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{user.displayName}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      @{user.username}
                    </p>
                  </div>
                </Link>
                <button
                  onClick={() => removeRecentSearch(user.userId)}
                  className="p-2 text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Follow Suggestions */}
      <div className="mt-6">
        <h3 className="text-[15px] text-muted-foreground mb-4">
          Follow suggestions
        </h3>
        {loadingSuggestions ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : suggestedUsers.length > 0 ? (
          <div className="divide-y divide-border/30">
            {suggestedUsers.map((user) => (
              <div key={user.$id} className="py-4 first:pt-0">
                <div className="flex items-start gap-3">
                  <Link href={`/profile/${user.userId}`}>
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.avatarUrl} />
                      <AvatarFallback className="bg-linear-to-br from-primary to-accent text-white text-sm">
                        {user.displayName?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <Link href={`/profile/${user.userId}`}>
                        <p className="font-semibold text-[15px] hover:underline">
                          {user.username}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {user.displayName}
                        </p>
                      </Link>
                      <button
                        onClick={() => handleFollow(user.userId)}
                        className={`px-5 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                          user.isFollowing
                            ? 'bg-transparent border border-border text-foreground hover:bg-secondary/50'
                            : 'bg-foreground text-background hover:bg-foreground/90'
                        }`}
                      >
                        {user.isFollowing ? 'Following' : 'Follow'}
                      </button>
                    </div>
                    {user.bio && (
                      <p className="text-[15px] text-foreground mt-1 line-clamp-2">
                        {user.bio}
                      </p>
                    )}
                    {user.followersCount !== undefined && (
                      <p className="text-sm text-muted-foreground mt-1">
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
            <SearchIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Search for users</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <AuthGuard>
      <SearchContent />
    </AuthGuard>
  );
}

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

function MoreHorizontalIcon({ className }: { className?: string }) {
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
        d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
      />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
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
        d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
      />
    </svg>
  );
}
