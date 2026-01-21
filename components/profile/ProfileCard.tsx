'use client';

/**
 * Profile Card Component
 * Displays user profile with edit capability
 * Follows mobile-first architecture with dark theme
 */

import { useState } from 'react';
import { UserProfile } from '@/types/appwrite';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
      <Card className="w-full bg-card/50 border-border/50 animate-fade-in">
        <CardHeader>
          <h2 className="text-lg sm:text-xl font-semibold gradient-text">Edit Profile</h2>
        </CardHeader>
        <CardContent>
          <EditProfileForm
            profile={profile}
            onCancel={() => setIsEditing(false)}
            onSuccess={handleEditSuccess}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-card/50 border-border/50 animate-fade-in">
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          {/* Avatar */}
          <Avatar className="w-24 h-24 sm:w-28 sm:h-28 self-center sm:self-start ring-4 ring-primary/20">
            <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
            <AvatarFallback className="text-xl sm:text-2xl bg-secondary text-secondary-foreground">
              {profile.displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Profile Info */}
          <div className="flex-1 space-y-3 sm:space-y-4 text-center sm:text-left">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
                {profile.displayName}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                @{profile.username}
              </p>
            </div>

            {profile.bio && (
              <p className="text-sm sm:text-base text-foreground/80 leading-relaxed">
                {profile.bio}
              </p>
            )}

            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              <Badge variant="secondary" className="text-xs sm:text-sm bg-secondary/80">
                Joined {new Date(profile.createdAt).toLocaleDateString()}
              </Badge>
            </div>

            {isOwnProfile && (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="w-full sm:w-auto min-h-[44px] text-sm sm:text-base border-border/50 hover:bg-secondary"
              >
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
