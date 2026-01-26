/**
 * Thread Detail Page
 * Displays a single thread with its replies
 *
 * Features:
 * - Thread detail with author info
 * - Reply composer
 * - Paginated replies list
 * - Mobile-first layout
 * - Error handling (404, deleted, etc.)
 * - Skeleton loaders
 *
 * Route: /thread/[id]
 */

'use client';

import { use, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ThreadCard } from '@/components/threads/ThreadCard';
import {
  ReplyComposer,
  ReplyComposerHandle,
} from '@/components/threads/ReplyComposer';
import { ReplyList } from '@/components/threads/ReplyList';
import { ThreadWithAuthor } from '@/types/appwrite';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface ThreadDetailPageProps {
  params: Promise<{ id: string }>;
}

function ThreadDetailContent({ threadId }: { threadId: string }) {
  const router = useRouter();
  const [thread, setThread] = useState<ThreadWithAuthor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [replyRefreshTrigger, setReplyRefreshTrigger] = useState(0);
  const replyComposerRef = useRef<ReplyComposerHandle>(null);

  // Fetch thread detail
  const fetchThread = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setNotFound(false);

      const response = await fetch(`/api/threads/${threadId}`);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setNotFound(true);
          return;
        }
        throw new Error(data.error || 'Failed to load thread');
      }

      if (!data.success || !data.data) {
        throw new Error('Invalid response format');
      }

      setThread(data.data);
    } catch (err) {
      console.error('Error fetching thread:', err);
      setError(err instanceof Error ? err.message : 'Failed to load thread');
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  // Handle reply created - refresh replies list
  const handleReplyCreated = () => {
    setReplyRefreshTrigger((prev) => prev + 1);
    // Also refresh thread to update reply count
    fetchThread();
  };

  // Handle replying to a comment - set @mention in composer
  const handleReplyToComment = (username: string, displayName: string, replyId: string) => {
    replyComposerRef.current?.setReplyTo({ username, displayName, replyId });
  };

  // Inline thread loading skeleton - shown inside the layout
  const ThreadSkeleton = () => (
    <div className="p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-6 w-24" />
    </div>
  );

  // Error state - only show after we've tried loading and have a non-recoverable error
  if (error && !loading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        {/* Header - Mobile */}
        <div className="sticky top-0 z-40 bg-[#121212] border-b border-border/50 md:hidden">
          <div className="flex items-center h-12 px-4">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors"
              aria-label="Back"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold ml-2">Thread</h1>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 py-20">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircleIcon className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Error Loading Thread</h1>
            <p className="text-muted-foreground mb-6">
              {error || 'Something went wrong. Please try again.'}
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={fetchThread} variant="default">
                Retry
              </Button>
              <Button onClick={() => router.push('/feed')} variant="outline">
                Back to Feed
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main layout - always render immediately for smooth transitions
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header - Mobile */}
      <div className="sticky top-0 z-40 bg-[#121212] border-b border-border/50 md:hidden">
        <div className="flex items-center h-12 px-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Back"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold ml-2">Thread</h1>
        </div>
      </div>

      {/* Header - Desktop */}
      <div className="hidden md:block sticky top-12 z-40 bg-background border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Back"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Thread</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto">
        {/* Original Thread - Show skeleton while loading, then thread content */}
        <div className="border-b border-border/50">
          {loading ? (
            <ThreadSkeleton />
          ) : notFound ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                <SearchOffIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Thread Not Found</h2>
              <p className="text-muted-foreground mb-4">
                This thread doesn&apos;t exist or has been deleted.
              </p>
              <Button
                onClick={() => router.push('/feed')}
                variant="default"
                size="sm"
              >
                Back to Feed
              </Button>
            </div>
          ) : thread ? (
            <ThreadCard thread={thread} />
          ) : null}
        </div>

        {/* Reply Composer - Only show when thread is loaded */}
        {thread && (
          <div className="border-b border-border/50">
            <ReplyComposer
              ref={replyComposerRef}
              threadId={threadId}
              onReplyCreated={handleReplyCreated}
            />
          </div>
        )}

        {/* Replies List - Only show when thread is loaded */}
        {thread && (
          <ReplyList
            threadId={threadId}
            refreshTrigger={replyRefreshTrigger}
            onReplyToComment={handleReplyToComment}
          />
        )}
      </div>
    </div>
  );
}

// Icons
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function SearchOffIcon({ className }: { className?: string }) {
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
        d="M3 3l18 18M21 21l-4.35-4.35M9.5 9.5a3 3 0 014.5 4.5m-2.5 5.5a6 6 0 01-6-6 6 6 0 016-6"
      />
      <circle cx="11" cy="11" r="8" />
    </svg>
  );
}

function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <circle cx="12" cy="12" r="10" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4M12 16h.01"
      />
    </svg>
  );
}

export default function ThreadDetailPage({ params }: ThreadDetailPageProps) {
  const resolvedParams = use(params);

  return (
    <AuthGuard>
      <ThreadDetailContent threadId={resolvedParams.id} />
    </AuthGuard>
  );
}
