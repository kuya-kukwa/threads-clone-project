'use client';

/**
 * Streaming Components
 * 
 * React Suspense boundaries for streaming content like big social apps.
 * Pattern: Load content in layers, never block the whole page.
 * 
 * 1. Page shell (instant)
 * 2. Main content (fast) 
 * 3. Replies/comments (lazy)
 * 4. Media (deferred)
 */

import { Suspense, ReactNode, ComponentType, lazy } from 'react';
import { 
  FeedSkeleton, 
  ThreadDetailSkeleton, 
  ProfileHeaderSkeleton,
  ReplyListSkeleton,
  ThreadCardSkeleton
} from '@/components/skeletons';

interface StreamingBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  /** Optional key to force remount */
  suspenseKey?: string;
}

/**
 * Generic streaming boundary
 */
export function StreamingBoundary({ 
  children, 
  fallback,
  suspenseKey 
}: StreamingBoundaryProps) {
  return (
    <Suspense key={suspenseKey} fallback={fallback}>
      {children}
    </Suspense>
  );
}

/**
 * Feed streaming boundary
 */
export function FeedStreamingBoundary({ children }: { children: ReactNode }) {
  return (
    <StreamingBoundary fallback={<FeedSkeleton count={5} />}>
      {children}
    </StreamingBoundary>
  );
}

/**
 * Thread detail streaming boundary
 */
export function ThreadStreamingBoundary({ children }: { children: ReactNode }) {
  return (
    <StreamingBoundary fallback={<ThreadDetailSkeleton />}>
      {children}
    </StreamingBoundary>
  );
}

/**
 * Profile streaming boundary
 */
export function ProfileStreamingBoundary({ children }: { children: ReactNode }) {
  return (
    <StreamingBoundary fallback={<ProfileHeaderSkeleton />}>
      {children}
    </StreamingBoundary>
  );
}

/**
 * Replies streaming boundary - loads after main thread
 */
export function RepliesStreamingBoundary({ children }: { children: ReactNode }) {
  return (
    <StreamingBoundary fallback={<ReplyListSkeleton count={3} />}>
      {children}
    </StreamingBoundary>
  );
}

/**
 * Single thread card boundary
 */
export function ThreadCardStreamingBoundary({ children }: { children: ReactNode }) {
  return (
    <StreamingBoundary fallback={<ThreadCardSkeleton />}>
      {children}
    </StreamingBoundary>
  );
}

/**
 * Deferred component wrapper
 * Renders children after initial paint, keeping the main thread responsive
 */
interface DeferredProps {
  children: ReactNode;
  /** Delay in ms before rendering (default: 0 - next frame) */
  delay?: number;
  /** Placeholder while deferred */
  placeholder?: ReactNode;
}

export function Deferred({ children, delay = 0, placeholder = null }: DeferredProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setMounted(true);
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  if (!mounted) {
    return <>{placeholder}</>;
  }

  return <>{children}</>;
}

// Import these at the top
import { useState, useEffect, startTransition } from 'react';

/**
 * Progressive load wrapper
 * Shows content progressively as it becomes available
 */
interface ProgressiveLoadProps<T> {
  /** Data to check */
  data: T | null | undefined;
  /** Loading state */
  isLoading: boolean;
  /** Skeleton to show while loading */
  skeleton: ReactNode;
  /** Children render function */
  children: (data: T) => ReactNode;
  /** Optional error state */
  error?: Error | null;
  /** Error fallback */
  errorFallback?: (error: Error) => ReactNode;
}

export function ProgressiveLoad<T>({
  data,
  isLoading,
  skeleton,
  children,
  error,
  errorFallback,
}: ProgressiveLoadProps<T>) {
  // Show skeleton while loading
  if (isLoading && !data) {
    return <>{skeleton}</>;
  }

  // Show error if present
  if (error && errorFallback) {
    return <>{errorFallback(error)}</>;
  }

  // Show content when data is available
  if (data) {
    return <>{children(data)}</>;
  }

  // Fallback to skeleton
  return <>{skeleton}</>;
}

/**
 * Lazy load component with automatic code splitting
 */
export function createLazyComponent<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallback: ReactNode = null
): ComponentType<P> {
  const LazyComponent = lazy(importFn);

  return function LazyWrapper(props: P) {
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

/**
 * Intersection observer-based lazy loader
 * Only loads content when it enters the viewport
 */
interface LazyWhenVisibleProps {
  children: ReactNode;
  /** Fallback shown before visible */
  fallback?: ReactNode;
  /** Root margin for intersection observer */
  rootMargin?: string;
  /** Threshold for intersection */
  threshold?: number;
  /** Keep mounted after first load */
  keepMounted?: boolean;
}

export function LazyWhenVisible({
  children,
  fallback = null,
  rootMargin = '200px',
  threshold = 0,
  keepMounted = true,
}: LazyWhenVisibleProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startTransition(() => {
              setIsVisible(true);
              setHasBeenVisible(true);
            });
            if (keepMounted) {
              observer.disconnect();
            }
          } else if (!keepMounted) {
            setIsVisible(false);
          }
        });
      },
      { rootMargin, threshold }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin, threshold, keepMounted]);

  const shouldRender = keepMounted ? hasBeenVisible : isVisible;

  return (
    <div ref={ref} className="contents">
      {shouldRender ? children : fallback}
    </div>
  );
}

// Need useRef
import { useRef } from 'react';

/**
 * Media lazy loader - loads images/videos only when visible
 */
interface LazyMediaProps {
  children: ReactNode;
  /** Placeholder (usually a blurred preview or skeleton) */
  placeholder?: ReactNode;
}

export function LazyMedia({ children, placeholder }: LazyMediaProps) {
  return (
    <LazyWhenVisible 
      fallback={placeholder} 
      rootMargin="100px"
      keepMounted
    >
      {children}
    </LazyWhenVisible>
  );
}
