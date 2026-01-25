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
 */

import { ThreadWithAuthor, MediaItem as MediaItemType } from '@/types/appwrite';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useRef, useCallback, TouchEvent } from 'react';

interface ThreadCardProps {
  thread: ThreadWithAuthor;
  /** If true, clicking the card navigates to thread detail */
  clickable?: boolean;
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

export function ThreadCard({ thread, clickable = true }: ThreadCardProps) {
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

  // Handle card click - navigate to thread detail
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('[role="button"]') ||
      target.closest('video')
    ) {
      return;
    }
    
    // Don't navigate if already on thread detail page or not clickable
    if (!clickable || window.location.pathname.startsWith('/thread/')) {
      return;
    }
    
    router.push(`/thread/${thread.$id}`);
  };

  return (
    <>
      <article 
        onClick={handleCardClick}
        className={`border-b border-border/50 p-4 hover:bg-card/50 transition-colors animate-fade-in ${clickable ? 'cursor-pointer' : ''}`}
      >
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
                · {timeAgo}
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
              <ActionButton icon={<HeartIcon />} label="Like" count={thread.likeCount || 0} />
              <ActionButton icon={<CommentIcon />} label="Reply" count={thread.replyCount || 0} />
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

/**
 * Action Button Component
 */
function ActionButton({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <button
      className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors p-2 rounded-full hover:bg-primary/10"
      aria-label={label}
    >
      <span className="w-5 h-5">{icon}</span>
      {count !== undefined && count > 0 && (
        <span className="text-xs">{count}</span>
      )}
    </button>
  );
}

/**
 * TikTok-Style Swipeable Media Gallery
 * - Horizontal scroll with snap
 * - Touch gestures
 * - Dot indicators
 */
function SwipeableMediaGallery({
  items,
  onItemClick,
}: {
  items: MediaItemType[];
  onItemClick: (index: number) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Handle scroll to update current index
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const scrollPosition = container.scrollLeft;
    const itemWidth = container.offsetWidth;
    const newIndex = Math.round(scrollPosition / itemWidth);
    setCurrentIndex(Math.max(0, Math.min(newIndex, items.length - 1)));
  }, [items.length]);

  // Touch handlers for swipe detection
  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!containerRef.current) return;
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentIndex < items.length - 1) {
        // Swipe left - go next
        scrollToIndex(currentIndex + 1);
      } else if (diff < 0 && currentIndex > 0) {
        // Swipe right - go previous
        scrollToIndex(currentIndex - 1);
      }
    }
  };

  const scrollToIndex = (index: number) => {
    if (!containerRef.current) return;
    const itemWidth = containerRef.current.offsetWidth;
    containerRef.current.scrollTo({
      left: itemWidth * index,
      behavior: 'smooth',
    });
  };

  // Single item - no carousel needed
  if (items.length === 1) {
    return (
      <SingleMediaItem
        item={items[0]}
        onClick={() => onItemClick(0)}
        size="large"
      />
    );
  }

  return (
    <div className="relative">
      {/* Swipeable container */}
      <div
        ref={containerRef}
        className="flex overflow-x-auto swipe-container scrollbar-hide rounded-xl"
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {items.map((item, index) => (
          <div
            key={item.id || index}
            className="flex-shrink-0 w-full swipe-item"
          >
            <SingleMediaItem
              item={item}
              onClick={() => onItemClick(index)}
              size="large"
            />
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mt-3">
        {items.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToIndex(index)}
            className={`transition-all duration-200 rounded-full ${
              index === currentIndex
                ? 'w-6 h-2 bg-primary'
                : 'w-2 h-2 bg-muted-foreground/40 hover:bg-muted-foreground/60'
            }`}
            aria-label={`Go to media ${index + 1}`}
          />
        ))}
      </div>

      {/* Counter badge */}
      <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm text-xs font-medium px-2 py-1 rounded-full text-foreground/80">
        {currentIndex + 1}/{items.length}
      </div>
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
  onClick,
}: {
  item: MediaItemType;
  size: 'small' | 'medium' | 'large';
  onClick?: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const sizeClasses = {
    small: 'h-[150px]',
    medium: 'h-[200px]',
    large: 'aspect-[4/3] max-h-[400px]',
  };

  const handleVideoClick = useCallback(
    (e: React.MouseEvent) => {
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
    },
    [isPlaying],
  );

  const handleVideoEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  if (item.type === 'video') {
    return (
      <div className="relative group cursor-pointer" onClick={handleVideoClick}>
        <video
          ref={videoRef}
          src={item.url}
          className={`w-full object-cover rounded-xl bg-card ${sizeClasses[size]}`}
          preload="metadata"
          aria-label={item.altText || 'Video'}
          onEnded={handleVideoEnded}
          playsInline
          loop
          muted
        />

        {/* Play/Pause Overlay */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
            isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
          }`}
        >
          <div className="w-14 h-14 glass-light rounded-full flex items-center justify-center border border-white/20 shadow-lg">
            {isPlaying ? (
              <PauseIcon className="w-7 h-7 text-white" />
            ) : (
              <PlayIcon className="w-7 h-7 text-white ml-1" />
            )}
          </div>
        </div>

        {/* Video badge */}
        <span className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5">
          <VideoIcon className="w-3.5 h-3.5" />
          Video
        </span>

        {/* Expand button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          className="absolute bottom-3 right-3 p-2.5 glass-light rounded-full opacity-0 group-hover:opacity-100 transition-opacity border border-white/20"
          aria-label="View fullscreen"
        >
          <ExpandIcon className="w-4 h-4 text-white" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative group cursor-pointer" onClick={onClick}>
      <Image
        src={item.url}
        alt={item.altText || 'Thread image'}
        width={600}
        height={400}
        className={`w-full object-cover rounded-xl bg-card ${sizeClasses[size]} transition-transform`}
        loading="lazy"
      />

      {/* Expand overlay on hover */}
      <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
        <div className="w-10 h-10 glass-light rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-white/20">
          <ExpandIcon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

/**
 * Media Lightbox Component
 * Full-screen media viewer with swipe navigation
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
  const containerRef = useRef<HTMLDivElement>(null);
  const dotsContainerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const dotsTouchStartX = useRef(0);
  const dotsScrollStartX = useRef(0);

  // Reset index when dialog opens - use key prop on Dialog instead of useEffect
  // The parent should pass key={isOpen ? 'open' : 'closed'} to reset state

  const currentItem = items[currentIndex];
  const hasMultiple = items.length > 1;

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  }, [items.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
  }, [items.length]);

  // Touch handlers for main content swipe
  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) goToNext();
      else goToPrevious();
    }
  };

  // Touch handlers for dots - TikTok-style scrubbing
  const handleDotsTouchStart = (e: React.TouchEvent) => {
    dotsTouchStartX.current = e.touches[0].clientX;
    dotsScrollStartX.current = currentIndex;
    e.stopPropagation();
  };

  const handleDotsTouchMove = (e: React.TouchEvent) => {
    if (!dotsContainerRef.current) return;

    const diff = e.touches[0].clientX - dotsTouchStartX.current;
    const containerWidth = dotsContainerRef.current.offsetWidth;
    const dotWidth = containerWidth / items.length;

    // Calculate how many dots to move based on swipe distance
    const indexChange = Math.round(-diff / (dotWidth * 1.5));
    let newIndex = dotsScrollStartX.current + indexChange;

    // Clamp to valid range
    newIndex = Math.max(0, Math.min(items.length - 1, newIndex));

    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }

    e.stopPropagation();
  };

  const handleDotsTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
  };

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'Escape') onClose();
    },
    [goToPrevious, goToNext, onClose],
  );

  // Handle click on backdrop (outside image) to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking directly on the backdrop, not on children
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!currentItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-[100vw] max-h-[100vh] w-full h-full p-0 border-0 rounded-none bg-black/95"
        onKeyDown={handleKeyDown}
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Media viewer</DialogTitle>

        {/* Full-screen clickable backdrop */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          onClick={handleBackdropClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Close button - single, top right */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 bg-white/10 border border-white/20 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <CloseIcon className="w-5 h-5" />
          </Button>

          {/* Navigation arrows - Desktop */}
          {hasMultiple && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-50 hidden md:flex bg-white/10 border border-white/20 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevious();
                }}
              >
                <ChevronLeftIcon className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-50 hidden md:flex bg-white/10 border border-white/20 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
              >
                <ChevronRightIcon className="w-6 h-6" />
              </Button>
            </>
          )}

          {/* Media content - clicking on image/video doesn't close */}
          <div
            ref={containerRef}
            className="flex items-center justify-center max-w-[90vw] max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {currentItem.type === 'video' ? (
              <video
                ref={videoRef}
                src={currentItem.url}
                className="max-w-full max-h-[80vh] object-contain rounded-xl"
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
                className="max-w-full max-h-[80vh] object-contain rounded-xl"
                priority
              />
            )}
          </div>

          {/* Dots indicator - TikTok style swipeable */}
          {hasMultiple && (
            <div
              ref={dotsContainerRef}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-black/30 backdrop-blur-sm touch-pan-x"
              onTouchStart={handleDotsTouchStart}
              onTouchMove={handleDotsTouchMove}
              onTouchEnd={handleDotsTouchEnd}
              onClick={(e) => e.stopPropagation()}
            >
              {items.map((_, index) => (
                <button
                  key={index}
                  className={`transition-all duration-200 rounded-full ${
                    index === currentIndex
                      ? 'w-6 h-2 bg-white'
                      : 'w-2 h-2 bg-white/50 hover:bg-white/70'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(index);
                  }}
                  aria-label={`Go to media ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Counter indicator */}
          {hasMultiple && (
            <div
              className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/30 backdrop-blur-sm text-white text-sm"
              onClick={(e) => e.stopPropagation()}
            >
              {currentIndex + 1} / {items.length}
            </div>
          )}
        </div>
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
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
      />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
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

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
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

function CommentIcon() {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"
      />
    </svg>
  );
}

function RepostIcon() {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
      />
    </svg>
  );
}
