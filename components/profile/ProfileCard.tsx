'use client';

/**
 * Profile Card Component
 * Displays user profile with edit capability and follow functionality
 * Follows mobile-first architecture with dark theme
 */

import { useState, useEffect, useCallback } from 'react';
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
  
  // Follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [followStatusLoaded, setFollowStatusLoaded] = useState(false);

  const fetchFollowStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/profile/${profile.$id}/follow`, {
        method: 'GET',
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.success) {
        setIsFollowing(data.following);
        setFollowersCount(data.followersCount);
        setFollowingCount(data.followingCount);
      }
    } catch (error) {
      console.error('Failed to fetch follow status:', error);
    } finally {
      setFollowStatusLoaded(true);
    }
  }, [profile.$id]);

  const fetchFollowCounts = useCallback(async () => {
    try {
      const response = await fetch(`/api/profile/${profile.$id}/follow`, {
        method: 'GET',
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.success) {
        setFollowersCount(data.followersCount);
        setFollowingCount(data.followingCount);
      }
    } catch (error) {
      console.error('Failed to fetch follow counts:', error);
    } finally {
      setFollowStatusLoaded(true);
    }
  }, [profile.$id]);

  // Fetch follow status on mount
  useEffect(() => {
    if (!isOwnProfile) {
      fetchFollowStatus();
    } else {
      // For own profile, just fetch the counts
      fetchFollowCounts();
    }
  }, [isOwnProfile, fetchFollowStatus, fetchFollowCounts]);

  const handleFollowClick = async () => {
    if (isFollowLoading) return;
    
    setIsFollowLoading(true);
    
    // Optimistic update
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowersCount((prev) => (wasFollowing ? Math.max(prev - 1, 0) : prev + 1));

    try {
      const response = await fetch(`/api/profile/${profile.$id}/follow`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (!data.success) {
        // Revert on failure
        setIsFollowing(wasFollowing);
        setFollowersCount((prev) => (wasFollowing ? prev + 1 : Math.max(prev - 1, 0)));
        console.error('Follow failed:', data.error);
      } else {
        // Sync with server response
        setIsFollowing(data.following);
        setFollowersCount(data.followersCount);
      }
    } catch (error) {
      // Revert on error
      setIsFollowing(wasFollowing);
      setFollowersCount((prev) => (wasFollowing ? prev + 1 : Math.max(prev - 1, 0)));
      console.error('Follow error:', error);
    } finally {
      setIsFollowLoading(false);
    }
  };

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

      {/* Followers/Following stats */}
      {followStatusLoaded && (
        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground">{followersCount}</span> followers
          </span>
          <span>
            <span className="font-semibold text-foreground">{followingCount}</span> following
          </span>
        </div>
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
          onClick={handleFollowClick}
          variant={isFollowing ? 'outline' : 'default'}
          className={`w-full mt-4 h-10 text-sm font-medium ${
            isFollowing ? 'border-border hover:bg-secondary' : ''
          } ${isFollowLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isFollowLoading}
        >
          {isFollowLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {isFollowing ? 'Unfollowing...' : 'Following...'}
            </span>
          ) : (
            isFollowing ? 'Following' : 'Follow'
          )}
        </Button>
      )}
    </div>
  );
}
