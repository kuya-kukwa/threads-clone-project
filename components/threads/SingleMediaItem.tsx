'use client';

/**
 * SingleMediaItem Component
 * Renders either an image or video with appropriate styling
 */

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { MediaItem as MediaItemType } from '@/types/appwrite';
import { PlayIcon, PauseIcon, VideoIcon, ExpandIcon } from './icons';

export type MediaSize = 'small' | 'medium' | 'large';

interface SingleMediaItemProps {
  item: MediaItemType;
  size: MediaSize;
  onClick?: () => void;
}

const sizeClasses: Record<MediaSize, string> = {
  small: 'h-[150px]',
  medium: 'h-[200px]',
  large: 'aspect-[4/3] max-h-[400px]',
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
