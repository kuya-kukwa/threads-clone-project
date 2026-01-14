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
      const response = await fetch(`/api/profile/${profile.$id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success && result.profile) {
        onSuccess(result.profile);
      } else {
        setError(result.error || 'Failed to update profile');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to update profile');
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

      {/* Avatar URL */}
      <div className="space-y-2">
        <Label htmlFor="avatarUrl" className="text-sm sm:text-base">
          Avatar URL
        </Label>
        <Input
          id="avatarUrl"
          type="url"
          {...register('avatarUrl')}
          placeholder="https://example.com/avatar.jpg"
          className="min-h-[44px] text-base"
          disabled={isLoading}
        />
        {errors.avatarUrl && (
          <p className="text-xs sm:text-sm text-destructive">
            {errors.avatarUrl.message}
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
