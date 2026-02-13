'use client';

/**
 * Skeleton Components — Authentic Threads Loading States
 *
 * Matches the exact layout and proportions of real Threads content.
 * Uses dark shimmer effect (not bright pulse) like the official app.
 *
 * Key principles:
 * - Bone colors: #1e1e1e base with white/4% shimmer
 * - Match exact dimensions of real content (zero layout shift)
 * - Rounded corners match content elements
 * - CSS containment for paint optimization
 */

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/* ====================================================================== */
/*  Thread Card Skeleton                                                   */
/* ====================================================================== */

export function ThreadCardSkeleton({ className }: { className?: string }) {
  return (
    <article
      className={cn(
        'border-b border-white/[0.08] px-4 py-3.5',
        'contain-layout contain-paint',
        className,
      )}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <Skeleton className="w-9 h-9 rounded-full shrink-0" />

        {/* Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          {/* Author row */}
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-3.5 w-24 rounded-sm" />
            <Skeleton className="h-3 w-8 rounded-sm" />
          </div>

          {/* Text lines */}
          <div className="space-y-2 mb-3">
            <Skeleton className="h-3.5 w-full rounded-sm" />
            <Skeleton className="h-3.5 w-[85%] rounded-sm" />
          </div>

          {/* Action row */}
          <div className="flex items-center gap-3.5 mt-1">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>

          {/* Reply count */}
          <Skeleton className="h-3 w-20 rounded-sm mt-2" />
        </div>
      </div>
    </article>
  );
}

/* ====================================================================== */
/*  Thread Card with Media Skeleton                                        */
/* ====================================================================== */

export function ThreadCardWithMediaSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <article
      className={cn(
        'border-b border-white/[0.08] px-4 py-3.5 contain-layout contain-paint',
        className,
      )}
    >
      <div className="flex gap-3">
        <Skeleton className="w-9 h-9 rounded-full shrink-0" />

        <div className="flex-1 min-w-0 pt-0.5">
          {/* Author row */}
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-3.5 w-28 rounded-sm" />
            <Skeleton className="h-3 w-8 rounded-sm" />
          </div>

          {/* Short text */}
          <Skeleton className="h-3.5 w-3/4 rounded-sm mb-3" />

          {/* Media placeholder — 4:3 ratio like Threads images */}
          <Skeleton className="w-full aspect-[4/3] rounded-xl" />

          {/* Actions */}
          <div className="flex items-center gap-3.5 mt-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>

          <Skeleton className="h-3 w-16 rounded-sm mt-2" />
        </div>
      </div>
    </article>
  );
}

/* ====================================================================== */
/*  Feed Skeleton                                                          */
/* ====================================================================== */

export function FeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) =>
        i === 1 || i === 4 ? (
          <ThreadCardWithMediaSkeleton key={i} />
        ) : (
          <ThreadCardSkeleton key={i} />
        ),
      )}
    </div>
  );
}

/* ====================================================================== */
/*  Profile Header Skeleton                                                */
/* ====================================================================== */

export function ProfileHeaderSkeleton() {
  return (
    <div className="px-4 pt-5 pb-4 space-y-4 contain-layout contain-paint">
      {/* Header row — name left, avatar right */}
      <div className="flex items-start justify-between">
        <div className="space-y-2.5 pt-1">
          <Skeleton className="h-6 w-32 rounded-sm" />
          <Skeleton className="h-4 w-24 rounded-sm" />
        </div>
        <Skeleton className="w-16 h-16 rounded-full" />
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-full rounded-sm" />
        <Skeleton className="h-3.5 w-2/3 rounded-sm" />
      </div>

      {/* Followers count */}
      <Skeleton className="h-3.5 w-28 rounded-sm" />

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-[34px] flex-1 rounded-lg" />
        <Skeleton className="h-[34px] flex-1 rounded-lg" />
      </div>
    </div>
  );
}

/* ====================================================================== */
/*  Reply Skeleton                                                         */
/* ====================================================================== */

export function ReplySkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex gap-3 px-4 py-3 contain-layout', className)}>
      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
      <div className="flex-1 pt-0.5">
        <div className="flex items-center gap-2 mb-1.5">
          <Skeleton className="h-3.5 w-20 rounded-sm" />
          <Skeleton className="h-3 w-10 rounded-sm" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-full rounded-sm" />
          <Skeleton className="h-3.5 w-1/2 rounded-sm" />
        </div>
      </div>
    </div>
  );
}

export function ReplyListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <ReplySkeleton key={i} />
      ))}
    </div>
  );
}

/* ====================================================================== */
/*  Thread Detail Skeleton                                                 */
/* ====================================================================== */

export function ThreadDetailSkeleton() {
  return (
    <div className="contain-layout">
      {/* Main thread */}
      <ThreadCardWithMediaSkeleton />

      {/* Reply composer placeholder */}
      <div className="px-4 py-3 border-b border-white/[0.08]">
        <div className="flex gap-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-10 flex-1 rounded-xl" />
        </div>
      </div>

      {/* Replies header */}
      <div className="px-4 py-3 border-b border-white/[0.08]">
        <Skeleton className="h-4 w-16 rounded-sm" />
      </div>

      {/* Replies */}
      <ReplyListSkeleton count={4} />
    </div>
  );
}

/* ====================================================================== */
/*  Search Skeleton                                                        */
/* ====================================================================== */

export function SearchResultSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="w-10 h-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-28 rounded-sm" />
        <Skeleton className="h-3 w-40 rounded-sm" />
      </div>
      <Skeleton className="h-[30px] w-[76px] rounded-lg" />
    </div>
  );
}

export function SearchListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <SearchResultSkeleton key={i} />
      ))}
    </div>
  );
}

/* ====================================================================== */
/*  Activity / Notification Skeleton                                       */
/* ====================================================================== */

export function ActivityItemSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08]">
      <Skeleton className="w-9 h-9 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-20 rounded-sm" />
          <Skeleton className="h-3 w-32 rounded-sm" />
        </div>
        <Skeleton className="h-3 w-48 rounded-sm" />
      </div>
    </div>
  );
}

export function ActivityListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <ActivityItemSkeleton key={i} />
      ))}
    </div>
  );
}

/* ====================================================================== */
/*  Threads Spinner — Authentic fading-bars spinner (iOS-style)            */
/*  Matches the real Threads/Instagram loading indicator                   */
/* ====================================================================== */

export function ThreadsSpinner({
  className,
  size = 'md',
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const barCount = 12;

  return (
    <div
      className={cn(sizes[size], 'relative', className)}
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: barCount }).map((_, i) => {
        const rotation = i * (360 / barCount);
        const delay = -(1 - i / barCount);
        return (
          <div
            key={i}
            className="absolute left-1/2 top-0 h-1/2 w-[8%] origin-bottom"
            style={{
              transform: `translateX(-50%) rotate(${rotation}deg)`,
            }}
          >
            <div
              className="w-full rounded-full bg-current"
              style={{
                height: '28%',
                animation: `threads-spinner-fade 1.2s linear infinite`,
                animationDelay: `${delay}s`,
                opacity: 0.15,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

/* ====================================================================== */
/*  Page-level Loaders                                                     */
/* ====================================================================== */

export function FullPageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <ThreadsSpinner size="lg" className="text-[#666]" />
    </div>
  );
}

export function InlineLoader({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center py-8', className)}>
      <ThreadsSpinner size="md" className="text-[#555]" />
    </div>
  );
}

/* ====================================================================== */
/*  Inline Loading Dots                                                    */
/* ====================================================================== */

export function InlineLoadingDots() {
  return (
    <span className="inline-flex gap-[3px] items-center">
      <span
        className="w-1 h-1 rounded-full bg-current animate-pulse"
        style={{ animationDelay: '0ms' }}
      />
      <span
        className="w-1 h-1 rounded-full bg-current animate-pulse"
        style={{ animationDelay: '150ms' }}
      />
      <span
        className="w-1 h-1 rounded-full bg-current animate-pulse"
        style={{ animationDelay: '300ms' }}
      />
    </span>
  );
}

/* ====================================================================== */
/*  Shimmer Overlay                                                        */
/* ====================================================================== */

export function ShimmerOverlay({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent',
        'animate-[shimmer_1.8s_ease-in-out_infinite]',
        className,
      )}
    />
  );
}

/* ====================================================================== */
/*  Pull to Refresh Indicator                                              */
/* ====================================================================== */

export function PullToRefreshIndicator({ pulling }: { pulling: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center py-3 transition-all duration-200',
        pulling ? 'opacity-100 h-10' : 'opacity-0 h-0',
      )}
    >
      <ThreadsSpinner size="sm" className="text-[#555]" />
    </div>
  );
}
