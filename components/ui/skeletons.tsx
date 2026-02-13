/**
 * Skeleton Loading Components
 *
 * Reusable skeleton components for consistent loading states
 * across the application. Follows the app's design patterns.
 */

import { Skeleton } from '@/components/ui/skeleton';

/**
 * Thread Card Skeleton
 * Matches the ThreadCard component layout
 */
export function ThreadCardSkeleton({
  withMedia = false,
}: { withMedia?: boolean } = {}) {
  return (
    <div className="p-4 border-b border-border/50">
      <div className="flex gap-3">
        {/* Avatar */}
        <Skeleton className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex-shrink-0" />

        <div className="flex-1 min-w-0 space-y-2">
          {/* Header - name and time */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>

          {/* Content lines */}
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
          </div>

          {/* Media placeholder - only when requested */}
          {withMedia && (
            <Skeleton className="w-full aspect-video rounded-xl mt-2" />
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-4 sm:gap-6 pt-1">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Thread Card Skeleton without media
 * For compact thread lists
 */
export function ThreadCardCompactSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="flex gap-4 mt-3">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
  );
}

/**
 * Profile Card Skeleton
 * Matches the ProfileCard component layout exactly:
 * - Top: name/username left, avatar right (flex justify-between gap-4)
 * - Bio lines
 * - Follower/following stats
 * - Full-width action button
 */
export function ProfileCardSkeleton() {
  return (
    <div className="w-full">
      {/* Top section: Info left, Avatar right — matches ProfileCard flex layout */}
      <div className="flex items-start justify-between gap-4">
        {/* Left: Name and username */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <Skeleton className="h-7 w-32 sm:h-8 sm:w-40" /> {/* displayName */}
          <Skeleton className="h-4 w-24 sm:w-28" /> {/* @username */}
        </div>

        {/* Right: Avatar with ring */}
        <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 rounded-full shrink-0 ring-2 ring-border" />
      </div>

      {/* Bio — mt-3 matches ProfileCard */}
      <div className="mt-3 space-y-1.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/5" />
      </div>

      {/* Followers/Following stats — mt-2 flex gap-4 matches ProfileCard */}
      <div className="flex items-center gap-4 mt-2">
        <Skeleton className="h-4 w-24" /> {/* X followers */}
        <Skeleton className="h-4 w-24" /> {/* X following */}
      </div>

      {/* Action button — mt-4 h-10 w-full matches ProfileCard */}
      <Skeleton className="h-10 w-full rounded-lg mt-4" />
    </div>
  );
}

/**
 * Activity Item Skeleton
 * Matches the activity list item layout
 */
export function ActivityItemSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl">
      {/* Avatar with indicator */}
      <div className="relative flex-shrink-0">
        <Skeleton className="w-10 h-10 sm:w-11 sm:h-11 rounded-full" />
        <Skeleton className="absolute -bottom-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24 sm:w-32" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-16" />
      </div>

      {/* Action button */}
      <Skeleton className="h-8 w-16 rounded-lg flex-shrink-0 hidden sm:block" />
    </div>
  );
}

/**
 * Search Result Item Skeleton
 * Matches the user search result layout
 */
export function SearchResultSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      {/* Avatar */}
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />

      {/* User info */}
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

/**
 * Media Grid Skeleton
 * For the media tab in profiles
 * Responsive: 2 cols on mobile, 3 on sm+
 */
export function MediaGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
      {[...Array(9)].map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-lg" />
      ))}
    </div>
  );
}

/**
 * Feed Skeleton
 * Multiple thread cards for initial feed loading
 * Alternates between text-only and media posts for realistic feel
 */
export function FeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div>
      {[...Array(count)].map((_, i) => (
        <ThreadCardSkeleton key={i} withMedia={i % 3 === 0} />
      ))}
    </div>
  );
}

/**
 * Activity List Skeleton
 * Multiple activity items for loading state
 */
export function ActivityListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {[...Array(count)].map((_, i) => (
        <ActivityItemSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Search Results Skeleton
 * Multiple search result items for loading state
 */
export function SearchResultsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1 px-2">
      {[...Array(count)].map((_, i) => (
        <SearchResultSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Profile Threads Skeleton
 * For profile tab content loading
 */
export function ProfileThreadsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <ThreadCardCompactSkeleton key={i} />
      ))}
    </div>
  );
}
