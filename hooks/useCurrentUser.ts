/**
 * useCurrentUser Hook
 * Custom hook for managing current authenticated user state
 * Handles loading states and user data fetching with cleanup to prevent memory leaks
 */

import { useState, useEffect } from 'react';
import { Models } from 'appwrite';
import { AuthService } from '@/lib/services/authService';
import { logger } from '@/lib/logger/logger';

export function useCurrentUser() {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    
    const fetchUser = async (retryCount = 0) => {
      try {
        const currentUser = await AuthService.getCurrentUser();
        
        if (isMounted) {
          setUser(currentUser);
          setIsLoading(false);
        }
      } catch (error) {
        logger.debug({
          msg: 'Failed to fetch current user',
          error: error instanceof Error ? error.message : 'Unknown error',
          retryCount,
        });
        
        // Retry once after a short delay in case session is still being set up
        if (retryCount === 0) {
          timeoutId = setTimeout(() => {
            if (isMounted) {
              fetchUser(1);
            }
          }, 500);
        } else {
          if (isMounted) {
            setUser(null);
            setIsLoading(false);
          }
        }
      }
    };

    fetchUser();

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  return { user, isLoading };
}