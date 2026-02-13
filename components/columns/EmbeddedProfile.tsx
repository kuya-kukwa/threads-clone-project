'use client';

/**
 * EmbeddedProfile — Real profile content for multi-column layout.
 * Shows the current user's profile card + their threads.
 * Self-contained: fetches its own data, manages its own state.
 */

import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/hooks';
import { ProfileCard } from '@/components/profile/ProfileCard';
import {
  ThreadCard,
  ThreadWithLikeStatus,
} from '@/components/threads/ThreadCard';
import { UserProfile, Thread } from '@/types/appwrite';

export function EmbeddedProfile() {
  const { user } = useCurrentUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user profile
  useEffect(() => {
    if (!user?.$id) return;
    (async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/profile/${user.$id}`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (data.success && data.profile) {
          setProfile(data.profile);
        } else {
          setError('Profile not found');
        }
      } catch {
        setError('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user?.$id]);

  // Fetch user threads
  useEffect(() => {
    if (!profile || !user?.$id) return;
    (async () => {
      try {
        setLoadingThreads(true);
        const res = await fetch(`/api/threads?userId=${user.$id}`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (data.threads) setThreads(data.threads);
      } catch {
        /* ignore */
      } finally {
        setLoadingThreads(false);
      }
    })();
  }, [profile, user?.$id]);

  if (isLoading) return <ProfileSkeleton />;

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <UserIcon className="w-10 h-10 text-[#555] mb-3" />
        <p className="text-sm text-[#777]">{error || 'Profile not found'}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Profile Card */}
      <div className="px-4 pt-5">
        <ProfileCard profile={profile} isOwnProfile={true} />
      </div>

      {/* Threads section */}
      <div className="mt-2 border-t border-white/[0.08]">
        <div className="px-4 py-3">
          <h3 className="text-[15px] font-semibold text-white">Threads</h3>
        </div>

        {loadingThreads ? (
          <ThreadsSkeleton />
        ) : threads.length > 0 ? (
          <div>
            {threads.map((thread) => {
              const threadWithAuthor = {
                ...thread,
                author: profile as UserProfile,
                isLiked: false,
              } as unknown as ThreadWithLikeStatus;
              return <ThreadCard key={thread.$id} thread={threadWithAuthor} />;
            })}
          </div>
        ) : (
          <div className="text-center py-12 px-4">
            <p className="text-sm text-[#777]">No threads yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Skeletons ---- */

function ProfileSkeleton() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-5 bg-[#1e1e1e] rounded w-32" />
          <div className="h-4 bg-[#1e1e1e] rounded w-24" />
        </div>
        <div className="w-16 h-16 rounded-full bg-[#1e1e1e]" />
      </div>
      <div className="h-4 bg-[#1e1e1e] rounded w-full" />
      <div className="h-4 bg-[#1e1e1e] rounded w-2/3" />
      <div className="flex gap-4">
        <div className="h-4 bg-[#1e1e1e] rounded w-20" />
        <div className="h-4 bg-[#1e1e1e] rounded w-20" />
      </div>
    </div>
  );
}

function ThreadsSkeleton() {
  return (
    <div className="space-y-1 px-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-[#1e1e1e] shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-[#1e1e1e] rounded w-1/3" />
            <div className="h-4 bg-[#1e1e1e] rounded w-full" />
            <div className="h-4 bg-[#1e1e1e] rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---- Icons ---- */

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}
