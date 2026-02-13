'use client';

/**
 * Right Sidebar Component
 * Shows on xl+ screens (1280px+)
 * Contains suggested users to follow and footer links
 *
 * Features:
 * - Suggested users with follow button
 * - Search functionality
 * - Footer with links
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks';
import { getSessionToken } from '@/lib/appwriteClient';
import { UserProfile } from '@/types/appwrite';

interface SuggestedUser extends UserProfile {
  isFollowing?: boolean;
}

export function RightSidebar() {
  const { user } = useCurrentUser();
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSuggestedUsers = useCallback(async () => {
    try {
      const sessionId = getSessionToken();
      if (!sessionId) return;

      const response = await fetch('/api/users/suggested?limit=5', {
        headers: {
          'x-session-id': sessionId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSuggestedUsers(data.users || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch suggested users:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchSuggestedUsers();
    }
  }, [user, fetchSuggestedUsers]);

  const handleFollow = async (userId: string) => {
    const sessionId = getSessionToken();
    if (!sessionId) return;

    // Optimistic update
    setSuggestedUsers((prev) =>
      prev.map((u) =>
        u.userId === userId ? { ...u, isFollowing: !u.isFollowing } : u,
      ),
    );

    try {
      await fetch(`/api/profile/${userId}/follow`, {
        method: 'POST',
        headers: {
          'x-session-id': sessionId,
          'x-csrf-token': 'true',
        },
      });
    } catch {
      // Revert on error
      setSuggestedUsers((prev) =>
        prev.map((u) =>
          u.userId === userId ? { ...u, isFollowing: !u.isFollowing } : u,
        ),
      );
    }
  };

  if (!user) return null;

  return (
    <aside className="hidden xl:block fixed right-0 top-0 h-screen w-[350px] border-l border-border/20 bg-background">
      <div className="flex flex-col h-full px-6 py-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search"
              className="w-full h-10 pl-10 pr-4 bg-secondary/50 border border-border/50 rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
          </div>
        </div>

        {/* Suggested Users */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Suggested for you
            </h3>
            <Link
              href="/explore"
              className="text-xs text-primary hover:text-primary/80 font-medium"
            >
              See All
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary animate-pulse" />
                  <div className="flex-1">
                    <div className="h-3 w-24 bg-secondary rounded animate-pulse mb-2" />
                    <div className="h-2 w-16 bg-secondary rounded animate-pulse" />
                  </div>
                  <div className="h-8 w-20 bg-secondary rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          ) : suggestedUsers.length > 0 ? (
            <div className="space-y-4">
              {suggestedUsers.map((suggestedUser) => (
                <div
                  key={suggestedUser.$id}
                  className="flex items-center gap-3"
                >
                  <Link href={`/profile/${suggestedUser.userId}`}>
                    <Avatar className="w-10 h-10 ring-2 ring-border/30">
                      <AvatarImage src={suggestedUser.avatarUrl} />
                      <AvatarFallback className="bg-linear-to-br from-primary to-accent text-white text-sm">
                        {suggestedUser.displayName?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/profile/${suggestedUser.userId}`}
                      className="block text-sm font-medium truncate hover:underline"
                    >
                      {suggestedUser.displayName}
                    </Link>
                    <p className="text-xs text-muted-foreground truncate">
                      @{suggestedUser.username}
                    </p>
                  </div>
                  <Button
                    variant={suggestedUser.isFollowing ? 'outline' : 'default'}
                    size="sm"
                    className="h-8 text-xs rounded-lg"
                    onClick={() => handleFollow(suggestedUser.userId)}
                  >
                    {suggestedUser.isFollowing ? 'Following' : 'Follow'}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No suggestions available
            </p>
          )}
        </div>

        {/* Footer Links */}
        <div className="mt-auto pt-6">
          <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground/60">
            <Link href="/about" className="hover:underline">
              About
            </Link>
            <span>·</span>
            <Link href="/help" className="hover:underline">
              Help
            </Link>
            <span>·</span>
            <Link href="/privacy" className="hover:underline">
              Privacy
            </Link>
            <span>·</span>
            <Link href="/terms" className="hover:underline">
              Terms
            </Link>
            <span>·</span>
            <Link href="/locations" className="hover:underline">
              Locations
            </Link>
          </div>
          <p className="text-xs text-muted-foreground/40 mt-3">
            © 2026 Threads Clone
          </p>
        </div>
      </div>
    </aside>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  );
}
