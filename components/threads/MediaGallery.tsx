'use client';

/**
 * SwipeableMediaGallery Component
 * TikTok-Style swipeable media gallery with horizontal scroll,
 * touch gestures, and dot indicators
 */

import { useState, useRef, useCallback, TouchEvent } from 'react';
import { MediaItem as MediaItemType } from '@/types/appwrite';
import { SingleMediaItem } from './SingleMediaItem';

interface SwipeableMediaGalleryProps {
  items: MediaItemType[];
  onItemClick: (index: number) => void;
}

// Also export as MediaGallery for backward compatibility
export { SwipeableMediaGallery as MediaGallery };

export function SwipeableMediaGallery({
  items,
  onItemClick,
}: SwipeableMediaGalleryProps) {
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
