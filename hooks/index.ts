/**
 * Hooks Index
 * Central export for all custom hooks
 * Maintains clean imports throughout the application
 */

// Auth hooks
export { useCurrentUser } from './useCurrentUser';
export { useAuth } from './useAuth';
export { useOptimisticAuth, useMaybeAuthenticated } from './useOptimisticAuth';

// Data fetching hooks
export { useFeed, clearFeedCache } from './useFeed';

// Prefetching hooks
export { 
  usePrefetch, 
  usePrefetchThread, 
  usePrefetchProfile,
  usePrefetchLink,
  prefetchData,
  getPrefetchedData,
  clearPrefetchCache 
} from './usePrefetch';

// Optimistic mutation hooks
export { 
  useOptimisticMutation,
  useOptimisticLike,
  useOptimisticFollow,
  useOptimisticPost 
} from './useOptimisticMutation';