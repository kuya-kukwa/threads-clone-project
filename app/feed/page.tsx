/**
 * Feed Page
 * Main feed with public timeline
 *
 * Features:
 * - Public feed with pagination
 * - Mobile-first layout with dark theme
 * - Authentication required
 * - Create post via bottom nav + button or /create page
 */

'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { PublicFeed } from '@/components/threads/PublicFeed';

function FeedContent() {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-2xl mx-auto">
        {/* Public Feed */}
        <PublicFeed />
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
