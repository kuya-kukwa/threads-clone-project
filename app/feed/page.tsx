/**
 * Feed Page
 * Main feed with public timeline
 *
 * Features:
 * - Public feed with pagination
 * - Following feed for posts from followed users
 * - Mobile-first layout with dark theme
 * - Authentication required
 * - Create post via bottom nav + button or /create page
 * - Mobile top nav with menu and search
 * - Desktop: centered content with sidebars
 * - Desktop: modal composer like official Threads
 */

'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PublicFeed } from '@/components/threads/PublicFeed';
import { FollowingFeed } from '@/components/threads/FollowingFeed';
import { useCurrentUser } from '@/hooks';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type FeedTab = 'for-you' | 'following' | 'ghost-posts';

function FeedContent() {
  const { user } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<FeedTab>('for-you');
  const [userProfile, setUserProfile] = useState<{
    avatarUrl?: string;
    displayName?: string;
  } | null>(null);

  // Feed refresh key - increment to trigger re-fetch
  const [refreshKey, setRefreshKey] = useState(0);

  // Listen for feed-refresh events (from CreatePostModal in sidebar/floating button)
  useEffect(() => {
    const handleFeedRefresh = () => setRefreshKey((k) => k + 1);
    window.addEventListener('feed-refresh', handleFeedRefresh);
    return () => window.removeEventListener('feed-refresh', handleFeedRefresh);
  }, []);

  // Fetch user profile for avatar
  useEffect(() => {
    if (user?.$id) {
      fetch(`/api/profile/${user.$id}`, { credentials: 'include' })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.profile) {
            setUserProfile(data.profile);
          }
        })
        .catch(() => {});
    }
  }, [user?.$id]);


  return (
    <div className="min-h-screen bg-black pb-20 lg:pb-0">
      {/* Mobile Feed Tab Switcher */}
      <div className="lg:hidden">
        <div className="flex items-center justify-center gap-8 px-4 h-11 border-b border-white/[0.08]">
          <button
            onClick={() => setActiveTab('for-you')}
            className={`relative py-2.5 text-[15px] font-medium transition-colors ${
              activeTab === 'for-you' ? 'text-white' : 'text-[#777]'
            }`}
          >
            For you
            {activeTab === 'for-you' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`relative py-2.5 text-[15px] font-medium transition-colors ${
              activeTab === 'following' ? 'text-white' : 'text-[#777]'
            }`}
          >
            Following
            {activeTab === 'following' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Desktop Content Container - Fixed height with internal scroll */}
      <div className="hidden lg:flex lg:flex-col max-w-[640px] mx-auto h-screen overflow-hidden">
        {/* Fixed Header - Outside bordered area */}
        <div className="shrink-0 bg-black pt-6 pb-2">
          {/* Tabs row */}
          <div className="flex items-center h-12 px-4">
            {/* Tabs */}
            <div className="flex-1 flex items-center justify-center gap-8">
              <button
                onClick={() => setActiveTab('for-you')}
                className={`relative py-3 text-[15px] font-medium transition-colors ${
                  activeTab === 'for-you'
                    ? 'text-white'
                    : 'text-[#777] hover:text-white'
                }`}
              >
                For you
              </button>
              <button
                onClick={() => setActiveTab('following')}
                className={`relative py-3 text-[15px] font-medium transition-colors ${
                  activeTab === 'following'
                    ? 'text-white'
                    : 'text-[#777] hover:text-white'
                }`}
              >
                Following
              </button>
            </div>
            {/* More menu */}
            <button className="p-2 rounded-full hover:bg-white/[0.06] transition-colors -mr-2">
              <MoreHorizontalIcon className="w-6 h-6 text-[#777]" />
            </button>
          </div>
        </div>

        {/* Content wrapper with border and rounded corners - scrollable area contained */}
        <div className="border border-white/[0.08] rounded-t-2xl flex-1 min-h-0 overflow-y-auto bg-[#181818] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Compact Composer Card - "What's new?" */}
          <button
            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-[#1e1e1e] transition-colors text-left"
          >
            <Avatar className="w-10 h-10 shrink-0">
              <AvatarImage src={userProfile?.avatarUrl} />
              <AvatarFallback className="bg-linear-to-br from-primary to-accent text-white text-sm">
                {(userProfile?.displayName ||
                  user?.name ||
                  'U')[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="flex-1 text-[15px] text-[#777]">
              What&apos;s new?
            </span>
            <span className="px-5 py-1.5 text-[15px] font-semibold border border-white/[0.12] rounded-xl text-white/80">
              Post
            </span>
          </button>
          <div className="border-b border-white/[0.08]" />

          {/* Feed content based on active tab */}
          {activeTab === 'for-you' && <PublicFeed refreshKey={refreshKey} />}
          {activeTab === 'following' && (
            <FollowingFeed refreshKey={refreshKey} />
          )}
          {activeTab === 'ghost-posts' && (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-16 h-16 rounded-full bg-[#1e1e1e] flex items-center justify-center mb-4">
                <GhostIcon className="w-8 h-8 text-[#777]" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Feed Content */}
      <div className="lg:hidden">
        {activeTab === 'for-you' && <PublicFeed refreshKey={refreshKey} />}
        {activeTab === 'following' && <FollowingFeed refreshKey={refreshKey} />}
        {activeTab === 'ghost-posts' && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-[#1e1e1e] flex items-center justify-center mb-4">
              <GhostIcon className="w-8 h-8 text-[#777]" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GhostIcon({ className }: { className?: string }) {
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
        d="M12 2C6.48 2 2 6.48 2 12v9c0 .55.45 1 1 1h1.5c.28 0 .5-.22.5-.5v-1c0-.28.22-.5.5-.5s.5.22.5.5v1c0 .28.22.5.5.5h1c.28 0 .5-.22.5-.5v-1c0-.28.22-.5.5-.5s.5.22.5.5v1c0 .28.22.5.5.5h1c.28 0 .5-.22.5-.5v-1c0-.28.22-.5.5-.5s.5.22.5.5v1c0 .28.22.5.5.5h1c.28 0 .5-.22.5-.5v-1c0-.28.22-.5.5-.5s.5.22.5.5v1c0 .28.22.5.5.5h1c.28 0 .5-.22.5-.5v-1c0-.28.22-.5.5-.5s.5.22.5.5v1c0 .28.22.5.5.5H21c.55 0 1-.45 1-1v-9c0-5.52-4.48-10-10-10zM8 13c-.83 0-1.5-.67-1.5-1.5S7.17 10 8 10s1.5.67 1.5 1.5S8.83 13 8 13zm8 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"
      />
    </svg>
  );
}

function MoreHorizontalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}



export default function FeedPage() {
  return (
    <AuthGuard>
      <FeedContent />
    </AuthGuard>
  );
}
