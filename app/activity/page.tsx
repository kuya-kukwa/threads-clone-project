'use client';

/**
 * Activity Page
 * Tabs: All, Follows, Conversations, Mentions
 * Shows notifications and activity feed
 */

import { useState } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { formatDistanceToNow } from 'date-fns';

type TabType = 'all' | 'follows' | 'conversations' | 'mentions';

export default function ActivityPage() {
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const tabs: { id: TabType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'follows', label: 'Follows' },
    { id: 'conversations', label: 'Conversations' },
    { id: 'mentions', label: 'Mentions' },
  ];

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        {/* Header with tabs */}
        <div className="sticky top-12 z-40 glass border-b border-border/50">
          <div className="max-w-2xl mx-auto px-4">
            {/* Title */}
            <div className="py-3">
              <h1 className="text-lg font-semibold">Activity</h1>
            </div>

            {/* Tabs - scrollable on mobile */}
            <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-4 px-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-shrink-0 py-3 px-4 text-sm font-medium transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto px-4 py-4">
          {activeTab === 'all' && <AllActivity />}
          {activeTab === 'follows' && <FollowsActivity />}
          {activeTab === 'conversations' && <ConversationsActivity />}
          {activeTab === 'mentions' && <MentionsActivity />}
        </div>
      </div>
    </AuthGuard>
  );
}

// Mock data - in real app, fetch from API
const mockActivities = {
  all: [
    {
      id: '1',
      type: 'like',
      user: { name: 'John Doe', avatar: null },
      action: 'liked your thread',
      time: new Date(Date.now() - 5 * 60000),
      preview: 'This is an amazing post about...',
    },
    {
      id: '2',
      type: 'follow',
      user: { name: 'Jane Smith', avatar: null },
      action: 'started following you',
      time: new Date(Date.now() - 30 * 60000),
    },
    {
      id: '3',
      type: 'reply',
      user: { name: 'Alex Johnson', avatar: null },
      action: 'replied to your thread',
      time: new Date(Date.now() - 2 * 3600000),
      preview: 'Great point! I think...',
    },
    {
      id: '4',
      type: 'mention',
      user: { name: 'Sam Wilson', avatar: null },
      action: 'mentioned you',
      time: new Date(Date.now() - 5 * 3600000),
      preview: 'Hey @you check this out!',
    },
  ],
  follows: [
    {
      id: '1',
      type: 'follow',
      user: { name: 'Jane Smith', avatar: null },
      action: 'started following you',
      time: new Date(Date.now() - 30 * 60000),
    },
    {
      id: '2',
      type: 'follow',
      user: { name: 'Mike Brown', avatar: null },
      action: 'started following you',
      time: new Date(Date.now() - 2 * 86400000),
    },
  ],
  conversations: [
    {
      id: '1',
      type: 'reply',
      user: { name: 'Alex Johnson', avatar: null },
      action: 'replied to your thread',
      time: new Date(Date.now() - 2 * 3600000),
      preview: 'Great point! I think...',
    },
  ],
  mentions: [
    {
      id: '1',
      type: 'mention',
      user: { name: 'Sam Wilson', avatar: null },
      action: 'mentioned you',
      time: new Date(Date.now() - 5 * 3600000),
      preview: 'Hey @you check this out!',
    },
  ],
};

function AllActivity() {
  return <ActivityList activities={mockActivities.all} emptyMessage="No activity yet" />;
}

function FollowsActivity() {
  return <ActivityList activities={mockActivities.follows} emptyMessage="No new followers" />;
}

function ConversationsActivity() {
  return <ActivityList activities={mockActivities.conversations} emptyMessage="No conversations yet" />;
}

function MentionsActivity() {
  return <ActivityList activities={mockActivities.mentions} emptyMessage="No mentions yet" />;
}

function ActivityList({
  activities,
  emptyMessage,
}: {
  activities: typeof mockActivities.all;
  emptyMessage: string;
}) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <BellIcon className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-1">{emptyMessage}</h3>
        <p className="text-sm text-muted-foreground">
          When there&apos;s activity, you&apos;ll see it here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((activity) => (
        <button
          key={activity.id}
          className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors text-left"
        >
          {/* Avatar with type indicator */}
          <div className="relative flex-shrink-0">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-medium">
              {activity.user.name[0]}
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center ${getActivityIconBg(activity.type)}`}>
              {getActivityIcon(activity.type)}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-semibold">{activity.user.name}</span>{' '}
              <span className="text-muted-foreground">{activity.action}</span>
            </p>
            {activity.preview && (
              <p className="text-sm text-muted-foreground truncate mt-0.5">
                {activity.preview}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(activity.time, { addSuffix: true })}
            </p>
          </div>

          {/* Follow back button for follows */}
          {activity.type === 'follow' && (
            <button className="flex-shrink-0 px-4 py-1.5 text-sm font-medium rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
              Follow
            </button>
          )}
        </button>
      ))}
    </div>
  );
}

function getActivityIconBg(type: string) {
  switch (type) {
    case 'like':
      return 'bg-red-500';
    case 'follow':
      return 'bg-primary';
    case 'reply':
      return 'bg-green-500';
    case 'mention':
      return 'bg-amber-500';
    default:
      return 'bg-secondary';
  }
}

function getActivityIcon(type: string) {
  const iconClass = 'w-3 h-3 text-white';
  switch (type) {
    case 'like':
      return <HeartIcon className={iconClass} />;
    case 'follow':
      return <UserPlusIcon className={iconClass} />;
    case 'reply':
      return <ReplyIcon className={iconClass} />;
    case 'mention':
      return <AtIcon className={iconClass} />;
    default:
      return <BellIcon className={iconClass} />;
  }
}

// Icons
function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
    </svg>
  );
}

function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 8.5v3m0 0v3m0-3h3m-3 0h-3M13 14.062V22h-2v-7.938a6 6 0 00-7-5.918V7h1.5A5.5 5.5 0 0111 12.5M13 14.062a5.48 5.48 0 00-2-1.562M13 14.062A6 6 0 0011 12.5m0 0A5.5 5.5 0 015.5 7" />
    </svg>
  );
}

function ReplyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
    </svg>
  );
}

function AtIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 10-2.636 6.364M16.5 12V8.25" />
    </svg>
  );
}
