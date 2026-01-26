/**
 * ReplyList Component
 * Displays paginated list of replies for a thread with TikTok-style nested replies
 *
 * Features:
 * - Cursor-based pagination
 * - Lazy loading
 * - Skeleton loaders
 * - Error handling
 * - Empty state
 * - Mobile-first layout
 * - TikTok-style nested replies with "View X replies" collapsible UI
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ThreadWithAuthor } from '@/types/appwrite';
import { ReplyItem } from './ReplyItem';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface ReplyListProps {
  threadId: string;
  refreshTrigger?: number; // Change this to trigger refresh
  onReplyToComment?: (
    username: string,
    displayName: string,
    replyId: string,
  ) => void;
}

// Group replies into parent and child relationships
interface GroupedReplies {
  parentReplies: ThreadWithAuthor[];
  childRepliesByParent: Map<string, ThreadWithAuthor[]>;
}

export function ReplyList({
  threadId,
  refreshTrigger = 0,
  onReplyToComment,
}: ReplyListProps) {
  const [replies, setReplies] = useState<ThreadWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(
    new Set(),
  );

  // Fetch replies
  const fetchReplies = useCallback(
    async (cursor?: string | null) => {
      try {
        if (cursor) {
          setLoadingMore(true);
        } else {
          setLoading(true);
          setReplies([]); // Clear on refresh
        }
        setError(null);

        const url = new URL(
          `/api/threads/${threadId}/replies`,
          window.location.origin,
        );
        if (cursor) {
          url.searchParams.set('cursor', cursor);
        }
        url.searchParams.set('limit', '50'); // Fetch more to include nested replies

        const response = await fetch(url.toString());
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load replies');
        }

        if (!data.success || !data.data) {
          throw new Error('Invalid response format');
        }

        const {
          replies: newReplies,
          nextCursor: newCursor,
          hasMore: more,
        } = data.data;

        setReplies((prev) => (cursor ? [...prev, ...newReplies] : newReplies));
        setNextCursor(newCursor);
        setHasMore(more);
      } catch (err) {
        console.error('Error fetching replies:', err);
        setError(err instanceof Error ? err.message : 'Failed to load replies');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [threadId],
  );

  // Group replies by parent
  const groupedReplies = useMemo((): GroupedReplies => {
    const parentReplies: ThreadWithAuthor[] = [];
    const childRepliesByParent = new Map<string, ThreadWithAuthor[]>();

    replies.forEach((reply) => {
      const parentReplyId = reply.parentReplyId;

      if (parentReplyId && parentReplyId.trim()) {
        // This is a child reply (nested)
        const existing = childRepliesByParent.get(parentReplyId) || [];
        existing.push(reply);
        childRepliesByParent.set(parentReplyId, existing);
      } else {
        // This is a top-level reply
        parentReplies.push(reply);
      }
    });

    return { parentReplies, childRepliesByParent };
  }, [replies]);

  // Toggle expanded state for a reply
  const toggleExpanded = (replyId: string) => {
    setExpandedReplies((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(replyId)) {
        newSet.delete(replyId);
      } else {
        newSet.add(replyId);
      }
      return newSet;
    });
  };

  // Initial load and refresh on trigger change
  useEffect(() => {
    fetchReplies();
  }, [fetchReplies, refreshTrigger]);

  // Load more replies
  const handleLoadMore = () => {
    if (nextCursor && !loadingMore) {
      fetchReplies(nextCursor);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4">
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-center">
          <p className="text-sm text-destructive mb-3">{error}</p>
          <Button onClick={() => fetchReplies()} variant="outline" size="sm">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Empty state
  if (replies.length === 0) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-secondary flex items-center justify-center">
            <MessageSquareIcon className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-sm mb-1">No replies yet</p>
          <p className="text-xs text-muted-foreground">
            Be the first to reply to this thread
          </p>
        </div>
      </div>
    );
  }

  const { parentReplies, childRepliesByParent } = groupedReplies;

  // Replies list with nested structure
  return (
    <div className="divide-y divide-border/50">
      {/* Parent Replies */}
      {parentReplies.map((reply) => {
        const childReplies = childRepliesByParent.get(reply.$id) || [];
        const hasChildReplies = childReplies.length > 0;
        const isExpanded = expandedReplies.has(reply.$id);

        return (
          <div key={reply.$id}>
            {/* Parent Reply */}
            <ReplyItem reply={reply} onReplyToComment={onReplyToComment} />

            {/* View Replies Button - TikTok style */}
            {hasChildReplies && !isExpanded && (
              <button
                onClick={() => toggleExpanded(reply.$id)}
                className="flex items-center gap-2 ml-14 mb-3 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <div className="w-6 h-px bg-muted-foreground/30" />
                <span className="font-medium">
                  View {childReplies.length}{' '}
                  {childReplies.length === 1 ? 'reply' : 'replies'}
                </span>
                <ChevronDownIcon className="w-3 h-3" />
              </button>
            )}

            {/* Nested Replies - Only show when expanded */}
            {hasChildReplies && isExpanded && (
              <div>
                {childReplies.map((childReply) => (
                  <ReplyItem
                    key={childReply.$id}
                    reply={childReply}
                    onReplyToComment={onReplyToComment}
                    isNested
                  />
                ))}

                {/* Hide Replies Button */}
                <button
                  onClick={() => toggleExpanded(reply.$id)}
                  className="flex items-center gap-2 ml-12 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronUpIcon className="w-3 h-3" />
                  <span>Hide replies</span>
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Load More Button */}
      {hasMore && (
        <div className="p-4 text-center">
          <Button
            onClick={handleLoadMore}
            disabled={loadingMore}
            variant="outline"
            size="sm"
            className="min-w-32"
          >
            {loadingMore ? (
              <>
                <LoadingSpinner className="w-4 h-4 mr-2" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// Icons
function MessageSquareIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
      />
    </svg>
  );
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={`${className} animate-spin`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  );
}
