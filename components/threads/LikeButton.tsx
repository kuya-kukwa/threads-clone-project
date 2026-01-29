'use client';

/**
 * LikeButton Component
 * Handles like/unlike functionality with optimistic updates
 */

import { useState } from 'react';
import { getSessionToken } from '@/lib/appwriteClient';
import { logger } from '@/lib/logger/logger';
import { ActionButton } from './ActionButton';
import { HeartIcon } from './icons';

interface LikeButtonProps {
  threadId: string;
  initialIsLiked: boolean;
  initialLikeCount: number;
}

export function LikeButton({
  threadId,
  initialIsLiked,
  initialLikeCount,
}: LikeButtonProps) {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLiking, setIsLiking] = useState(false);

  const handleLikeClick = async (e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (isLiking) return;

    setIsLiking(true);

    // Optimistic update
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount((prev) => (wasLiked ? Math.max(prev - 1, 0) : prev + 1));

    try {
      const sessionToken = getSessionToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-CSRF-Token': 'true',
      };

      if (sessionToken) {
        headers['x-session-id'] = sessionToken;
      }

      const response = await fetch(`/api/threads/${threadId}/like`, {
        method: 'POST',
        credentials: 'include',
        headers,
      });

      const data = await response.json();

      if (!data.success) {
        // Revert on failure
        setIsLiked(wasLiked);
        setLikeCount((prev) => (wasLiked ? prev + 1 : Math.max(prev - 1, 0)));
        logger.warn({ msg: 'Like failed', threadId, error: data.error });
      } else {
        // Sync with server response
        setIsLiked(data.liked);
        setLikeCount(data.likeCount);
      }
    } catch (error) {
      // Revert on error
      setIsLiked(wasLiked);
      setLikeCount((prev) => (wasLiked ? prev + 1 : Math.max(prev - 1, 0)));
      logger.error({ msg: 'Like error', threadId, error });
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <ActionButton
      icon={<HeartIcon filled={isLiked} />}
      label="Like"
      count={likeCount}
      onClick={handleLikeClick}
      isActive={isLiked}
      isLoading={isLiking}
    />
  );
}
