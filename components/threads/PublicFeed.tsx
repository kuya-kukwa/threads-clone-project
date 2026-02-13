'use client';

/**
 * PublicFeed Component
 * Displays paginated list of threads
 *
 * Features:
 * - Cursor-based pagination
 * - "Load More" button (mobile-friendly)
 * - Loading states
 * - Empty state
 * - Error handling
 * - Like status integration
 *
 * Performance:
 * - No refetch loops
 * - Predictable loading
 * - Smooth scrolling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { FeedResponse } from '@/types/appwrite';
import { ThreadCard, ThreadWithLikeStatus } from './ThreadCard';
import { FeedSkeleton, ThreadsSpinner } from '@/components/skeletons';
import { getErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger/logger';
import { getSessionToken } from '@/lib/appwriteClient';

interface PublicFeedProps {
  initialThreads?: ThreadWithLikeStatus[];
  initialNextCursor?: string | null;
  initialHasMore?: boolean;
  refreshKey?: number;
}

export function PublicFeed({
  initialThreads = [],
  initialNextCursor = null,
  initialHasMore = false,
  refreshKey = 0,
}: PublicFeedProps) {
  const [threads, setThreads] =
    useState<ThreadWithLikeStatus[]>(initialThreads);
  const [nextCursor, setNextCursor] = useState<string | null>(
    initialNextCursor,
  );
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(
    initialThreads.length === 0,
  );
  const [error, setError] = useState<string | null>(null);

  // Initial load if no threads provided, or re-fetch when refreshKey changes
  useEffect(() => {
    loadThreads();
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadThreads = useCallback(async (cursor?: string) => {
    try {
      if (cursor) {
        setIsLoading(true);
      } else {
        setIsInitialLoading(true);
      }
      setError(null);

      const params = new URLSearchParams();
      if (cursor) {
        params.append('cursor', cursor);
      }
      params.append('limit', '20');

      // Include session token to get like status
      const sessionToken = getSessionToken();
      const headers: Record<string, string> = {};
      if (sessionToken) {
        headers['x-session-id'] = sessionToken;
      }

      const response = await fetch(`/api/feed?${params.toString()}`, {
        credentials: 'include',
        headers,
        cache: 'no-store',
      });
      const data: FeedResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load feed');
      }

      if (cursor) {
        // Append to existing threads
        setThreads((prev) => [...prev, ...(data.threads || [])]);
      } else {
        // Initial load or refresh
        setThreads(data.threads || []);
      }

      setNextCursor(data.nextCursor || null);
      setHasMore(data.hasMore || false);

      logger.debug({
        msg: 'Feed loaded',
        threadCount: data.threads?.length || 0,
        hasMore: data.hasMore,
      });
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      logger.error({ msg: 'Failed to load feed', error: errorMessage });
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  }, []);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Infinite scroll — auto-load when sentinel enters viewport
  useEffect(() => {
    if (!hasMore || isLoading || isInitialLoading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !isLoading) {
          loadThreads(nextCursor);
        }
      },
      { threshold: 0.1, rootMargin: '200px' },
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading, isInitialLoading, nextCursor, loadThreads]);

  // Initial loading state - use professional skeleton
  if (isInitialLoading) {
    return <FeedSkeleton count={5} />;
  }

  // Empty state
  if (!isInitialLoading && threads.length === 0 && !error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-4xl mb-4">🧵</div>
        <h3 className="text-lg font-semibold mb-2 text-white">
          No threads yet
        </h3>
        <p className="text-sm text-[#777] max-w-sm">
          Be the first to share something! Create a thread to get the
          conversation started.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Thread list */}
      <div>
        {threads.map((thread) => (
          <ThreadCard key={thread.$id} thread={thread} />
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 text-center">
          <div className="text-sm text-red-400 bg-red-500/10 p-3 rounded-xl inline-block">
            {error}
          </div>
          <div className="mt-2">
            <button
              onClick={() => loadThreads(nextCursor || undefined)}
              className="text-sm text-blue-400 hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Infinite scroll sentinel + spinner */}
      <div ref={loadMoreRef} className="py-6">
        {!error && isLoading && threads.length > 0 && (
          <div className="flex justify-center">
            <ThreadsSpinner size="md" className="text-[#555]" />
          </div>
        )}
        {!error && !hasMore && threads.length > 0 && (
          <p className="text-center text-sm text-[#777]">
            You&apos;re all caught up!
          </p>
        )}
      </div>
    </div>
  );
}
