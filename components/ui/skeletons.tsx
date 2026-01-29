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
export function ThreadCardSkeleton() {
  return (
    <div className="p-4 border-b border-border/50">
      <div className="flex gap-3">
        {/* Avatar */}
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
        
        <div className="flex-1 space-y-3">
          {/* Header - name and time */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          
          {/* Content lines */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          
          {/* Media placeholder (randomly show or not) */}
          <Skeleton className="h-48 w-full rounded-xl" />
          
          {/* Action buttons */}
          <div className="flex gap-4 pt-2">
            <Skeleton className="h-8 w-16 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
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
 * Matches the ProfileCard component layout
 */
export function ProfileCardSkeleton() {
  return (
    <div className="space-y-4">
      {/* Profile header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="w-20 h-20 rounded-full" />
      </div>
      
      {/* Bio */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      
      {/* Stats */}
      <div className="flex gap-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
      
      {/* Action button */}
      <Skeleton className="h-10 w-full rounded-lg" />
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
        <Skeleton className="w-11 h-11 rounded-full" />
        <Skeleton className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full" />
      </div>
      
      {/* Content */}
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-16" />
      </div>
      
      {/* Action button */}
      <Skeleton className="h-8 w-16 rounded-lg flex-shrink-0" />
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
 */
export function MediaGridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-1">
      {[...Array(9)].map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-lg" />
      ))}
    </div>
  );
}

/**
 * Feed Skeleton
 * Multiple thread cards for initial feed loading
 */
export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div>
      {[...Array(count)].map((_, i) => (
        <ThreadCardSkeleton key={i} />
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
