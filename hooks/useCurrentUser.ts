/**
 * useCurrentUser Hook
 * Custom hook for managing current authenticated user state
 * Handles loading states and user data fetching
 */

import { useState, useEffect } from 'react';
import { Models } from 'appwrite';
import { AuthService } from '@/lib/services/authService';

export function useCurrentUser() {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Failed to fetch current user:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  return { user, isLoading };
}