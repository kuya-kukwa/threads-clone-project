'use client';

/**
 * ThreadCard Component
 * Displays a single thread in the feed with multi-media support
 *
 * Mobile-First Design:
 * - Single column layout
 * - Comfortable spacing
 * - Touch-friendly
 * - Media gallery with grid layout
 * - Video support with controls
 * - Clean typography
 *
 * Structure (Threads-inspired):
 * - Avatar + Name + Username
 * - Content (with line breaks preserved)
 * - Optional media gallery (images/videos)
 * - Timestamp
 */

import { ThreadWithAuthor, MediaItem as MediaItemType } from '@/types/appwrite';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import { useMemo } from 'react';

interface ThreadCardProps {
  thread: ThreadWithAuthor;
}

/**
 * Parse media from thread document
 * Handles both new multi-media format and legacy single image format
 */
function parseThreadMedia(thread: ThreadWithAuthor): MediaItemType[] {
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
  const { author, content, createdAt } = thread;

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

  return (
    <article className="border-b p-4 hover:bg-muted/50 transition-colors">
      <div className="flex gap-3">
        {/* Avatar */}
        <Avatar className="w-10 h-10 flex-shrink-0">
          <AvatarImage
            src={author.avatarUrl || undefined}
            alt={author.displayName}
          />
          <AvatarFallback className="text-sm">{authorInitials}</AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Author info */}
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-semibold text-sm truncate">
              {author.displayName}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              @{author.username}
            </span>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              · {timeAgo}
            </span>
          </div>

          {/* Thread content - only render if has content */}
          {content && content.trim().length > 0 && (
            <div className="text-sm whitespace-pre-wrap break-words mb-2">
              {content}
            </div>
          )}

          {/* Media Gallery */}
          {mediaItems.length > 0 && (
            <div
              className={`${content && content.trim().length > 0 ? 'mt-2' : ''}`}
            >
              <MediaGallery items={mediaItems} />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * Media Gallery Component
 * Displays images and videos in a responsive grid
 */
function MediaGallery({ items }: { items: MediaItemType[] }) {
  if (items.length === 0) return null;

  // Single item - full width
  if (items.length === 1) {
    return <SingleMediaItem item={items[0]} size="large" />;
  }

  // Two items - side by side
  if (items.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
        {items.map((item, index) => (
          <SingleMediaItem key={item.id || index} item={item} size="medium" />
        ))}
      </div>
    );
  }

  // Three items - one large, two small
  if (items.length === 3) {
    return (
      <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
        <div className="row-span-2">
          <SingleMediaItem item={items[0]} size="large" className="h-full" />
        </div>
        <SingleMediaItem item={items[1]} size="small" />
        <SingleMediaItem item={items[2]} size="small" />
      </div>
    );
  }

  // Four items - 2x2 grid
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
      {items.slice(0, 4).map((item, index) => (
        <SingleMediaItem key={item.id || index} item={item} size="small" />
      ))}
    </div>
  );
}

/**
 * Single Media Item Component
 * Renders either an image or video with appropriate styling
 */
function SingleMediaItem({
  item,
  size,
  className = '',
}: {
  item: MediaItemType;
  size: 'small' | 'medium' | 'large';
  className?: string;
}) {
  const sizeClasses = {
    small: 'h-[150px]',
    medium: 'h-[200px]',
    large: 'max-h-[400px]',
  };

  if (item.type === 'video') {
    return (
      <div className={`relative ${className}`}>
        <video
          src={item.url}
          className={`w-full object-cover border rounded-lg ${sizeClasses[size]}`}
          controls
          preload="metadata"
          aria-label={item.altText || 'Video'}
        />
        <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
          🎬 Video
        </span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Image
        src={item.url}
        alt={item.altText || 'Thread image'}
        width={600}
        height={400}
        className={`w-full object-cover ${sizeClasses[size]} ${size === 'large' ? 'rounded-lg border' : ''}`}
        loading="lazy"
      />
    </div>
  );
}
