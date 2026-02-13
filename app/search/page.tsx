'use client';

/**
 * Search Page
 * Search for users and content with tabs: Users | Topics/Threads
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ThreadCard,
  ThreadWithLikeStatus,
} from '@/components/threads/ThreadCard';
import { TopicTagIcon, LocationIcon } from '@/components/icons/ThreadsIcons';
import { ThreadsSpinner } from '@/components/skeletons';
import React from 'react';

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

type SearchTab = 'users' | 'topics';

interface TrendingTopic {
  topic: string;
  count: number;
}

interface TrendingLocation {
  location: string;
  count: number;
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as SearchTab) || 'users';
  const initialQuery = searchParams.get('q') || '';

  const [activeTab, setActiveTab] = useState<SearchTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [threadResults, setThreadResults] = useState<ThreadWithLikeStatus[]>(
    [],
  );
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [trendingLocations, setTrendingLocations] = useState<
    TrendingLocation[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchingThreads, setIsSearchingThreads] = useState(false);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [recentSearches, setRecentSearches] = useState<SearchUser[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Sync tab from URL
  useEffect(() => {
    const tabParam = searchParams.get('tab') as SearchTab;
    const qParam = searchParams.get('q') || '';
    if (tabParam && tabParam !== activeTab) setActiveTab(tabParam);
    if (qParam && qParam !== searchQuery) setSearchQuery(qParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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

  // Fetch trending topics
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const response = await fetch('/api/search/topics?limit=15');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setTrendingTopics(data.topics || []);
            setTrendingLocations(data.locations || []);
          }
        }
      } catch (error) {
        console.error('Failed to fetch trending:', error);
      } finally {
        setLoadingTrending(false);
      }
    };
    fetchTrending();
  }, []);

  // Handle follow/unfollow
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
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&limit=20`,
        { credentials: 'include' },
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

  // Search threads by query (content, topic, location)
  const searchThreads = useCallback(async (query: string) => {
    if (!query || query.length < 1) {
      setThreadResults([]);
      return;
    }

    setIsSearchingThreads(true);

    try {
      const response = await fetch(
        `/api/search/threads?q=${encodeURIComponent(query)}&limit=20`,
        { credentials: 'include' },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setThreadResults(data.threads || []);
        }
      }
    } catch (error) {
      console.error('Thread search error:', error);
    } finally {
      setIsSearchingThreads(false);
    }
  }, []);

  // Search threads by exact topic
  const searchByTopic = useCallback(async (topic: string) => {
    setSearchQuery(topic);
    setActiveTab('topics');
    setIsSearchingThreads(true);

    try {
      const response = await fetch(
        `/api/search/threads?topic=${encodeURIComponent(topic)}&limit=20`,
        { credentials: 'include' },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setThreadResults(data.threads || []);
        }
      }
    } catch (error) {
      console.error('Topic search error:', error);
    } finally {
      setIsSearchingThreads(false);
    }
  }, []);

  // Trigger search on debounced query change
  useEffect(() => {
    if (activeTab === 'users') {
      searchUsers(debouncedSearchQuery);
    } else {
      searchThreads(debouncedSearchQuery);
    }
  }, [debouncedSearchQuery, activeTab, searchUsers, searchThreads]);

  const handleUserClick = useCallback(
    (user: SearchUser) => {
      const updated = [
        user,
        ...recentSearches.filter((u) => u.userId !== user.userId),
      ].slice(0, 10);
      setRecentSearches(updated);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      router.push(`/profile/${user.userId}`);
    },
    [recentSearches, router],
  );

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  }, []);

  const removeRecentSearch = useCallback((userId: string) => {
    setRecentSearches((prev) => {
      const updated = prev.filter((u) => u.userId !== userId);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleTabChange = useCallback(
    (tab: SearchTab) => {
      setActiveTab(tab);
      // Re-trigger search for new tab
      if (debouncedSearchQuery) {
        if (tab === 'users') searchUsers(debouncedSearchQuery);
        else searchThreads(debouncedSearchQuery);
      }
    },
    [debouncedSearchQuery, searchUsers, searchThreads],
  );

  // Memoized tab buttons
  const tabButtons = useMemo(
    () => (
      <div className="flex border-b border-white/[0.08]">
        <button
          onClick={() => handleTabChange('users')}
          className={`flex-1 py-3 text-[14px] font-semibold transition-colors relative ${
            activeTab === 'users' ? 'text-white' : 'text-[#777]'
          }`}
        >
          Users
          {activeTab === 'users' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
          )}
        </button>
        <button
          onClick={() => handleTabChange('topics')}
          className={`flex-1 py-3 text-[14px] font-semibold transition-colors relative ${
            activeTab === 'topics' ? 'text-white' : 'text-[#777]'
          }`}
        >
          Topics
          {activeTab === 'topics' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
          )}
        </button>
      </div>
    ),
    [activeTab, handleTabChange],
  );

  const renderContent = () => {
    if (activeTab === 'topics') {
      return (
        <TopicsContent
          searchQuery={searchQuery}
          isSearching={isSearchingThreads}
          threadResults={threadResults}
          trendingTopics={trendingTopics}
          trendingLocations={trendingLocations}
          loadingTrending={loadingTrending}
          onTopicClick={searchByTopic}
        />
      );
    }

    return (
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
    );
  };

  return (
    <div className="min-h-screen bg-black pb-20 lg:pb-0">
      {/* Desktop Content Container */}
      <div className="hidden lg:flex lg:flex-col max-w-[640px] mx-auto h-screen overflow-hidden">
        {/* Fixed Header */}
        <div className="shrink-0 pt-6 pb-2">
          <div className="flex items-center justify-center h-12 px-4 relative">
            <span className="text-[15px] font-semibold text-white">Search</span>
          </div>
        </div>

        {/* Content wrapper */}
        <div className="border border-white/[0.08] rounded-t-2xl flex-1 min-h-0 overflow-y-auto bg-[#181818] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Desktop Search Bar */}
          <div className="px-4 pt-4">
            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#777]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="w-full h-11 pl-12 pr-12 bg-[#262626] border border-white/[0.08] rounded-xl text-[15px] text-white placeholder:text-[#777] focus:outline-none focus:ring-1 focus:ring-white/[0.15] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-[#555] text-black"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="px-4 mt-3">{tabButtons}</div>

          {/* Content */}
          <div className="px-0">{renderContent()}</div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden sticky top-14 z-30 bg-black border-b border-white/[0.08]">
        <div className="max-w-[640px] mx-auto px-4 py-3">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#777]" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full h-12 pl-12 pr-12 bg-[#262626] border border-white/[0.08] rounded-2xl text-[15px] text-white placeholder:text-[#777] focus:outline-none focus:ring-1 focus:ring-white/[0.15] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-[#555] text-black"
              >
                <XIcon className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        {/* Tabs below search bar on mobile */}
        <div className="max-w-[640px] mx-auto px-4">{tabButtons}</div>
      </div>

      {/* Mobile Content */}
      <div className="lg:hidden max-w-[640px] mx-auto">{renderContent()}</div>
    </div>
  );
}

// ── Topics Content ───────────────────────────────────────
interface TopicsContentProps {
  searchQuery: string;
  isSearching: boolean;
  threadResults: ThreadWithLikeStatus[];
  trendingTopics: TrendingTopic[];
  trendingLocations: TrendingLocation[];
  loadingTrending: boolean;
  onTopicClick: (topic: string) => void;
}

const TopicsContent = React.memo(function TopicsContent({
  searchQuery,
  isSearching,
  threadResults,
  trendingTopics,
  trendingLocations,
  loadingTrending,
  onTopicClick,
}: TopicsContentProps) {
  if (isSearching) {
    return (
      <div className="flex items-center justify-center py-12">
        <ThreadsSpinner size="md" className="text-[#555]" />
      </div>
    );
  }

  if (searchQuery && threadResults.length > 0) {
    return (
      <div>
        <p className="px-4 py-3 text-[13px] text-[#777]">
          {threadResults.length} result{threadResults.length !== 1 ? 's' : ''}{' '}
          for &quot;{searchQuery}&quot;
        </p>
        {threadResults.map((thread) => (
          <ThreadCard key={thread.$id} thread={thread} />
        ))}
      </div>
    );
  }

  if (searchQuery && threadResults.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-[#777]">
          No threads found for &quot;{searchQuery}&quot;
        </p>
        <p className="text-[13px] text-[#555] mt-1">
          Try searching for a topic or keyword
        </p>
      </div>
    );
  }

  // Default: show trending topics & locations
  return (
    <div className="px-4 py-4">
      <h3 className="text-[15px] font-semibold text-white mb-3">
        Trending topics
      </h3>
      {loadingTrending ? (
        <div className="flex items-center justify-center py-8">
          <ThreadsSpinner size="md" className="text-[#555]" />
        </div>
      ) : trendingTopics.length > 0 ? (
        <div className="space-y-1">
          {trendingTopics.map((item) => (
            <button
              key={item.topic}
              onClick={() => onTopicClick(item.topic)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.06] transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center group-hover:bg-white/[0.10] transition-colors">
                <TopicTagIcon className="w-5 h-5 text-[#999]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-white truncate">
                  {item.topic}
                </p>
                <p className="text-[13px] text-[#777]">
                  {item.count} post{item.count !== 1 ? 's' : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <TopicTagIcon className="w-10 h-10 text-[#555] mx-auto mb-3" />
          <p className="text-[#777]">No trending topics yet</p>
          <p className="text-[13px] text-[#555] mt-1">
            Topics will appear as people post with them
          </p>
        </div>
      )}

      {/* Trending Locations */}
      {!loadingTrending && trendingLocations.length > 0 && (
        <div className="mt-6">
          <h3 className="text-[15px] font-semibold text-white mb-3">
            Trending locations
          </h3>
          <div className="space-y-1">
            {trendingLocations.map((item) => (
              <button
                key={item.location}
                onClick={() => onTopicClick(item.location)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.06] transition-colors text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center group-hover:bg-white/[0.10] transition-colors">
                  <LocationIcon className="w-5 h-5 text-[#999]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-white truncate">
                    {item.location}
                  </p>
                  <p className="text-[13px] text-[#777]">
                    {item.count} post{item.count !== 1 ? 's' : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

TopicsContent.displayName = 'TopicsContent';
// ── User Search Results ──────────────────────────────────

// ── User Search Results ──────────────────────────────────
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

const SearchResults = React.memo(function SearchResults({
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
        <ThreadsSpinner size="md" className="text-[#555]" />
      </div>
    );
  }

  if (searchQuery) {
    return searchResults.length > 0 ? (
      <div className="space-y-1 px-4 py-3">
        {searchResults.map((user) => (
          <button
            key={user.$id}
            onClick={() => handleUserClick(user)}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.06] transition-colors text-left"
          >
            <Avatar className="w-10 h-10 sm:w-11 sm:h-11">
              <AvatarImage src={user.avatarUrl} />
              <AvatarFallback className="bg-[#333] text-white font-semibold">
                {user.displayName?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[15px] text-white tracking-[-0.02em] truncate">
                {user.displayName}
              </p>
              <p className="text-[14px] text-[#777] truncate">
                @{user.username}
              </p>
            </div>
          </button>
        ))}
      </div>
    ) : (
      <div className="text-center py-12 px-4">
        <p className="text-[#777]">
          No users found for &quot;{searchQuery}&quot;
        </p>
      </div>
    );
  }

  // Recent Searches + Follow Suggestions
  return (
    <div className="px-4 py-3">
      {recentSearches.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-semibold text-white">Recent</h3>
            <button
              onClick={clearRecentSearches}
              className="text-[14px] text-blue-400 hover:text-blue-300"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-1">
            {recentSearches.map((user) => (
              <div
                key={user.$id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.06] transition-colors"
              >
                <Link
                  href={`/profile/${user.userId}`}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <Avatar className="w-11 h-11">
                    <AvatarImage src={user.avatarUrl} />
                    <AvatarFallback className="bg-[#333] text-white font-semibold">
                      {user.displayName?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate tracking-[-0.02em]">
                      {user.displayName}
                    </p>
                    <p className="text-[14px] text-[#777] truncate">
                      @{user.username}
                    </p>
                  </div>
                </Link>
                <button
                  onClick={() => removeRecentSearch(user.userId)}
                  className="p-2 text-[#555] hover:text-[#999]"
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
        <h3 className="text-[15px] text-[#777] mb-4">Follow suggestions</h3>
        {loadingSuggestions ? (
          <div className="flex items-center justify-center py-8">
            <ThreadsSpinner size="md" className="text-[#555]" />
          </div>
        ) : suggestedUsers.length > 0 ? (
          <div className="divide-y divide-white/[0.08]">
            {suggestedUsers.map((user) => (
              <div key={user.$id} className="py-4 first:pt-0">
                <div className="flex items-start gap-3">
                  <Link href={`/profile/${user.userId}`}>
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.avatarUrl} />
                      <AvatarFallback className="bg-[#333] text-white font-semibold text-sm">
                        {user.displayName?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <Link href={`/profile/${user.userId}`}>
                        <p className="font-semibold text-[15px] text-white hover:underline">
                          {user.username}
                        </p>
                        <p className="text-[14px] text-[#777]">
                          {user.displayName}
                        </p>
                      </Link>
                      <button
                        onClick={() => handleFollow(user.userId)}
                        className={`px-5 py-1.5 text-[14px] font-semibold rounded-lg transition-colors ${
                          user.isFollowing
                            ? 'bg-transparent border border-white/[0.15] text-white hover:bg-white/[0.06]'
                            : 'bg-white text-black hover:bg-white/90'
                        }`}
                      >
                        {user.isFollowing ? 'Following' : 'Follow'}
                      </button>
                    </div>
                    {user.bio && (
                      <p className="text-[15px] text-[#f3f5f7] mt-1 line-clamp-2">
                        {user.bio}
                      </p>
                    )}
                    {user.followersCount !== undefined && (
                      <p className="text-[14px] text-[#777] mt-1">
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
            <SearchIcon className="w-12 h-12 text-[#333] mx-auto mb-4" />
            <p className="text-[#777]">Search for users</p>
          </div>
        ) : null}
      </div>
    </div>
  );
});

SearchResults.displayName = 'SearchResults';

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
