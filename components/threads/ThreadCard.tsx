'use client';

/**
 * ThreadCard Component
 * Displays a single thread in the feed with TikTok-style swipeable media gallery
 *
 * Mobile-First Design:
 * - Horizontal swipe to navigate media (touch gestures)
 * - Dot indicators at bottom
 * - Subtle glass backdrop instead of black
 * - Play/pause overlay for videos
 * - Professional animations
 * - Like/unlike functionality
 *
 * Performance Patterns (like Threads/Twitter):
 * - Prefetches thread detail on hover/pointer down
 * - Uses sub-components for better maintainability
 * - MediaGallery: Swipeable media carousel
 * - MediaLightbox: Full-screen media viewer
 * - LikeButton: Like/unlike with optimistic updates
 * - ActionButton: Reusable action buttons
 */

import { ThreadWithAuthor, MediaItem as MediaItemType } from '@/types/appwrite';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import React, { useMemo, useState, useCallback } from 'react';
import { usePrefetchThread } from '@/hooks';

// Import sub-components
import { SwipeableMediaGallery } from './MediaGallery';
import { MediaLightbox } from './MediaLightbox';
import { LikeButton } from './LikeButton';
import { ActionButton } from './ActionButton';
import { CommentIcon, RepostIcon, ShareIcon } from './icons';
import { LocationIcon } from '@/components/icons/ThreadsIcons';

export interface ThreadWithLikeStatus extends ThreadWithAuthor {
  isLiked?: boolean;
}

interface ThreadCardProps {
  thread: ThreadWithLikeStatus;
}

/**
 * Renders content with @mentions highlighted and clickable
 */
function RenderContent({
  content,
  onMentionClick,
}: {
  content: string;
  onMentionClick: (username: string) => void;
}) {
  const parts = useMemo(() => {
    // Match @username patterns (alphanumeric + underscore, 1-30 chars)
    const regex = /@([a-zA-Z0-9_]{1,30})/g;
    const result: { type: 'text' | 'mention'; value: string }[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        result.push({
          type: 'text',
          value: content.slice(lastIndex, match.index),
        });
      }
      result.push({ type: 'mention', value: match[1] });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      result.push({ type: 'text', value: content.slice(lastIndex) });
    }

    return result;
  }, [content]);

  return (
    <>
      {parts.map((part, i) =>
        part.type === 'mention' ? (
          <span
            key={i}
            className="text-blue-400 hover:text-blue-300 cursor-pointer hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              onMentionClick(part.value);
            }}
          >
            @{part.value}
          </span>
        ) : (
          <span key={i}>{part.value}</span>
        ),
      )}
    </>
  );
}

/**
 * Parse media from thread document
 * Handles both new multi-media format and legacy single image format
 */
function parseThreadMedia(thread: ThreadWithLikeStatus): MediaItemType[] {
  const media: MediaItemType[] = [];

  // Try to parse new multi-media format first
  if (thread.mediaIds && thread.mediaIds.length > 0) {
    try {
      const ids = JSON.parse(thread.mediaIds) as string[];
      const urls = thread.mediaUrls
        ? (JSON.parse(thread.mediaUrls) as string[])
        : [];
      const types = thread.mediaTypes
        ? (JSON.parse(thread.mediaTypes) as string[])
        : [];
      const altTexts = thread.mediaAltTexts
        ? (JSON.parse(thread.mediaAltTexts) as string[])
        : [];

      for (let i = 0; i < ids.length; i++) {
        media.push({
          id: ids[i],
          url: urls[i] || '',
          type: (types[i] as 'image' | 'video') || 'image',
          altText: altTexts[i] || undefined,
        });
      }

      return media;
    } catch {
      // Failed to parse, fall through to legacy format
    }
  }

  // Fall back to legacy single image format
  if (thread.imageId && thread.imageId.trim().length > 0 && thread.imageUrl) {
    media.push({
      id: thread.imageId,
      url: thread.imageUrl,
      type: 'image',
      altText: thread.altText || undefined,
    });
  }

  return media;
}

export const ThreadCard = React.memo(function ThreadCard({
  thread,
}: ThreadCardProps) {
  const router = useRouter();
  const { author, content, createdAt } = thread;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Prefetch thread detail on hover/pointer down for instant navigation
  const { prefetchProps } = usePrefetchThread(thread.$id);

  // Parse media items
  const mediaItems = useMemo(() => parseThreadMedia(thread), [thread]);

  // Format timestamp
  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true });

  // Get author initials for avatar fallback
  const authorInitials = author.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Handle media click - open lightbox (NOT navigate to thread)
  const handleMediaClick = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  // Handle mention click - navigate to user profile
  const handleMentionClick = useCallback(
    (username: string) => {
      router.push(`/search?q=${encodeURIComponent(username)}`);
    },
    [router],
  );

  // Handle comment button click - navigate to thread detail (comment section)
  const handleCommentClick = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      router.push(`/thread/${thread.$id}`);
    },
    [router, thread.$id],
  );

  // Handle card click - navigate to thread detail
  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      // Don't navigate if clicking on interactive elements
      const target = e.target as HTMLElement;
      if (
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[data-no-navigate]')
      ) {
        return;
      }
      router.push(`/thread/${thread.$id}`);
    },
    [router, thread.$id],
  );

  return (
    <>
      <article
        className="border-b border-white/[0.08] px-4 py-3 hover:bg-white/[0.03] transition-colors animate-fade-in cursor-pointer"
        onClick={handleCardClick}
        {...prefetchProps}
      >
        <div className="flex gap-3">
          {/* Avatar */}
          <Avatar className="w-9 h-9 sm:w-10 sm:h-10 shrink-0">
            <AvatarImage
              src={author.avatarUrl || undefined}
              alt={author.displayName}
            />
            <AvatarFallback className="text-sm bg-[#333] text-white font-semibold">
              {authorInitials}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Author info */}
            <div className="flex items-baseline gap-1.5 sm:gap-2 mb-0.5 min-w-0">
              <span className="font-semibold text-[15px] leading-tight tracking-[-0.02em] truncate text-white">
                {author.displayName}
              </span>
              <span className="text-[13px] text-[#777] truncate hidden xs:inline">
                @{author.username}
              </span>
              <span className="text-[13px] text-[#777] shrink-0">
                {timeAgo}
              </span>
            </div>

            {/* Thread content - only render if has content */}
            {content && content.trim().length > 0 && (
              <div className="text-[15px] whitespace-pre-wrap wrap-break-word mb-2 text-[#f3f5f7] leading-[1.45]">
                <RenderContent
                  content={content}
                  onMentionClick={handleMentionClick}
                />
              </div>
            )}

            {/* Topic & Location tags */}
            {(thread.topic || thread.location) && (
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {thread.topic && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[13px] text-blue-400 bg-blue-500/10 hover:bg-blue-500/15 transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(
                        `/search?tab=topics&q=${encodeURIComponent(thread.topic!)}`,
                      );
                    }}
                  >
                    {thread.topic}
                  </span>
                )}
                {thread.location && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[13px] text-[#999] bg-white/[0.06] hover:bg-white/[0.10] transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(
                        `/search?tab=topics&q=${encodeURIComponent(thread.location!)}`,
                      );
                    }}
                  >
                    <LocationIcon className="w-3.5 h-3.5" />
                    {thread.location}
                  </span>
                )}
              </div>
            )}

            {/* Audience indicator */}
            {thread.audience && thread.audience !== 'anyone' && (
              <div className="flex items-center gap-1.5 mb-2 text-[12px] text-[#666]">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  {thread.audience === 'followers' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 10-2.636 6.364M16.5 12V8.25" />
                  )}
                </svg>
                <span>{thread.audience === 'followers' ? 'Followers only' : 'Mentioned only'}</span>
              </div>
            )}

            {/* Media Gallery - TikTok Style Swipeable */}
            {mediaItems.length > 0 && (
              <div
                data-no-navigate
                className={`-mx-4 px-4 sm:mx-0 sm:px-0 mt-2 ${content && content.trim().length > 0 ? '' : 'mt-1'}`}
                onClick={(e) => e.stopPropagation()}
              >
                <SwipeableMediaGallery
                  items={mediaItems}
                  onItemClick={handleMediaClick}
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-4 sm:gap-6 mt-2 -ml-2">
              <LikeButton
                threadId={thread.$id}
                initialIsLiked={thread.isLiked || false}
                initialLikeCount={thread.likeCount || 0}
              />
              <ActionButton
                icon={<CommentIcon />}
                label="Reply"
                count={thread.replyCount || 0}
                onClick={handleCommentClick}
              />
              <ActionButton icon={<RepostIcon />} label="Repost" />
              <ActionButton icon={<ShareIcon />} label="Share" />
            </div>
          </div>
        </div>
      </article>

      {/* Full-screen media viewer */}
      <MediaLightbox
        items={mediaItems}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        initialIndex={lightboxIndex}
      />
    </>
  );
});

ThreadCard.displayName = 'ThreadCard';
