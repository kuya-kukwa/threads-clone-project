/**
 * useCurrentUser Hook
 * Custom hook for managing current authenticated user state
 * Handles loading states and user data fetching with cleanup to prevent memory leaks
 * 
 * Cross-device compatibility:
 * - Retry logic for session hydration on mobile
 * - Better error handling for network delays
 */

import { useState, useEffect, useCallback } from 'react';
import { Models } from 'appwrite';
import { AuthService } from '@/lib/services/authService';
import { logger } from '@/lib/logger/logger';

// Max retries for session check (helps with mobile network delays)
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

export function useCurrentUser() {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async (retryCount: number, isMounted: { current: boolean }) => {
    try {
      logger.debug({ msg: 'useCurrentUser: Fetching user', retryCount });
      const currentUser = await AuthService.getCurrentUser();
      
      if (isMounted.current) {
        logger.debug({ 
          msg: 'useCurrentUser: User fetched', 
          userId: currentUser?.$id,
          hasUser: !!currentUser,
        });
        setUser(currentUser);
        setIsLoading(false);
      }
    } catch (error) {
      logger.debug({
        msg: 'useCurrentUser: Failed to fetch user',
        error: error instanceof Error ? error.message : 'Unknown error',
        retryCount,
      });
      
      // Retry on failure (helps with cross-device session hydration)
      if (retryCount < MAX_RETRIES) {
        return new Promise<void>((resolve) => {
          setTimeout(async () => {
            if (isMounted.current) {
              await fetchUser(retryCount + 1, isMounted);
            }
            resolve();
          }, RETRY_DELAY_MS);
        });
      } else {
        if (isMounted.current) {
          logger.debug({ msg: 'useCurrentUser: All retries exhausted, no user found' });
          setUser(null);
          setIsLoading(false);
        }
      }
    }
  }, []);

  useEffect(() => {
    const isMounted = { current: true };
    
    fetchUser(0, isMounted);

    return () => {
      isMounted.current = false;
    };
  }, [fetchUser]);

  return { user, isLoading };
}