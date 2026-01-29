'use client';

/**
 * MediaLightbox Component
 * Full-screen media viewer with swipe navigation
 */

import { useState, useRef, useCallback, TouchEvent } from 'react';
import Image from 'next/image';
import { MediaItem as MediaItemType } from '@/types/appwrite';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { CloseIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';

interface MediaLightboxProps {
  items: MediaItemType[];
  isOpen: boolean;
  onClose: () => void;
  initialIndex: number;
}

export function MediaLightbox({
  items,
  isOpen,
  onClose,
  initialIndex,
}: MediaLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dotsContainerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const dotsTouchStartX = useRef(0);
  const dotsScrollStartX = useRef(0);

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
        <DialogDescription className="sr-only">
          Swipe or use arrows to navigate between images
        </DialogDescription>

        {/* Full-screen clickable backdrop */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          onClick={handleBackdropClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Close button */}
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

          {/* Media content */}
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
