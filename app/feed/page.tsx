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
 */

'use client';

import { useState } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PublicFeed } from '@/components/threads/PublicFeed';
import { FollowingFeed } from '@/components/threads/FollowingFeed';
import { MobileTopNav } from '@/components/layout/MobileTopNav';

type FeedTab = 'for-you' | 'following' | 'likes';

function FeedContent() {
  const [activeTab, setActiveTab] = useState<FeedTab>('for-you');

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Mobile Top Navigation */}
      <MobileTopNav activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="max-w-2xl mx-auto">
        {/* Feed content based on active tab */}
        {activeTab === 'for-you' && <PublicFeed />}
        {activeTab === 'following' && <FollowingFeed />}
        {activeTab === 'likes' && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <HeartIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Liked Posts</h2>
            <p className="text-muted-foreground text-sm">
              Posts you&apos;ve liked will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function HeartIcon({ className }: { className?: string }) {
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
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
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
