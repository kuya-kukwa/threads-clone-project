/**
 * useAuth Hook
 * Custom hook for authentication operations
 * Handles login, logout, and authentication state
 * 
 * Cross-device compatibility:
 * - Proper session cleanup before login
 * - Extended delay for session storage
 * - Hard navigation for reliable redirect
 */

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthService } from '@/lib/services/authService';
import { LoginInput, RegisterInput } from '@/schemas/auth.schema';
import { account, clearAppwriteSession } from '@/lib/appwriteClient';
import { getErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger/logger';

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const login = async (data: LoginInput) => {
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
      
      // Check for redirect parameter, default to /feed
      const redirectParam = searchParams.get('redirect');
      let redirectTo = '/feed';
      
      if (redirectParam) {
        try {
          const redirectUrl = new URL(redirectParam, window.location.origin);
          // Security check: only allow redirects to the same origin
          if (redirectUrl.origin === window.location.origin) {
            redirectTo = redirectUrl.pathname + redirectUrl.search;
          }
        } catch {
          // Invalid URL, use default
          redirectTo = '/feed';
        }
      }
      
      logger.debug({ msg: 'useAuth: Redirecting', redirectTo });
      // Force a hard navigation to ensure session is recognized
      window.location.href = redirectTo;
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
      
      // Call API route to create auth user + profile (requires admin key)
      logger.debug({ msg: 'useAuth: Calling register API' });
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'true', // Required by middleware for POST requests
        },
        credentials: 'include', // Ensure cookies are sent for cross-device requests
        body: JSON.stringify(data),
      });

      const result = await response.json();
      logger.debug({ msg: 'useAuth: Register API response', success: result.success });

      if (!result.success) {
        logger.warn({ msg: 'useAuth: Registration failed', error: result.error });
        return { success: false, error: result.error || 'Registration failed' };
      }

      // Now login client-side so Appwrite can set session cookies in browser
      // The login function handles redirect to /feed on success
      logger.debug({ msg: 'useAuth: Registration successful, logging in' });
      await login({ email: data.email, password: data.password });
      
      // Note: login() redirects on success, so we only reach here if it failed
      // But we already returned the error from login, so this won't execute
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
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