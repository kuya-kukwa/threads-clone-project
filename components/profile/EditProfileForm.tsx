'use client';

/**
 * Edit Profile Form Component
 * Inline form for updating user profile with Zod validation
 * Follows mobile-first architecture
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  profileUpdateSchema,
  ProfileUpdateInput,
} from '@/schemas/profile.schema';
import { UserProfile } from '@/types/appwrite';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getSessionToken } from '@/lib/appwriteClient';
import { getErrorMessage } from '@/lib/errors';

interface EditProfileFormProps {
  profile: UserProfile;
  onCancel: () => void;
  onSuccess: (updatedProfile: UserProfile) => void;
}

export function EditProfileForm({
  profile,
  onCancel,
  onSuccess,
}: EditProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      displayName: profile.displayName,
      bio: profile.bio || '',
      avatarUrl: profile.avatarUrl || '',
    },
  });

  const bio = watch('bio') || '';
  const avatarUrl = watch('avatarUrl') || '';

  const onSubmit = async (data: ProfileUpdateInput) => {
    setIsLoading(true);
    setError(null);

    try {
      // Use the utility function to get the session token
      const sessionId = getSessionToken();

      if (!sessionId) {
        setError('Session not found. Please log in again.');
        setIsLoading(false);
        return;
      }

      const response = await fetch(`/api/profile/${profile.$id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': 'true',
          'x-session-id': sessionId, // Send session ID in custom header
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success && result.profile) {
        onSuccess(result.profile);
      } else {
        // Show detailed error message if available
        const errorMsg = result.error || 'Failed to update profile';
        const detailsMsg = result.details ? `\n${result.details}` : '';
        setError(errorMsg + detailsMsg);

        // If it's a session error, suggest re-login
        if (response.status === 401 || response.status === 403) {
          setError('Session expired. Please log in again.');
        }
      }
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
      {/* Avatar Preview */}
      <div className="flex items-center gap-4">
        <Avatar className="w-16 h-16 sm:w-20 sm:h-20">
          <AvatarImage src={avatarUrl} alt={profile.displayName} />
          <AvatarFallback className="text-lg sm:text-xl">
            {profile.displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="text-xs sm:text-sm text-muted-foreground">
          Update your avatar URL below
        </div>
      </div>

      {/* Display Name */}
      <div className="space-y-2">
        <Label htmlFor="displayName" className="text-sm sm:text-base">
          Display Name
        </Label>
        <Input
          id="displayName"
          type="text"
          {...register('displayName')}
          placeholder="Your display name"
          className="min-h-[44px] text-base"
          disabled={isLoading}
        />
        {errors.displayName && (
          <p className="text-xs sm:text-sm text-destructive">
            {errors.displayName.message}
          </p>
        )}
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="bio" className="text-sm sm:text-base">
            Bio
          </Label>
          <span className="text-xs text-muted-foreground">
            {bio.length}/160
          </span>
        </div>
        <Textarea
          id="bio"
          {...register('bio')}
          placeholder="Tell us about yourself..."
          rows={3}
          className="resize-none min-h-[88px] text-base"
          disabled={isLoading}
        />
        {errors.bio && (
          <p className="text-xs sm:text-sm text-destructive">
            {errors.bio.message}
          </p>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 sm:p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-xs sm:text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full sm:w-auto min-h-[44px] text-sm sm:text-base"
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="w-full sm:w-auto min-h-[44px] text-sm sm:text-base"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
