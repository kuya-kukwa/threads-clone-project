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
 *
 * Performance:
 * - No refetch loops
 * - Predictable loading
 * - Smooth scrolling
 */

import { useState, useEffect } from 'react';
import { ThreadWithAuthor, FeedResponse } from '@/types/appwrite';
import { ThreadCard } from './ThreadCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger/logger';

interface PublicFeedProps {
  initialThreads?: ThreadWithAuthor[];
  initialNextCursor?: string | null;
  initialHasMore?: boolean;
}

export function PublicFeed({
  initialThreads = [],
  initialNextCursor = null,
  initialHasMore = false,
}: PublicFeedProps) {
  const [threads, setThreads] = useState<ThreadWithAuthor[]>(initialThreads);
  const [nextCursor, setNextCursor] = useState<string | null>(
    initialNextCursor,
  );
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(
    initialThreads.length === 0,
  );
  const [error, setError] = useState<string | null>(null);

  // Initial load if no threads provided
  useEffect(() => {
    if (initialThreads.length === 0) {
      loadThreads();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadThreads = async (cursor?: string) => {
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

      const response = await fetch(`/api/feed?${params.toString()}`);
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
  };

  const handleLoadMore = () => {
    if (nextCursor && !isLoading) {
      loadThreads(nextCursor);
    }
  };

  // Initial loading state
  if (isInitialLoading) {
    return (
      <div className="space-y-4 p-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (!isInitialLoading && threads.length === 0 && !error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-4xl mb-4">🧵</div>
        <h3 className="text-lg font-semibold mb-2">No threads yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
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
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md inline-block">
            {error}
          </div>
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadThreads(nextCursor || undefined)}
            >
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Load more button */}
      {!error && hasMore && (
        <div className="p-4 text-center border-t">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}

      {/* End of feed message */}
      {!error && !hasMore && threads.length > 0 && (
        <div className="p-4 text-center text-sm text-muted-foreground border-t">
          You&apos;ve reached the end
        </div>
      )}
    </div>
  );
}
