/**
 * ReplyItem Component
 * Displays a single reply in the thread detail page
 *
 * Features:
 * - Compact mobile-first layout
 * - Author info
 * - Timestamp
 * - Content display
 * - Optional image support
 * - Reply to comment functionality
 * - @mention support
 */

'use client';

import { ThreadWithAuthor } from '@/types/appwrite';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface ReplyItemProps {
  reply: ThreadWithAuthor;
  onReplyToComment?: (
    username: string,
    displayName: string,
    replyId: string,
  ) => void;
  isNested?: boolean;
}

export function ReplyItem({
  reply,
  onReplyToComment,
  isNested = false,
}: ReplyItemProps) {
  const { author, content, createdAt, imageUrl, replyToUsername } = reply;
  const [imageOpen, setImageOpen] = useState(false);

  // Format timestamp
  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true });

  // Get author initials
  const authorInitials = author.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Check if this reply is to another comment (has replyToUsername)
  // Also fallback to detecting @mention at start of content for older replies
  const getReplyingTo = (): string | null => {
    if (replyToUsername && replyToUsername.trim()) {
      return replyToUsername;
    }
    // Fallback: detect @mention at start of content
    const mentionMatch = content?.match(/^@(\w+)\s/);
    if (mentionMatch) {
      return mentionMatch[1];
    }
    return null;
  };

  const replyingTo = getReplyingTo();

  return (
    <div
      className={`p-4 hover:bg-secondary/30 transition-colors ${isNested ? 'ml-6' : ''}`}
    >
      <div className="flex gap-3">
        {/* Author Avatar - Smaller for replies */}
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={author.avatarUrl} alt={author.displayName} />
          <AvatarFallback className="text-xs">{authorInitials}</AvatarFallback>
        </Avatar>

        {/* Reply Content */}
        <div className="flex-1 min-w-0">
          {/* Header - TikTok style: username > repliedTo */}
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className="font-semibold text-sm truncate">
              {author.displayName}
            </span>
            {replyingTo && (
              <>
                <span className="text-xs text-muted-foreground">›</span>
                <span className="text-xs text-primary font-medium">
                  @{replyingTo}
                </span>
              </>
            )}
            <span className="text-xs text-muted-foreground flex-shrink-0">
              ·
            </span>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {timeAgo}
            </span>
          </div>

          {/* Content Text */}
          {content && (
            <p className="text-sm whitespace-pre-wrap break-words mb-2">
              {content}
            </p>
          )}

          {/* Image if present */}
          {imageUrl && imageUrl.trim().length > 0 && (
            <button
              onClick={() => setImageOpen(true)}
              className="block mt-2 rounded-xl overflow-hidden border border-border/50 hover:border-border transition-colors max-w-sm"
            >
              <Image
                src={imageUrl}
                alt={reply.altText || 'Reply image'}
                width={400}
                height={400}
                className="w-full h-auto object-cover"
                unoptimized
              />
            </button>
          )}

          {/* Actions - like and reply */}
          <div className="flex items-center gap-4 mt-2">
            <button className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <HeartIcon className="w-4 h-4" />
              <span>{reply.likeCount || 0}</span>
            </button>
            <button
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              onClick={() =>
                onReplyToComment?.(
                  author.username,
                  author.displayName,
                  reply.$id,
                )
              }
            >
              <ReplyIcon className="w-4 h-4" />
              <span>Reply</span>
            </button>
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {imageUrl && (
        <Dialog open={imageOpen} onOpenChange={setImageOpen}>
          <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
            <DialogTitle className="sr-only">Image</DialogTitle>
            <DialogDescription className="sr-only">
              Full size image viewer
            </DialogDescription>
            <button
              onClick={() => setImageOpen(false)}
              className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
              aria-label="Close"
            >
              <XIcon className="w-5 h-5 text-white" />
            </button>
            <div className="relative w-full h-[90vh] flex items-center justify-center p-4">
              <Image
                src={imageUrl}
                alt={reply.altText || 'Reply image'}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Icons
function HeartIcon({ className }: { className?: string }) {
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
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
    </svg>
  );
}

function ReplyIcon({ className }: { className?: string }) {
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
        d="M3 10h10a5 5 0 015 5v6M3 10l6 6M3 10l6-6"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

// Small curved arrow icon to indicate a reply connection
function ReplyIndicatorIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 17l-5-5 5-5M4 12h11a4 4 0 014 4v4"
      />
    </svg>
  );
}
