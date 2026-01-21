'use client';

/**
 * Navigation Bar Component
 * Desktop navigation with glass morphism effect
 * Hidden on mobile (shows bottom nav instead)
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
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 glass">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between">
          {/* Logo/Brand */}
          <Link
            href={user ? '/feed' : '/'}
            className="flex items-center gap-2 min-h-11"
          >
            <div className="w-8 h-8 rounded-lg btn-gradient flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            </div>
            <span className="text-lg font-bold gradient-text hidden sm:block">
              Threads
            </span>
          </Link>

          {/* Desktop Navigation Links - hidden on mobile */}
          <div className="hidden md:flex items-center gap-1">
            {user ? (
              // Authenticated user navigation
              <>
                <Link href="/feed">
                  <Button
                    variant="ghost"
                    className="min-h-10 text-sm px-4 hover:bg-secondary"
                  >
                    <HomeIcon className="w-5 h-5 mr-2" />
                    Feed
                  </Button>
                </Link>

                <Link href={`/profile/${user.$id}`}>
                  <Button
                    variant="ghost"
                    className="min-h-10 text-sm px-4 hover:bg-secondary"
                  >
                    <ProfileIcon className="w-5 h-5 mr-2" />
                    Profile
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="min-h-10 text-sm px-4 ml-2 border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                >
                  {isLoggingOut ? (
                    <LoadingSpinner className="w-4 h-4 mr-2" />
                  ) : (
                    <LogoutIcon className="w-4 h-4 mr-2" />
                  )}
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </Button>
              </>
            ) : (
              // Non-authenticated user navigation
              <>
                <Link href="/login">
                  <Button
                    variant="ghost"
                    className="min-h-10 text-sm px-4"
                  >
                    Login
                  </Button>
                </Link>

                <Link href="/register">
                  <Button
                    className="min-h-10 text-sm px-4 btn-gradient text-white border-0"
                  >
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile: Only show logo, logout button if logged in */}
          <div className="md:hidden flex items-center gap-2">
            {user && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="min-h-10 min-w-10 hover:bg-destructive/10 hover:text-destructive"
                aria-label="Logout"
              >
                {isLoggingOut ? (
                  <LoadingSpinner className="w-5 h-5" />
                ) : (
                  <LogoutIcon className="w-5 h-5" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

// Icon components
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
    </svg>
  );
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
