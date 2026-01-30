'use client';

/**
 * Skeleton Components
 *
 * Professional skeleton loaders that match the exact layout of real content.
 * Key principle: Skeletons should be indistinguishable from content shape.
 *
 * Pattern used by Threads/Twitter/Instagram:
 * - Render skeleton in <16ms (no layout shift)
 * - Match exact dimensions of real content
 * - Subtle pulse animation (not distracting)
 * - Use CSS containment for paint optimization
 */

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * ThreadCardSkeleton
 * Matches ThreadCard layout exactly
 */
export function ThreadCardSkeleton({ className }: { className?: string }) {
  return (
    <article
      className={cn(
        'border-b border-border/50 p-4',
        // CSS containment for performance
        'contain-layout contain-paint',
        className,
      )}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Author info line */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>

          {/* Content lines */}
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-6 mt-3">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * ThreadCardWithMediaSkeleton
 * Matches ThreadCard with media gallery
 */
export function ThreadCardWithMediaSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <article
      className={cn(
        'border-b border-border/50 p-4 contain-layout contain-paint',
        className,
      )}
    >
      <div className="flex gap-3">
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />

        <div className="flex-1 min-w-0 space-y-2">
          {/* Author info */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>

          {/* Short content */}
          <Skeleton className="h-4 w-3/4" />

          {/* Media placeholder - 16:9 aspect ratio */}
          <Skeleton className="w-full aspect-video rounded-xl mt-2" />

          {/* Actions */}
          <div className="flex items-center gap-6 mt-3">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * FeedSkeleton
 * Shows multiple thread skeletons with varied layouts
 */
export function FeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-border/50">
      {Array.from({ length: count }).map((_, i) =>
        // Alternate between text-only and media posts for realistic feel
        i % 3 === 0 ? (
          <ThreadCardWithMediaSkeleton key={i} />
        ) : (
          <ThreadCardSkeleton key={i} />
        ),
      )}
    </div>
  );
}

/**
 * ProfileHeaderSkeleton
 * Matches profile card layout
 */
export function ProfileHeaderSkeleton() {
  return (
    <div className="p-4 space-y-4 contain-layout contain-paint">
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="w-20 h-20 rounded-full" />
      </div>

      {/* Bio */}
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 flex-1" />
      </div>
    </div>
  );
}

/**
 * ReplySkeleton
 * Matches reply item layout
 */
export function ReplySkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex gap-3 p-4 contain-layout', className)}>
      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3 w-14" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

/**
 * ReplyListSkeleton
 * Multiple reply skeletons
 */
export function ReplyListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="divide-y divide-border/30">
      {Array.from({ length: count }).map((_, i) => (
        <ReplySkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * ThreadDetailSkeleton
 * Full thread page skeleton
 */
export function ThreadDetailSkeleton() {
  return (
    <div className="contain-layout">
      {/* Main thread */}
      <ThreadCardWithMediaSkeleton />

      {/* Reply composer placeholder */}
      <div className="p-4 border-b border-border/50">
        <div className="flex gap-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-20 flex-1 rounded-lg" />
        </div>
      </div>

      {/* Replies header */}
      <div className="p-4 border-b border-border/50">
        <Skeleton className="h-5 w-20" />
      </div>

      {/* Replies */}
      <ReplyListSkeleton count={3} />
    </div>
  );
}

/**
 * InlineLoadingDots
 * Subtle loading indicator for inline states
 */
export function InlineLoadingDots() {
  return (
    <span className="inline-flex gap-1 items-center">
      <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
      <span className="w-1 h-1 rounded-full bg-current animate-pulse delay-75" />
      <span className="w-1 h-1 rounded-full bg-current animate-pulse delay-150" />
    </span>
  );
}

/**
 * ShimmerOverlay
 * Can be applied over any element to show loading state
 */
export function ShimmerOverlay({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent',
        'animate-shimmer',
        className,
      )}
    />
  );
}
