/**
 * useAuth Hook
 * Custom hook for authentication operations
 * Handles login, logout, and authentication state
 * 
 * Cross-device compatibility:
 * - Proper session cleanup before login
 * - Extended delay for session storage
 * - Hard navigation for reliable redirect
 * - Enhanced error handling for production
 */

import { useState } from 'react';
import { AuthService } from '@/lib/services/authService';
import { LoginInput, RegisterInput } from '@/schemas/auth.schema';
import { account, clearAppwriteSession, debugSessionState } from '@/lib/appwriteClient';
import { getErrorMessage } from '@/lib/errors';
import { safeFetch, handleApiResponse, isNetworkError, isAuthError } from '@/lib/api/errorHandler';
import { logger } from '@/lib/logger/logger';

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);

  const login = async (data: LoginInput, redirectTo?: string) => {
    setIsLoading(true);
    logger.debug({ msg: 'useAuth: Starting login', email: data.email });
    
    try {
      // Clear any existing session data before logging in
      clearAppwriteSession();
      
      // Delete any existing session first
      try {
        await account.deleteSession('current');
        logger.debug({ msg: 'useAuth: Cleared existing session' });
      } catch {
        // No existing session, continue
      }
      
      // Create session client-side using Appwrite SDK
      // This properly handles session storage in browser
      logger.debug({ msg: 'useAuth: Creating session' });
      const session = await account.createEmailPasswordSession(data.email, data.password);
      logger.debug({ msg: 'useAuth: Session created', sessionId: session.$id });
      
      // Get current user
      const user = await account.get();
      logger.debug({ msg: 'useAuth: User retrieved', userId: user.$id });
      
      // Extended delay to ensure session is stored (important for mobile)
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Determine redirect URL
      let redirectUrl = '/feed';
      
      if (redirectTo) {
        try {
          const redirectUrlObj = new URL(redirectTo, window.location.origin);
          // Security check: only allow redirects to the same origin
          if (redirectUrlObj.origin === window.location.origin) {
            redirectUrl = redirectUrlObj.pathname + redirectUrlObj.search;
          }
        } catch {
          // Invalid URL, use default
          redirectUrl = '/feed';
        }
      }
      
      logger.debug({ msg: 'useAuth: Redirecting', redirectTo });
      // Force a hard navigation to ensure session is recognized
      window.location.href = redirectUrl;
      return { success: true, user };
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      logger.warn({ msg: 'useAuth: Login failed', error: errorMsg });
      
      // Check for common auth errors
      if (errorMsg.includes('401') || errorMsg.toLowerCase().includes('invalid') || 
          errorMsg.toLowerCase().includes('credentials') || errorMsg.toLowerCase().includes('password')) {
        return { success: false, error: 'Invalid email or password' };
      }
      
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterInput) => {
    setIsLoading(true);
    logger.debug({ msg: 'useAuth: Starting registration', email: data.email });
    
    try {
      // Clear any existing session data before registering
      clearAppwriteSession();
      
      // Delete any existing session first
      try {
        await account.deleteSession('current');
        logger.debug({ msg: 'useAuth: Cleared existing session' });
      } catch {
        // No existing session, continue
      }
      
      // Call API route to create auth user + profile (requires admin key)
      logger.debug({ msg: 'useAuth: Calling register API' });
      const response = await safeFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      const result = await handleApiResponse<{ success: boolean; error?: string; user?: unknown; profile?: unknown }>(response);
      logger.debug({ msg: 'useAuth: Register API response', success: result.success });

      if (!result.success) {
        logger.warn({ msg: 'useAuth: Registration failed', error: result.error });
        return { success: false, error: result.error || 'Registration failed' };
      }

      // Wait for user propagation before creating session
      logger.debug({ msg: 'useAuth: User created, waiting for propagation' });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create session directly client-side (no separate API call needed)
      logger.debug({ msg: 'useAuth: Creating client session' });
      const session = await account.createEmailPasswordSession(data.email, data.password);
      logger.debug({ msg: 'useAuth: Session created', sessionId: session.$id });
      
      // Get current user to ensure session is valid
      const user = await account.get();
      logger.debug({ msg: 'useAuth: User retrieved', userId: user.$id });
      
      // Extended delay to ensure session is stored (important for mobile)
      await new Promise(resolve => setTimeout(resolve, 300));
      
      logger.debug({ msg: 'useAuth: Registration complete, redirecting to /feed' });
      // Force a hard navigation to ensure session is recognized
      window.location.href = '/feed';
      return { success: true, user };
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      logger.warn({ msg: 'useAuth: Registration failed', error: errorMsg });
      
      // Enhanced error handling for production
      if (process.env.NODE_ENV === 'production') {
        debugSessionState();
        logger.error({
          msg: 'Registration error',
          error: errorMsg,
          isNetwork: isNetworkError(error),
          isAuth: isAuthError(error),
        });
      }
      
      // Check for common registration errors
      if (errorMsg.includes('409') || (errorMsg.toLowerCase().includes('user') && errorMsg.toLowerCase().includes('exists'))) {
        return { success: false, error: 'User already exists with this email' };
      }
      
      // Network errors - suggest retry
      if (isNetworkError(error)) {
        return { success: false, error: 'Network error. Please check your connection and try again.' };
      }
      
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // Clear session from localStorage first
      clearAppwriteSession();
      
      const result = await AuthService.logout();
      if (result.success) {
        // Give Appwrite time to clear the session cookie
        await new Promise(resolve => setTimeout(resolve, 100));
        // Hard redirect to ensure session is cleared
        window.location.href = '/login';
      }
      return result;
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    login,
    register,
    logout,
    isLoading,
  };
}