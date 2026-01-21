/**
 * User Profile Page
 * Client Component - dynamic route for viewing user profiles
 * Follows mobile-first architecture with dark theme
 */

'use client';

import { useEffect, useState, use } from 'react';
import { useCurrentUser } from '@/hooks';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { UserProfile } from '@/types/appwrite';

interface ProfilePageProps {
  params: Promise<{ id: string }>;
}

function ProfileContent({ userId }: { userId: string }) {
  const { user } = useCurrentUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Fetch profile via proper API route
        const response = await fetch(`/api/profile/${userId}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();

        if (data.success && data.profile) {
          setProfile(data.profile);
        } else {
          setError(data.error || 'Profile not found');
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setError('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto border-x border-border/50 min-h-screen">
          <div className="sticky top-14 md:top-16 z-10 glass border-b border-border/50 p-4">
            <h1 className="text-xl font-bold gradient-text">Profile</h1>
          </div>
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto border-x border-border/50 min-h-screen">
          <div className="sticky top-14 md:top-16 z-10 glass border-b border-border/50 p-4">
            <h1 className="text-xl font-bold gradient-text">Profile</h1>
          </div>
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Profile Not Found
            </h2>
            <p className="text-muted-foreground mb-4">
              {error || 'The requested profile does not exist.'}
            </p>
            <p className="text-xs text-muted-foreground/60">User ID: {userId}</p>
          </div>
        </div>
      </div>
    );
  }

  const isOwnProfile = user?.$id === profile.userId;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto border-x border-border/50 min-h-screen">
        <div className="sticky top-14 md:top-16 z-10 glass border-b border-border/50 p-4">
          <h1 className="text-xl font-bold gradient-text">Profile</h1>
        </div>
        <div className="p-4">
          <ProfileCard profile={profile} isOwnProfile={isOwnProfile} />
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const { id } = use(params);

  return (
    <AuthGuard>
      <ProfileContent userId={id} />
    </AuthGuard>
  );
}
