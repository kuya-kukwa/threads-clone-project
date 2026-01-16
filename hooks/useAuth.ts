/**
 * useAuth Hook
 * Custom hook for authentication operations
 * Handles login, logout, and authentication state
 */

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthService } from '@/lib/services/authService';
import { LoginInput, RegisterInput } from '@/schemas/auth.schema';
import { clearAppwriteSession } from '@/lib/appwriteClient';
import { getErrorMessage } from '@/lib/errors';

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const login = async (data: LoginInput) => {
    setIsLoading(true);
    try {
      // Clear any existing session data before logging in
      clearAppwriteSession();
      
      const result = await AuthService.login(data);
      if (result.success) {
        // Give Appwrite a moment to set the session cookie
        await new Promise(resolve => setTimeout(resolve, 100));
        
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
        
        // Force a hard navigation to ensure session is recognized
        window.location.href = redirectTo;
      }
      return result;
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterInput) => {
    setIsLoading(true);
    try {
      // Clear any existing session data before registering
      clearAppwriteSession();
      
      // Call API route to create auth user + profile (requires admin key)
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        return { success: false, error: result.error || 'Registration failed' };
      }

      // Now login client-side so Appwrite can set session cookies in browser
      // The login function handles redirect to /feed on success
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