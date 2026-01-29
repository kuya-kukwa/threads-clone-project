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
 * Refactored: Uses sub-components for better maintainability
 * - MediaGallery: Swipeable media carousel
 * - MediaLightbox: Full-screen media viewer
 * - LikeButton: Like/unlike with optimistic updates
 * - ActionButton: Reusable action buttons
 */

import { ThreadWithAuthor, MediaItem as MediaItemType } from '@/types/appwrite';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

// Import sub-components
import { SwipeableMediaGallery } from './MediaGallery';
import { MediaLightbox } from './MediaLightbox';
import { LikeButton } from './LikeButton';
import { ActionButton } from './ActionButton';
import { CommentIcon, RepostIcon, ShareIcon } from './icons';

export interface ThreadWithLikeStatus extends ThreadWithAuthor {
  isLiked?: boolean;
}

interface ThreadCardProps {
  thread: ThreadWithLikeStatus;
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

export function ThreadCard({ thread }: ThreadCardProps) {
  const router = useRouter();
  const { author, content, createdAt } = thread;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

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

  // Handle media click - open lightbox
  const handleMediaClick = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  // Handle comment button click - navigate to thread detail (comment section)
  const handleCommentClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    router.push(`/thread/${thread.$id}`);
  };

  return (
    <>
      <article className="border-b border-border/50 p-4 hover:bg-card/50 transition-colors animate-fade-in">
        <div className="flex gap-3">
          {/* Avatar */}
          <Avatar className="w-10 h-10 flex-shrink-0 ring-2 ring-border/50">
            <AvatarImage
              src={author.avatarUrl || undefined}
              alt={author.displayName}
            />
            <AvatarFallback className="text-sm bg-secondary text-secondary-foreground">
              {authorInitials}
            </AvatarFallback>
          </Avatar>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Author info */}
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-semibold text-sm truncate text-foreground">
                {author.displayName}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                @{author.username}
              </span>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                 {timeAgo}
              </span>
            </div>

            {/* Thread content - only render if has content */}
            {content && content.trim().length > 0 && (
              <div className="text-sm whitespace-pre-wrap break-words mb-3 text-foreground/90 leading-relaxed">
                {content}
              </div>
            )}

            {/* Media Gallery - TikTok Style Swipeable */}
            {mediaItems.length > 0 && (
              <div
                className={content && content.trim().length > 0 ? '' : 'mt-1'}
              >
                <SwipeableMediaGallery
                  items={mediaItems}
                  onItemClick={handleMediaClick}
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-6 mt-3 -ml-2">
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

      {/* Lightbox Modal - key forces re-mount when opened to reset index */}
      <MediaLightbox
        key={lightboxOpen ? `lightbox-${lightboxIndex}` : 'closed'}
        items={mediaItems}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        initialIndex={lightboxIndex}
      />
    </>
  );
}
