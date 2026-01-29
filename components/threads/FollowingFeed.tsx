'use client';

/**
 * Following Feed Component
 * Shows threads from users the current user follows
 * Features:
 * - Cursor-based pagination
 * - Like status integration
 * - Empty state for when not following anyone
 * - Skeleton loading
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { ThreadCard, ThreadWithLikeStatus } from './ThreadCard';
import { ThreadCardSkeleton } from '@/components/ui/skeletons';

interface FollowingFeedResponse {
  success: boolean;
  threads: ThreadWithLikeStatus[];
  nextCursor: string | null;
  hasMore: boolean;
  followingCount?: number;
}

export function FollowingFeed() {
  const [threads, setThreads] = useState<ThreadWithLikeStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [followingCount, setFollowingCount] = useState<number | null>(null);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Fetch following feed
  const fetchFeed = useCallback(async (cursor?: string) => {
    try {
      const params = new URLSearchParams();
      params.append('limit', '10');
      if (cursor) params.append('cursor', cursor);

      const response = await fetch(`/api/feed/following?${params}`, {
        credentials: 'include',
      });

      const data: FollowingFeedResponse = await response.json();

      if (!data.success) {
        throw new Error('Failed to fetch following feed');
      }

      if (data.followingCount !== undefined) {
        setFollowingCount(data.followingCount);
      }

      if (cursor) {
        setThreads((prev) => [...prev, ...data.threads]);
      } else {
        setThreads(data.threads);
      }

      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed');
    }
  }, []);

  // Initial load
  useEffect(() => {
    setIsLoading(true);
    fetchFeed().finally(() => setIsLoading(false));
  }, [fetchFeed]);

  // Load more
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !nextCursor) return;

    setIsLoadingMore(true);
    await fetchFeed(nextCursor);
    setIsLoadingMore(false);
  }, [hasMore, isLoadingMore, nextCursor, fetchFeed]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [loadMore, hasMore, isLoadingMore]);

  // Loading state
  if (isLoading) {
    return (
      <div className="divide-y divide-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <ThreadCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <ErrorIcon className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
        <p className="text-muted-foreground text-sm mb-4">{error}</p>
        <button
          onClick={() => {
            setError(null);
            setIsLoading(true);
            fetchFeed().finally(() => setIsLoading(false));
          }}
          className="text-sm text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // Not following anyone
  if (followingCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <UsersIcon className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold mb-2">Start following people</h2>
        <p className="text-muted-foreground text-sm">
          When you follow someone, their posts will show up here.
          <br />
          Find people to follow in the search or explore the For You feed.
        </p>
      </div>
    );
  }

  // No posts from people you follow
  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <EmptyIcon className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold mb-2">No posts yet</h2>
        <p className="text-muted-foreground text-sm">
          People you follow haven&apos;t posted anything yet.
          <br />
          Check back later!
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {threads.map((thread) => (
        <ThreadCard key={thread.$id} thread={thread} />
      ))}

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="py-4">
        {isLoadingMore && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        )}
        {!hasMore && threads.length > 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">
            You&apos;re all caught up!
          </p>
        )}
      </div>
    </div>
  );
}

// Icons
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

function EmptyIcon({ className }: { className?: string }) {
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
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
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
        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
      />
    </svg>
  );
}
