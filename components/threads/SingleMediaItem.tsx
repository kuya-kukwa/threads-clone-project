'use client';

/**
 * SingleMediaItem Component
 * Renders either an image or video with appropriate styling
 */

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { MediaItem as MediaItemType } from '@/types/appwrite';
import { PlayIcon, PauseIcon, VideoIcon, ExpandIcon } from './icons';

export type MediaSize = 'small' | 'medium' | 'large' | 'gallery';

interface SingleMediaItemProps {
  item: MediaItemType;
  size: MediaSize;
  onClick?: () => void;
}

const sizeClasses: Record<MediaSize, string> = {
  small: 'h-[150px]',
  medium: 'h-[200px]',
  large: 'aspect-[4/3] max-h-[400px]',
  gallery: 'h-[280px] lg:h-[320px]',
};

export function SingleMediaItem({ item, size, onClick }: SingleMediaItemProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

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
      <div
        className="relative group cursor-pointer h-full overflow-hidden"
        onClick={handleVideoClick}
      >
        <video
          ref={videoRef}
          src={item.url}
          className={`w-full h-full object-cover bg-card ${sizeClasses[size]} ${size === 'gallery' ? '' : 'rounded-xl'}`}
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
          <div
            className={`${size === 'gallery' ? 'w-10 h-10' : 'w-14 h-14'} glass-light rounded-full flex items-center justify-center border border-white/20 shadow-lg`}
          >
            {isPlaying ? (
              <PauseIcon
                className={`${size === 'gallery' ? 'w-5 h-5' : 'w-7 h-7'} text-white`}
              />
            ) : (
              <PlayIcon
                className={`${size === 'gallery' ? 'w-5 h-5' : 'w-7 h-7'} text-white ml-0.5`}
              />
            )}
          </div>
        </div>

        {/* Video badge */}
        <span className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
          <VideoIcon className="w-3 h-3" />
          Video
        </span>

        {/* Expand button - hidden in gallery mode */}
        {size !== 'gallery' && (
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
        )}
      </div>
    );
  }

  return (
    <div
      className="relative group cursor-pointer h-full overflow-hidden"
      onClick={onClick}
    >
      <Image
        src={item.url}
        alt={item.altText || 'Thread image'}
        width={600}
        height={400}
        className={`w-full h-full bg-card ${sizeClasses[size]} transition-transform object-cover ${size === 'gallery' ? '' : 'rounded-xl'}`}
        loading="lazy"
      />

      {/* Expand overlay on hover */}
      <div
        className={`absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center ${size === 'gallery' ? '' : 'rounded-xl'}`}
      >
        <div className="w-10 h-10 glass-light rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-white/20">
          <ExpandIcon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}
