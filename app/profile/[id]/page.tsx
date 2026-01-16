/**
 * User Profile Page
 * Client Component - dynamic route for viewing user profiles
 * Follows mobile-first architecture with client-side auth
 */

'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { UserProfile } from '@/types/appwrite';

interface ProfilePageProps {
  params: Promise<{ id: string }>;
}

function ProfileContent({ userId }: { userId: string }) {
  const { user } = useCurrentUser();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Fetch profile via API
        const response = await fetch(`/api/debug/profile/${userId}`);
        const data = await response.json();

        // Debug API returns foundByUserId array
        if (data.foundByUserId && data.foundByUserId.length > 0) {
          setProfile(data.foundByUserId[0]);
        } else {
          setError('Profile not found');
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
    return null;
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 max-w-2xl">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Profile Not Found
          </h1>
          <p className="text-gray-600">
            {error || 'The requested profile does not exist.'}
          </p>
        </div>
      </div>
    );
  }

  const isOwnProfile = user?.$id === profile.userId;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 max-w-2xl">
      <ProfileCard profile={profile} isOwnProfile={isOwnProfile} />
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
