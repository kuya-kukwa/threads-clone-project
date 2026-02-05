'use client';

/**
 * MediaGallery Component
 * Official Threads-style horizontal scrollable gallery
 * Shows images side by side, scrollable on both mobile and desktop
 */

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
  // Single item - display normally
  if (items.length === 1) {
    return (
      <SingleMediaItem
        item={items[0]}
        onClick={() => onItemClick(0)}
        size="large"
      />
    );
  }

  // Two items - show side by side with equal width
  if (items.length === 2) {
    return (
      <div className="flex gap-1 overflow-hidden rounded-xl">
        {items.map((item, index) => (
          <div
            key={item.id || index}
            className="flex-1 min-w-0 overflow-hidden"
          >
            <SingleMediaItem
              item={item}
              onClick={() => onItemClick(index)}
              size="gallery"
            />
          </div>
        ))}
      </div>
    );
  }

  // 3+ items - horizontal scrollable gallery like official Threads
  return (
    <div className="relative -mr-4 sm:-mr-0">
      {/* Horizontal scrollable container */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory">
        {items.map((item, index) => (
          <div
            key={item.id || index}
            className="flex-shrink-0 snap-start last:pr-4 sm:last:pr-0 rounded-xl overflow-hidden"
            style={{
              width: items.length === 3 ? 'calc(55% - 4px)' : 'calc(50% - 4px)',
            }}
          >
            <SingleMediaItem
              item={item}
              onClick={() => onItemClick(index)}
              size="gallery"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
