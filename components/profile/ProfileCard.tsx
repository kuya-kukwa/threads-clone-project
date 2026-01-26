'use client';

/**
 * Profile Card Component
 * Displays user profile with edit capability
 * Follows mobile-first architecture with dark theme
 */

import { useState } from 'react';
import { UserProfile } from '@/types/appwrite';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EditProfileForm } from './EditProfileForm';

interface ProfileCardProps {
  profile: UserProfile;
  isOwnProfile: boolean;
}

export function ProfileCard({
  profile: initialProfile,
  isOwnProfile,
}: ProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState(initialProfile);

  const handleEditSuccess = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="w-full animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Edit Profile</h2>
          <button
            onClick={() => setIsEditing(false)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
        <EditProfileForm
          profile={profile}
          onCancel={() => setIsEditing(false)}
          onSuccess={handleEditSuccess}
        />
      </div>
    );
  }

  return (
    <div className="w-full animate-fade-in">
      {/* Top section: Info left, Avatar right */}
      <div className="flex items-start justify-between gap-4">
        {/* Left: Name and username */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">
            {profile.displayName}
          </h1>
          <p className="text-base text-muted-foreground">@{profile.username}</p>
        </div>

        {/* Right: Avatar */}
        <Avatar className="w-20 h-20 shrink-0 ring-2 ring-border">
          <AvatarImage
            src={profile.avatarUrl}
            alt={profile.displayName}
            onLoadingStatusChange={(status) =>
              console.log(
                '[ProfileCard] Avatar load status:',
                status,
                'URL:',
                profile.avatarUrl,
              )
            }
          />
          <AvatarFallback className="text-xl bg-secondary text-secondary-foreground">
            {profile.displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="mt-3 text-sm text-foreground/90 leading-relaxed">
          {profile.bio}
        </p>
      )}

      {/* Action button */}
      {isOwnProfile ? (
        <Button
          onClick={() => setIsEditing(true)}
          variant="outline"
          className="w-full mt-4 h-10 text-sm font-medium border-border hover:bg-secondary"
        >
          Edit profile
        </Button>
      ) : (
        <Button
          variant="default"
          className="w-full mt-4 h-10 text-sm font-medium"
        >
          Follow
        </Button>
      )}
    </div>
  );
}
