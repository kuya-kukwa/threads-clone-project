/**
 * Feed Page (Placeholder)
 * Client Component - main feed after login with auth protection
 *
 * WHY CLIENT: Needs to check auth state client-side since Appwrite
 * uses client-side session management
 */

'use client';

import { useCurrentUser } from '@/hooks';
import { AuthGuard } from '@/components/auth/AuthGuard';

function FeedContent() {
  const { user } = useCurrentUser();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Feed</h1>
        <p className="text-gray-600">
          Welcome to your feed{user?.name ? `, ${user.name}` : ''}! This will be
          implemented in Milestone 2.
        </p>
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
