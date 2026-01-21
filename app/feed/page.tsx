/**
 * Feed Page
 * Main feed with thread creation and public timeline
 *
 * Features:
 * - Thread composer at top
 * - Public feed with pagination
 * - Mobile-first layout with dark theme
 * - Authentication required
 */

'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { ThreadComposer } from '@/components/threads/ThreadComposer';
import { PublicFeed } from '@/components/threads/PublicFeed';
import { useState } from 'react';

function FeedContent() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleThreadCreated = () => {
    // Refresh feed by updating key
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto border-x border-border/50 min-h-screen">
        {/* Header */}
        <div className="sticky top-14 md:top-16 z-10 glass border-b border-border/50 p-4">
          <h1 className="text-xl font-bold gradient-text">Home</h1>
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
