/**
 * useOptimisticAuth Hook
 * Provides instant auth state based on localStorage session check
 * 
 * Performance Pattern:
 * - Synchronously checks localStorage for session token on mount
 * - Returns "maybeAuthenticated" immediately (no network delay)
 * - Then verifies with actual API call in background
 * 
 * This allows:
 * - Instant rendering of protected content shells
 * - Skeleton placeholders instead of loading screens
 * - Real Threads-like snappy UX
 */

import { useState, useEffect, useMemo, startTransition } from 'react';
import { Models } from 'appwrite';
import { AuthService } from '@/lib/services/authService';
import { logger } from '@/lib/logger/logger';

// Reduced retry settings for faster failure detection
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 200;

interface OptimisticAuthState {
  user: Models.User<Models.Preferences> | null;
  isLoading: boolean;
  /** True if session token exists in localStorage (instant check) */
  maybeAuthenticated: boolean;
  /** True if verification is complete (either success or failure) */
  isVerified: boolean;
}

/**
 * Check if session token exists in localStorage
 * This is SYNCHRONOUS and INSTANT - no network calls
 */
function hasLocalSession(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const cookieFallback = localStorage.getItem('cookieFallback');
    if (!cookieFallback) return false;
    
    const sessionData = JSON.parse(cookieFallback);
    // Check for any session key
    const hasSession = Object.keys(sessionData).some(
      key => key.startsWith('a_session_') && sessionData[key]
    );
    
    return hasSession;
  } catch {
    return false;
  }
}

export function useOptimisticAuth(): OptimisticAuthState {
  // Synchronous initial check - NO DELAY
  const maybeAuthenticated = useMemo(() => hasLocalSession(), []);
  
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const isMounted = { current: true };
    
    const verifySession = async (retryCount: number): Promise<void> => {
      try {
        logger.debug({ msg: 'useOptimisticAuth: Verifying session', retryCount });
        const currentUser = await AuthService.getCurrentUser();
        
        if (isMounted.current) {
          startTransition(() => {
            setUser(currentUser);
            setIsLoading(false);
            setIsVerified(true);
          });
        }
      } catch {
        // Quick retry with shorter delay
        if (retryCount < MAX_RETRIES && maybeAuthenticated) {
          setTimeout(() => {
            if (isMounted.current) {
              void verifySession(retryCount + 1);
            }
          }, RETRY_DELAY_MS);
        } else {
          if (isMounted.current) {
            logger.debug({ msg: 'useOptimisticAuth: Session verification failed' });
            startTransition(() => {
              setUser(null);
              setIsLoading(false);
              setIsVerified(true);
            });
          }
        }
      }
    };
    
    // If no local session, skip verification entirely - instant response
    if (!maybeAuthenticated) {
      startTransition(() => {
        setUser(null);
        setIsLoading(false);
        setIsVerified(true);
      });
      return;
    }
    
    void verifySession(0);

    return () => {
      isMounted.current = false;
    };
  }, [maybeAuthenticated]);

  return { user, isLoading, maybeAuthenticated, isVerified };
}

/**
 * Simplified hook for components that just need optimistic rendering
 * Returns true instantly if user might be logged in
 */
export function useMaybeAuthenticated(): boolean {
  return useMemo(() => hasLocalSession(), []);
}
