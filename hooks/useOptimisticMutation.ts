'use client';

/**
 * useOptimisticMutation Hook
 * 
 * Provides optimistic updates with automatic rollback on failure.
 * Used by Threads/Twitter for instant feedback on:
 * - Likes
 * - Posts
 * - Follows
 * - Deletes
 * 
 * Pattern:
 * 1. Update UI immediately (optimistic)
 * 2. Send request in background
 * 3. Sync with server response OR rollback on error
 */

import { useState, useCallback, useRef, startTransition } from 'react';
import { logger } from '@/lib/logger/logger';
import { getSessionToken } from '@/lib/appwriteClient';

type MutationStatus = 'idle' | 'pending' | 'success' | 'error';

interface MutationOptions<TData, TVariables, TContext> {
  /** Async function to perform the mutation */
  mutationFn: (variables: TVariables) => Promise<TData>;
  
  /** Called before mutation - return context for rollback */
  onMutate?: (variables: TVariables) => TContext | Promise<TContext>;
  
  /** Called on success */
  onSuccess?: (data: TData, variables: TVariables, context: TContext) => void;
  
  /** Called on error - use context for rollback */
  onError?: (error: Error, variables: TVariables, context: TContext) => void;
  
  /** Called after mutation settles (success or error) */
  onSettled?: (data: TData | undefined, error: Error | undefined, variables: TVariables, context: TContext) => void;
}

interface MutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  status: MutationStatus;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  data: TData | null;
  reset: () => void;
}

/**
 * Generic optimistic mutation hook
 */
export function useOptimisticMutation<TData = unknown, TVariables = void, TContext = unknown>(
  options: MutationOptions<TData, TVariables, TContext>
): MutationResult<TData, TVariables> {
  const [status, setStatus] = useState<MutationStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TData | null>(null);
  const contextRef = useRef<TContext | null>(null);

  const reset = useCallback(() => {
    startTransition(() => {
      setStatus('idle');
      setError(null);
      setData(null);
      contextRef.current = null;
    });
  }, []);

  const mutateAsync = useCallback(async (variables: TVariables): Promise<TData> => {
    startTransition(() => {
      setStatus('pending');
      setError(null);
    });

    // Execute onMutate for optimistic update
    let context: TContext | undefined;
    try {
      if (options.onMutate) {
        context = await options.onMutate(variables);
        contextRef.current = context ?? null;
      }
    } catch (err) {
      logger.error({ msg: 'onMutate failed', error: err });
    }

    try {
      // Perform actual mutation
      const result = await options.mutationFn(variables);
      
      startTransition(() => {
        setData(result);
        setStatus('success');
      });

      // Call success handler
      if (options.onSuccess) {
        options.onSuccess(result, variables, context as TContext);
      }

      // Call settled handler
      if (options.onSettled) {
        options.onSettled(result, undefined, variables, context as TContext);
      }

      return result;
    } catch (err) {
      const mutationError = err instanceof Error ? err : new Error(String(err));
      
      startTransition(() => {
        setError(mutationError);
        setStatus('error');
      });

      // Call error handler for rollback
      if (options.onError) {
        options.onError(mutationError, variables, context as TContext);
      }

      // Call settled handler
      if (options.onSettled) {
        options.onSettled(undefined, mutationError, variables, context as TContext);
      }

      throw mutationError;
    }
  }, [options]);

  const mutate = useCallback((variables: TVariables) => {
    mutateAsync(variables).catch(() => {
      // Error is already handled by onError callback
    });
  }, [mutateAsync]);

  return {
    mutate,
    mutateAsync,
    status,
    isLoading: status === 'pending',
    isSuccess: status === 'success',
    isError: status === 'error',
    error,
    data,
    reset,
  };
}

/**
 * Optimistic Like Hook
 * Provides instant like/unlike with automatic rollback
 */
export function useOptimisticLike(
  threadId: string,
  initialLiked: boolean,
  initialCount: number
) {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);

  const mutation = useOptimisticMutation<
    { liked: boolean; likeCount: number },
    void,
    { wasLiked: boolean; prevCount: number }
  >({
    mutationFn: async () => {
      const sessionToken = getSessionToken();
      const response = await fetch(`/api/threads/${threadId}/like`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'true',
          ...(sessionToken && { 'x-session-id': sessionToken }),
        },
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to like');
      }
      return { liked: data.liked, likeCount: data.likeCount };
    },

    onMutate: () => {
      // Save previous state for rollback
      const wasLiked = isLiked;
      const prevCount = likeCount;

      // Optimistic update
      startTransition(() => {
        setIsLiked(!wasLiked);
        setLikeCount(wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1);
      });

      return { wasLiked, prevCount };
    },

    onSuccess: (data) => {
      // Sync with server state
      startTransition(() => {
        setIsLiked(data.liked);
        setLikeCount(data.likeCount);
      });
    },

    onError: (_error, _variables, context) => {
      // Rollback to previous state
      if (context) {
        startTransition(() => {
          setIsLiked(context.wasLiked);
          setLikeCount(context.prevCount);
        });
      }
      logger.warn({ msg: 'Like failed, rolled back', threadId });
    },
  });

  return {
    isLiked,
    likeCount,
    toggle: mutation.mutate,
    isLoading: mutation.isLoading,
  };
}

/**
 * Optimistic Follow Hook
 */
export function useOptimisticFollow(
  profileId: string,
  initialFollowing: boolean
) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);

  const mutation = useOptimisticMutation<
    { isFollowing: boolean },
    void,
    { wasFollowing: boolean }
  >({
    mutationFn: async () => {
      const sessionToken = getSessionToken();
      const method = isFollowing ? 'DELETE' : 'POST';
      
      const response = await fetch(`/api/profile/${profileId}/follow`, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'true',
          ...(sessionToken && { 'x-session-id': sessionToken }),
        },
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update follow');
      }
      return { isFollowing: data.isFollowing };
    },

    onMutate: () => {
      const wasFollowing = isFollowing;
      startTransition(() => {
        setIsFollowing(!wasFollowing);
      });
      return { wasFollowing };
    },

    onSuccess: (data) => {
      startTransition(() => {
        setIsFollowing(data.isFollowing);
      });
    },

    onError: (_error, _variables, context) => {
      if (context) {
        startTransition(() => {
          setIsFollowing(context.wasFollowing);
        });
      }
      logger.warn({ msg: 'Follow failed, rolled back', profileId });
    },
  });

  return {
    isFollowing,
    toggle: mutation.mutate,
    isLoading: mutation.isLoading,
  };
}

/**
 * Optimistic Post Creation Hook
 * Shows post immediately, then confirms with server
 */
interface OptimisticPost {
  id: string;
  content: string;
  isPending: boolean;
  error?: string;
}

interface PostData {
  content: string;
  media?: Array<{ id: string; url: string; type: 'image' | 'video'; altText?: string }>;
}

export function useOptimisticPost(onSuccess?: () => void) {
  const [pendingPosts, setPendingPosts] = useState<OptimisticPost[]>([]);

  const mutation = useOptimisticMutation<
    { thread: { $id: string } },
    PostData,
    { tempId: string }
  >({
    mutationFn: async (data) => {
      const sessionToken = getSessionToken();
      if (!sessionToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/threads', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'true',
          'x-session-id': sessionToken,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to create post');
      }
      return result;
    },

    onMutate: (data) => {
      // Create temporary post
      const tempId = `temp_${Date.now()}`;
      startTransition(() => {
        setPendingPosts((prev) => [
          { id: tempId, content: data.content, isPending: true },
          ...prev,
        ]);
      });
      return { tempId };
    },

    onSuccess: (_data, _variables, context) => {
      // Remove from pending
      startTransition(() => {
        setPendingPosts((prev) => prev.filter((p) => p.id !== context.tempId));
      });
      onSuccess?.();
    },

    onError: (error, _variables, context) => {
      // Mark as failed
      startTransition(() => {
        setPendingPosts((prev) =>
          prev.map((p) =>
            p.id === context.tempId
              ? { ...p, isPending: false, error: error.message }
              : p
          )
        );
      });
    },
  });

  const removePending = useCallback((id: string) => {
    startTransition(() => {
      setPendingPosts((prev) => prev.filter((p) => p.id !== id));
    });
  }, []);

  return {
    post: mutation.mutate,
    postAsync: mutation.mutateAsync,
    pendingPosts,
    removePending,
    isPosting: mutation.isLoading,
  };
}
