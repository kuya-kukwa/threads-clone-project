/**
 * User Profile Page
 * Dynamic route for viewing user profiles
 * Follows mobile-first architecture
 */

import { notFound } from 'next/navigation';
import { ProfileService } from '@/lib/services/profileService';
import { AuthService } from '@/lib/services/authService';
import { ProfileCard } from '@/components/profile/ProfileCard';

interface ProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params;

  // Fetch profile by user ID
  const profile = await ProfileService.getProfileByUserId(id);

  if (!profile) {
    notFound();
  }

  // Check if this is the current user's profile
  const currentUser = await AuthService.getCurrentUser();
  const isOwnProfile = currentUser?.$id === profile.userId;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 max-w-2xl">
      <ProfileCard profile={profile} isOwnProfile={isOwnProfile} />
    </div>
  );
}

export async function generateMetadata({ params }: ProfilePageProps) {
  const { id } = await params;
  const profile = await ProfileService.getProfileByUserId(id);

  return {
    title: profile
      ? `${profile.displayName} (@${profile.username})`
      : 'Profile Not Found',
    description: profile?.bio || 'User profile on Threads Clone',
  };
}
