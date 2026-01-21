'use client';

/**
 * ThreadCard Component
 * Displays a single thread in the feed
 *
 * Mobile-First Design:
 * - Single column layout
 * - Comfortable spacing
 * - Touch-friendly
 * - Images never overflow
 * - Clean typography
 *
 * Structure (Threads-inspired):
 * - Avatar + Name + Username
 * - Content (with line breaks preserved)
 * - Optional image
 * - Timestamp
 */

import { ThreadWithAuthor } from '@/types/appwrite';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

interface ThreadCardProps {
  thread: ThreadWithAuthor;
}

export function ThreadCard({ thread }: ThreadCardProps) {
  const { author, content, imageUrl, altText, createdAt } = thread;

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

          {/* Image */}
          {imageUrl && imageUrl.trim().length > 0 && (
            <div className={content && content.trim().length > 0 ? 'mt-2' : ''}>
              <img
                src={imageUrl}
                alt={altText || 'Thread image'}
                className="max-w-full h-auto rounded-lg border"
                loading="lazy"
              />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
