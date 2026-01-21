/**
 * Feed Page
 * Main feed with thread creation and public timeline
 * 
 * Features:
 * - Thread composer at top
 * - Public feed with pagination
 * - Mobile-first layout
 * - Authentication required
 */

'use client';

import { useCurrentUser } from '@/hooks';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ThreadComposer } from '@/components/threads/ThreadComposer';
import { PublicFeed } from '@/components/threads/PublicFeed';
import { useState } from 'react';

function FeedContent() {
  const { user } = useCurrentUser();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleThreadCreated = () => {
    // Refresh feed by updating key
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto border-x min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b p-4">
          <h1 className="text-xl font-bold">Home</h1>
        </div>

        {/* Thread Composer */}
        <ThreadComposer onSuccess={handleThreadCreated} />

        {/* Public Feed */}
        <PublicFeed key={refreshKey} />
      </div>
    </div>
  );
}

export default function FeedPage() {
  return (
    <AuthGuard>
      <FeedContent />
    </AuthGuard>
  );
}
