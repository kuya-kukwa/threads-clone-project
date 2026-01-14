/**
 * useAuth Hook
 * Custom hook for authentication operations
 * Handles login, logout, and authentication state
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/lib/services/authService';
import { LoginInput, RegisterInput } from '@/schemas/auth.schema';

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const login = async (data: LoginInput) => {
    setIsLoading(true);
    try {
      const result = await AuthService.login(data);
      if (result.success) {
        router.push('/feed');
        router.refresh();
      }
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterInput) => {
    setIsLoading(true);
    try {
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
      await login(data);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Registration failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const result = await AuthService.logout();
      if (result.success) {
        router.push('/login');
        router.refresh();
      }
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Logout failed' };
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