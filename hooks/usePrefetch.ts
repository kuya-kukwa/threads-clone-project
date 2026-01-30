'use client';

/**
 * usePrefetch Hook
 * 
 * Implements aggressive prefetching patterns used by big social apps:
 * 1. Prefetch on hover (desktop)
 * 2. Prefetch on pointer down (mobile - 100ms before tap completes)
 * 3. Prefetch when visible (intersection observer)
 * 4. Prefetch on scroll pause
 * 
 * Cache Strategy:
 * - In-memory cache with TTL
 * - Deduplication of in-flight requests
 * - Automatic cleanup
 */

import { useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger/logger';

// In-memory prefetch cache
const prefetchCache = new Map<string, { data: unknown; timestamp: number }>();
const inFlightRequests = new Map<string, Promise<unknown>>();
const CACHE_TTL = 60 * 1000; // 60 seconds

interface PrefetchOptions {
  /** Prefetch on hover (desktop) */
  onHover?: boolean;
  /** Prefetch on pointer down (mobile) */
  onPointerDown?: boolean;
  /** Prefetch when element is visible */
  onVisible?: boolean;
  /** API endpoint to prefetch */
  apiEndpoint?: string;
  /** Callback when data is prefetched */
  onPrefetch?: (data: unknown) => void;
}

/**
 * Prefetch API data with deduplication and caching
 */
export async function prefetchData<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T | null> {
  // Check cache first
  const cached = prefetchCache.get(endpoint);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }

  // Check if already in flight
  const inFlight = inFlightRequests.get(endpoint);
  if (inFlight) {
    return inFlight as Promise<T | null>;
  }

  // Start new request
  const request = fetch(endpoint, {
    ...options,
    credentials: 'include',
  })
    .then(async (res) => {
      if (!res.ok) return null;
      const data = await res.json();
      
      // Cache the result
      prefetchCache.set(endpoint, { data, timestamp: Date.now() });
      inFlightRequests.delete(endpoint);
      
      logger.debug({ msg: 'Prefetched data', endpoint });
      return data;
    })
    .catch((err) => {
      inFlightRequests.delete(endpoint);
      logger.warn({ msg: 'Prefetch failed', endpoint, error: err.message });
      return null;
    });

  inFlightRequests.set(endpoint, request);
  return request;
}

/**
 * Get prefetched data from cache
 */
export function getPrefetchedData<T>(endpoint: string): T | null {
  const cached = prefetchCache.get(endpoint);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  return null;
}

/**
 * Clear prefetch cache
 */
export function clearPrefetchCache(endpoint?: string) {
  if (endpoint) {
    prefetchCache.delete(endpoint);
  } else {
    prefetchCache.clear();
  }
}

/**
 * Hook for prefetching routes and data
 */
export function usePrefetch(
  route: string,
  options: PrefetchOptions = {}
) {
  const router = useRouter();
  const prefetchedRef = useRef(false);
  const elementRef = useRef<HTMLElement | null>(null);

  const {
    onHover = true,
    onPointerDown = true,
    onVisible = false,
    apiEndpoint,
    onPrefetch,
  } = options;

  // Prefetch both route and API data
  const doPrefetch = useCallback(() => {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;

    // Prefetch Next.js route
    router.prefetch(route);

    // Prefetch API data if endpoint provided
    if (apiEndpoint) {
      prefetchData(apiEndpoint).then((data) => {
        if (data && onPrefetch) {
          onPrefetch(data);
        }
      });
    }
  }, [route, router, apiEndpoint, onPrefetch]);

  // Event handlers
  const handleMouseEnter = useCallback(() => {
    if (onHover) doPrefetch();
  }, [onHover, doPrefetch]);

  const handlePointerDown = useCallback(() => {
    if (onPointerDown) doPrefetch();
  }, [onPointerDown, doPrefetch]);

  const handleFocus = useCallback(() => {
    doPrefetch();
  }, [doPrefetch]);

  // Intersection observer for visibility-based prefetch
  useEffect(() => {
    if (!onVisible || !elementRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            doPrefetch();
            observer.disconnect();
          }
        });
      },
      { rootMargin: '100px' } // Prefetch when 100px away from viewport
    );

    observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, [onVisible, doPrefetch]);

  return {
    ref: elementRef,
    prefetchProps: {
      onMouseEnter: handleMouseEnter,
      onPointerDown: handlePointerDown,
      onFocus: handleFocus,
    },
    prefetch: doPrefetch,
  };
}

/**
 * Hook for prefetching thread detail
 */
export function usePrefetchThread(threadId: string) {
  return usePrefetch(`/thread/${threadId}`, {
    apiEndpoint: `/api/threads/${threadId}`,
    onHover: true,
    onPointerDown: true,
  });
}

/**
 * Hook for prefetching profile
 */
export function usePrefetchProfile(profileId: string) {
  return usePrefetch(`/profile/${profileId}`, {
    apiEndpoint: `/api/profile/${profileId}`,
    onHover: true,
    onPointerDown: true,
  });
}

/**
 * PrefetchLink Component
 * Link wrapper that prefetches on hover/pointer down
 */
export function usePrefetchLink(href: string, apiEndpoint?: string) {
  const { prefetchProps, ref } = usePrefetch(href, {
    onHover: true,
    onPointerDown: true,
    apiEndpoint,
  });

  return { prefetchProps, ref };
}
