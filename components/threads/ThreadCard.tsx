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
 * - Video support with play/pause overlay
 * - Lightbox for full-screen viewing
 * - Clean typography
 *
 * UX Features:
 * - Click to expand images in lightbox
 * - Centered play button on videos
 * - Swipe through media in lightbox
 * - Double-tap to like (future)
 */

import { ThreadWithAuthor, MediaItem as MediaItemType } from '@/types/appwrite';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import { useMemo, useState, useRef, useCallback, useEffect } from 'react';

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

  return (
    <>
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
                <MediaGallery items={mediaItems} onItemClick={handleMediaClick} />
              </div>
            )}
          </div>
        </div>
      </article>

      {/* Lightbox Modal */}
      <MediaLightbox
        items={mediaItems}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        initialIndex={lightboxIndex}
      />
    </>
  );
}

/**
 * Media Gallery Component
 * Displays images and videos in a responsive grid
 */
function MediaGallery({
  items,
  onItemClick,
}: {
  items: MediaItemType[];
  onItemClick: (index: number) => void;
}) {
  if (items.length === 0) return null;

  // Single item - full width
  if (items.length === 1) {
    return (
      <SingleMediaItem
        item={items[0]}
        size="large"
        onClick={() => onItemClick(0)}
      />
    );
  }

  // Two items - side by side
  if (items.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
        {items.map((item, index) => (
          <SingleMediaItem
            key={item.id || index}
            item={item}
            size="medium"
            onClick={() => onItemClick(index)}
          />
        ))}
      </div>
    );
  }

  // Three items - one large, two small
  if (items.length === 3) {
    return (
      <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
        <div className="row-span-2">
          <SingleMediaItem
            item={items[0]}
            size="large"
            className="h-full"
            onClick={() => onItemClick(0)}
          />
        </div>
        <SingleMediaItem
          item={items[1]}
          size="small"
          onClick={() => onItemClick(1)}
        />
        <SingleMediaItem
          item={items[2]}
          size="small"
          onClick={() => onItemClick(2)}
        />
      </div>
    );
  }

  // Four items - 2x2 grid
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
      {items.slice(0, 4).map((item, index) => (
        <SingleMediaItem
          key={item.id || index}
          item={item}
          size="small"
          onClick={() => onItemClick(index)}
        />
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
  onClick,
}: {
  item: MediaItemType;
  size: 'small' | 'medium' | 'large';
  className?: string;
  onClick?: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const sizeClasses = {
    small: 'h-[150px]',
    medium: 'h-[200px]',
    large: 'max-h-[400px]',
  };

  const handleVideoClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  }, [isPlaying]);

  const handleVideoEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  if (item.type === 'video') {
    return (
      <div
        className={`relative group cursor-pointer ${className}`}
        onClick={handleVideoClick}
      >
        <video
          ref={videoRef}
          src={item.url}
          className={`w-full object-cover border rounded-lg ${sizeClasses[size]}`}
          preload="metadata"
          aria-label={item.altText || 'Video'}
          onEnded={handleVideoEnded}
          playsInline
          loop
        />
        
        {/* Play/Pause Overlay */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity ${
            isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
          }`}
        >
          <div className="w-16 h-16 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm">
            {isPlaying ? (
              <PauseIcon className="w-8 h-8 text-white" />
            ) : (
              <PlayIcon className="w-8 h-8 text-white ml-1" />
            )}
          </div>
        </div>

        {/* Video badge */}
        <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
          🎬 Video
        </span>

        {/* Expand button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          className="absolute bottom-2 right-2 p-2 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
          aria-label="View fullscreen"
        >
          <ExpandIcon className="w-4 h-4 text-white" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`relative group cursor-pointer ${className}`}
      onClick={onClick}
    >
      <Image
        src={item.url}
        alt={item.altText || 'Thread image'}
        width={600}
        height={400}
        className={`w-full object-cover ${sizeClasses[size]} ${size === 'large' ? 'rounded-lg border' : ''} transition-transform`}
        loading="lazy"
      />
      
      {/* Expand overlay on hover */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
        <div className="w-10 h-10 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
          <ExpandIcon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

/**
 * Media Lightbox Component
 * Full-screen media viewer with navigation
 */
function MediaLightbox({
  items,
  isOpen,
  onClose,
  initialIndex,
}: {
  items: MediaItemType[];
  isOpen: boolean;
  onClose: () => void;
  initialIndex: number;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Reset index when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  const currentItem = items[currentIndex];
  const hasMultiple = items.length > 1;

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  }, [items.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
  }, [items.length]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'Escape') onClose();
    },
    [goToPrevious, goToNext, onClose]
  );

  if (!currentItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none"
        onKeyDown={handleKeyDown}
      >
        <DialogTitle className="sr-only">Media viewer</DialogTitle>
        
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
          onClick={onClose}
        >
          <CloseIcon className="w-6 h-6" />
        </Button>

        {/* Navigation arrows */}
        {hasMultiple && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20"
              onClick={goToPrevious}
            >
              <ChevronLeftIcon className="w-8 h-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20"
              onClick={goToNext}
            >
              <ChevronRightIcon className="w-8 h-8" />
            </Button>
          </>
        )}

        {/* Media content */}
        <div className="flex items-center justify-center w-full h-[80vh]">
          {currentItem.type === 'video' ? (
            <video
              ref={videoRef}
              src={currentItem.url}
              className="max-w-full max-h-full object-contain"
              controls
              autoPlay
              playsInline
              aria-label={currentItem.altText || 'Video'}
            />
          ) : (
            <Image
              src={currentItem.url}
              alt={currentItem.altText || 'Image'}
              width={1200}
              height={800}
              className="max-w-full max-h-full object-contain"
              priority
            />
          )}
        </div>

        {/* Dots indicator */}
        {hasMultiple && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {items.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-white' : 'bg-white/40'
                }`}
                onClick={() => setCurrentIndex(index)}
                aria-label={`Go to media ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Counter */}
        {hasMultiple && (
          <div className="absolute top-4 left-4 text-white text-sm bg-black/40 px-3 py-1 rounded-full">
            {currentIndex + 1} / {items.length}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Icon Components
function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
