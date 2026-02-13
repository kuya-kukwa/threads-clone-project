'use client';

/**
 * LikeButton Component
 * Handles like/unlike functionality with instant optimistic updates
 */

import { useState, useCallback, useRef } from 'react';
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
  const pendingRef = useRef(false);

  const handleLikeClick = useCallback(
    async (e?: React.MouseEvent) => {
      e?.stopPropagation();

      // Prevent rapid double-taps but don't block UI
      if (pendingRef.current) return;
      pendingRef.current = true;

      // Instant optimistic update — no loading state, no delay
      const wasLiked = isLiked;
      const prevCount = likeCount;
      setIsLiked(!wasLiked);
      setLikeCount(wasLiked ? Math.max(prevCount - 1, 0) : prevCount + 1);

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
          setLikeCount(prevCount);
          logger.warn({ msg: 'Like failed', threadId, error: data.error });
        }
        // On success: trust our optimistic update, don't overwrite from server
        // This prevents the UI "flash" / delay users were seeing
      } catch (error) {
        // Revert on error
        setIsLiked(wasLiked);
        setLikeCount(prevCount);
        logger.error({ msg: 'Like error', threadId, error });
      } finally {
        pendingRef.current = false;
      }
    },
    [isLiked, likeCount, threadId],
  );

  return (
    <ActionButton
      icon={<HeartIcon filled={isLiked} />}
      label="Like"
      count={likeCount}
      onClick={handleLikeClick}
      isActive={isLiked}
    />
  );
}
