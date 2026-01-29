/**
 * useFeed Hook
 * Optimized feed fetching with in-memory caching
 * 
 * Features:
 * - In-memory cache to prevent refetching on tab switches
 * - Cursor-based pagination
 * - Background refresh without showing loading state
 * - Instant display of cached data
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ThreadWithLikeStatus } from '@/components/threads/ThreadCard';
import { getSessionToken } from '@/lib/appwriteClient';
import { logger } from '@/lib/logger/logger';

interface FeedResponse {
  success: boolean;
  threads: ThreadWithLikeStatus[];
  nextCursor: string | null;
  hasMore: boolean;
  error?: string;
}

interface FeedState {
  threads: ThreadWithLikeStatus[];
  nextCursor: string | null;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
}

// Simple in-memory cache - survives component remounts but not page refreshes
const feedCache = new Map<string, {
  threads: ThreadWithLikeStatus[];
  nextCursor: string | null;
  hasMore: boolean;
  timestamp: number;
}>();

const CACHE_TTL = 60 * 1000; // 1 minute cache validity

function getCacheKey(type: 'for-you' | 'following'): string {
  return `feed-${type}`;
}

export function useFeed(type: 'for-you' | 'following' = 'for-you') {
  const cacheKey = getCacheKey(type);
  const cached = feedCache.get(cacheKey);
  const isCacheValid = cached && (Date.now() - cached.timestamp < CACHE_TTL);
  
  const [state, setState] = useState<FeedState>(() => ({
    threads: isCacheValid ? cached.threads : [],
    nextCursor: isCacheValid ? cached.nextCursor : null,
    hasMore: isCacheValid ? cached.hasMore : true,
    isLoading: !isCacheValid,
    isLoadingMore: false,
    error: null,
  }));
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  const fetchFeed = useCallback(async (cursor?: string, isLoadMore = false) => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const endpoint = type === 'following' ? '/api/feed/following' : '/api/feed';
    const params = new URLSearchParams({ limit: '20' });
    if (cursor) params.append('cursor', cursor);

    try {
      const sessionToken = getSessionToken();
      const headers: Record<string, string> = {};
      if (sessionToken) headers['x-session-id'] = sessionToken;

      const response = await fetch(`${endpoint}?${params}`, {
        credentials: 'include',
        headers,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Feed fetch failed: ${response.status}`);
      }

      const data: FeedResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load feed');
      }

      if (isMountedRef.current) {
        setState(prev => {
          const newThreads = isLoadMore 
            ? [...prev.threads, ...data.threads]
            : data.threads;
          
          // Update cache
          feedCache.set(cacheKey, {
            threads: newThreads,
            nextCursor: data.nextCursor,
            hasMore: data.hasMore,
            timestamp: Date.now(),
          });

          return {
            threads: newThreads,
            nextCursor: data.nextCursor,
            hasMore: data.hasMore,
            isLoading: false,
            isLoadingMore: false,
            error: null,
          };
        });
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      
      logger.warn({ msg: 'Feed fetch error', type, error });
      
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isLoadingMore: false,
          error: error instanceof Error ? error.message : 'Failed to load feed',
        }));
      }
    }
  }, [type, cacheKey]);

  // Initial load - only if no valid cache
  useEffect(() => {
    isMountedRef.current = true;
    
    if (!isCacheValid) {
      setState(prev => ({ ...prev, isLoading: true }));
      fetchFeed();
    }

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    if (state.isLoadingMore || !state.hasMore || !state.nextCursor) return;
    
    setState(prev => ({ ...prev, isLoadingMore: true }));
    fetchFeed(state.nextCursor, true);
  }, [state.nextCursor, state.hasMore, state.isLoadingMore, fetchFeed]);

  const refresh = useCallback(() => {
    // Clear cache and refetch
    feedCache.delete(cacheKey);
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    fetchFeed();
  }, [cacheKey, fetchFeed]);

  const isEmpty = !state.isLoading && state.threads.length === 0;

  return {
    threads: state.threads,
    isLoading: state.isLoading,
    isLoadingMore: state.isLoadingMore,
    error: state.error,
    hasMore: state.hasMore,
    isEmpty,
    loadMore,
    refresh,
  };
}

/**
 * Clear all feed caches - useful after posting a new thread
 */
export function clearFeedCache(): void {
  feedCache.clear();
}
