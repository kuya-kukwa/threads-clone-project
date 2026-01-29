/**
 * useCurrentUser Hook
 * Custom hook for managing current authenticated user state
 * Handles loading states and user data fetching with cleanup to prevent memory leaks
 * 
 * Cross-device compatibility:
 * - Retry logic for session hydration on mobile
 * - Better error handling for network delays
 */

import { useState, useEffect } from 'react';
import { Models } from 'appwrite';
import { AuthService } from '@/lib/services/authService';
import { logger } from '@/lib/logger/logger';

// Reduced retry settings for faster response
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 200;

export function useCurrentUser() {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const isMounted = { current: true };
    
    const fetchUser = async (retryCount: number): Promise<void> => {
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
          setTimeout(() => {
            if (isMounted.current) {
              void fetchUser(retryCount + 1);
            }
          }, RETRY_DELAY_MS);
        } else {
          if (isMounted.current) {
            logger.debug({ msg: 'useCurrentUser: All retries exhausted, no user found' });
            setUser(null);
            setIsLoading(false);
          }
        }
      }
    };
    
    void fetchUser(0);

    return () => {
      isMounted.current = false;
    };
  }, []);

  return { user, isLoading };
}