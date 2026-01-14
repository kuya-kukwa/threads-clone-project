/**
 * Feed Page (Placeholder)
 * Server Component - main feed after login
 *
 * WHY: Redirect target after successful login
 * TODO: Implement actual feed in Milestone 2
 */

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Feed | Threads Clone',
  description: 'Your personalized feed',
};

export default function FeedPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Feed</h1>
        <p className="text-gray-600">
          Welcome to your feed! This will be implemented in Milestone 2.
        </p>
      </div>
    </div>
  );
}
