/**
 * Feed Page
 * Main feed with public timeline
 *
 * Features:
 * - Public feed with pagination
 * - Mobile-first layout with dark theme
 * - Authentication required
 * - Create post via bottom nav + button or /create page
 * - Mobile top nav with menu and search
 */

'use client';

import { useState } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PublicFeed } from '@/components/threads/PublicFeed';
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
        {activeTab === 'following' && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <UsersIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Following Feed</h2>
            <p className="text-muted-foreground text-sm">
              Posts from people you follow will appear here
            </p>
          </div>
        )}
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

// Icons for placeholder content
function UsersIcon({ className }: { className?: string }) {
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
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
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
