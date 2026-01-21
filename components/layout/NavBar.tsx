'use client';

/**
 * Navigation Bar Component
 * Global navigation with logout functionality
 * Follows mobile-first architecture
 */

import { useState } from 'react';
import Link from 'next/link';
import { useCurrentUser } from '@/hooks';
import { useAuth } from '@/hooks';
import { Button } from '@/components/ui/button';

export function NavBar() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { user } = useCurrentUser();
  const { logout } = useAuth();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between">
          {/* Logo/Brand */}
          <Link
            href={user ? '/feed' : '/'}
            className="text-lg sm:text-xl font-bold hover:opacity-80 transition-opacity min-h-11 flex items-center"
          >
            Threads Clone
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-2 sm:gap-4">
            {user ? (
              // Authenticated user navigation
              <>
                <Link href="/feed">
                  <Button
                    variant="ghost"
                    className="min-h-11 text-sm sm:text-base px-2 sm:px-4"
                  >
                    Feed
                  </Button>
                </Link>

                <Link href={`/profile/${user.$id}`}>
                  <Button
                    variant="ghost"
                    className="min-h-11 text-sm sm:text-base px-2 sm:px-4"
                  >
                    Profile
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="min-h-11 text-sm sm:text-base px-2 sm:px-4"
                >
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </Button>
              </>
            ) : (
              // Non-authenticated user navigation
              <>
                <Link href="/login">
                  <Button
                    variant="ghost"
                    className="min-h-11 text-sm sm:text-base px-2 sm:px-4"
                  >
                    Login
                  </Button>
                </Link>

                <Link href="/register">
                  <Button
                    variant="outline"
                    className="min-h-11 text-sm sm:text-base px-2 sm:px-4"
                  >
                    Register
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
