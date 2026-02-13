'use client';

/**
 * Activity Page
 * Tabs: All, Follows, Replies, Mentions, Quotes, Reposts
 * Shows real notifications from the API
 * Desktop has dropdown menu, mobile has scrollable tabs
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ActivityListSkeleton } from '@/components/skeletons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { NotificationWithActor, NotificationType } from '@/types/appwrite';
import { getSessionToken } from '@/lib/appwriteClient';

type TabType = 'all' | 'follows' | 'replies' | 'likes' | 'mentions';

// API client helper
async function fetchNotifications(
  type?: NotificationType,
  cursor?: string,
  limit: number = 20,
): Promise<{
  notifications: NotificationWithActor[];
  nextCursor: string | null;
  hasMore: boolean;
  unreadCount: number;
}> {
  const sessionId = getSessionToken();
  if (!sessionId) throw new Error('Not authenticated');

  const params = new URLSearchParams();
  if (type) params.set('type', type);
  if (cursor) params.set('cursor', cursor);
  params.set('limit', limit.toString());

  const response = await fetch(`/api/notifications?${params}`, {
    headers: {
      'x-session-id': sessionId,
      'x-csrf-token': 'true',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch notifications');
  }

  return response.json();
}

async function markNotificationAsRead(
  notificationId?: string,
  all?: boolean,
): Promise<void> {
  const sessionId = getSessionToken();
  if (!sessionId) throw new Error('Not authenticated');

  const response = await fetch('/api/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': sessionId,
      'x-csrf-token': 'true',
    },
    body: JSON.stringify(all ? { all: true } : { notificationId }),
  });

  if (!response.ok) {
    throw new Error('Failed to mark notification as read');
  }
}

export default function ActivityPage() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileDropdown, setShowMobileDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);

  const tabs: { id: TabType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'follows', label: 'Follows' },
    { id: 'replies', label: 'Replies' },
    { id: 'likes', label: 'Likes' },
    { id: 'mentions', label: 'Mentions' },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
      if (
        mobileDropdownRef.current &&
        !mobileDropdownRef.current.contains(event.target as Node)
      ) {
        setShowMobileDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setShowDropdown(false);
  };

  const handleMarkAllRead = async () => {
    try {
      await markNotificationAsRead(undefined, true);
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-black pb-20 lg:pb-0">
        {/* Desktop Content Container - Fixed height with internal scroll */}
        <div className="hidden lg:flex lg:flex-col max-w-[640px] mx-auto h-screen overflow-hidden">
          {/* Fixed Header - Outside bordered area */}
          <div className="shrink-0 bg-black pt-6 pb-2">
            <div
              className="flex items-center justify-center h-12 px-4 relative"
              ref={dropdownRef}
            >
              {/* Activity dropdown trigger */}
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-1.5 text-[15px] font-medium hover:opacity-80 transition-opacity"
              >
                {tabs.find((t) => t.id === activeTab)?.label || 'Activity'}
                <ChevronDownIcon className="w-4 h-4 text-[#777]" />
              </button>

              {/* More button */}
              <button className="absolute right-4 p-2 rounded-full hover:bg-white/[0.06] transition-colors -mr-2">
                <MoreHorizontalIcon className="w-5 h-5 text-[#777]" />
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-[#181818] border border-white/[0.12] rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                  <div className="py-2">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.06] transition-colors"
                      >
                        <span
                          className={`text-[15px] text-white ${activeTab === tab.id ? 'font-medium' : ''}`}
                        >
                          {tab.label}
                        </span>
                        {activeTab === tab.id && (
                          <CheckIcon className="w-5 h-5" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Content wrapper with border and rounded corners - scrollable area contained */}
          <div className="border border-white/[0.08] rounded-t-2xl flex-1 min-h-0 overflow-y-auto bg-[#181818] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {/* Desktop Content */}
            <div className="px-2 py-1">
              <NotificationsList
                key={activeTab}
                type={
                  activeTab === 'all'
                    ? undefined
                    : activeTab === 'follows'
                      ? 'follow'
                      : activeTab === 'replies'
                        ? 'reply'
                        : activeTab === 'likes'
                          ? 'like'
                          : 'mention'
                }
                onUnreadCountChange={setUnreadCount}
              />
            </div>
          </div>
        </div>

        {/* Mobile Header with dropdown */}
        <div className="lg:hidden sticky top-14 z-30 bg-black border-b border-white/[0.08]">
          <div className="max-w-[640px] mx-auto px-4" ref={mobileDropdownRef}>
            <div className="py-3 flex items-center justify-center relative">
              {/* Activity dropdown trigger */}
              <button
                onClick={() => setShowMobileDropdown(!showMobileDropdown)}
                className="flex items-center gap-1.5 text-[15px] font-medium hover:opacity-80 transition-opacity"
              >
                {tabs.find((t) => t.id === activeTab)?.label || 'Activity'}
                <ChevronDownIcon className="w-4 h-4 text-[#777]" />
              </button>

              {/* Mark all read */}
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="absolute right-0 p-2 rounded-full hover:bg-white/[0.06] transition-colors"
                >
                  <MoreHorizontalIcon className="w-5 h-5 text-[#777]" />
                </button>
              )}

              {/* Dropdown Menu */}
              {showMobileDropdown && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-[#181818] border border-white/[0.12] rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                  <div className="py-2">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          setShowMobileDropdown(false);
                        }}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.06] transition-colors"
                      >
                        <span
                          className={`text-[15px] text-white ${activeTab === tab.id ? 'font-medium' : ''}`}
                        >
                          {tab.label}
                        </span>
                        {activeTab === tab.id && (
                          <CheckIcon className="w-5 h-5" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Content */}
        <div className="lg:hidden max-w-[640px] mx-auto px-2 py-1">
          <NotificationsList
            key={`mobile-${activeTab}`}
            type={
              activeTab === 'all'
                ? undefined
                : activeTab === 'follows'
                  ? 'follow'
                  : activeTab === 'replies'
                    ? 'reply'
                    : activeTab === 'likes'
                      ? 'like'
                      : 'mention'
            }
            onUnreadCountChange={setUnreadCount}
          />
        </div>
      </div>
    </AuthGuard>
  );
}

interface NotificationsListProps {
  type?: NotificationType;
  onUnreadCountChange?: (count: number) => void;
}

function NotificationsList({
  type,
  onUnreadCountChange,
}: NotificationsListProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationWithActor[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadNotifications = useCallback(
    async (cursor?: string) => {
      try {
        if (cursor) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
        }
        setError(null);

        const data = await fetchNotifications(type, cursor);

        if (cursor) {
          setNotifications((prev) => [...prev, ...data.notifications]);
        } else {
          setNotifications(data.notifications);
          onUnreadCountChange?.(data.unreadCount);
        }

        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load notifications',
        );
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [type, onUnreadCountChange],
  );

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleNotificationClick = async (
    notification: NotificationWithActor,
  ) => {
    // Mark as read if unread
    if (!notification.read) {
      try {
        await markNotificationAsRead(notification.$id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.$id === notification.$id ? { ...n, read: true } : n,
          ),
        );
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }

    // Navigate based on notification type
    if (notification.type === 'follow') {
      router.push(`/profile/${notification.actorId}`);
    } else if (notification.threadId) {
      router.push(`/thread/${notification.threadId}`);
    }
  };

  const getEmptyMessage = () => {
    switch (type) {
      case 'follow':
        return 'No new followers';
      case 'reply':
        return 'No replies yet';
      case 'like':
        return 'No likes yet';
      case 'mention':
        return 'No mentions yet';
      default:
        return 'No activity yet';
    }
  };

  if (isLoading) {
    return <ActivityListSkeleton count={5} />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <BellIcon className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-lg font-medium mb-1 text-white">
          Error loading activity
        </h3>
        <p className="text-sm text-[#777] mb-4">{error}</p>
        <button
          onClick={() => loadNotifications()}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-white text-black hover:bg-white/90"
        >
          Try again
        </button>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-[#1e1e1e] flex items-center justify-center mb-4">
          <BellIcon className="w-8 h-8 text-[#777]" />
        </div>
        <h3 className="text-lg font-medium mb-1 text-white">
          {getEmptyMessage()}
        </h3>
        <p className="text-sm text-[#777]">
          When there&apos;s activity, you&apos;ll see it here
        </p>
      </div>
    );
  }

  return (
    <div>
      {notifications.map((notification, index) => (
        <div key={notification.$id}>
          {index > 0 && (
            <div className="mx-3">
              <div className="border-t border-white/[0.08]" />
            </div>
          )}
          <NotificationItem
            notification={notification}
            onClick={() => handleNotificationClick(notification)}
          />
        </div>
      ))}

      {hasMore && (
        <div className="py-4 flex justify-center">
          <button
            onClick={() => loadNotifications(nextCursor || undefined)}
            disabled={isLoadingMore}
            className="px-6 py-2 text-sm font-medium rounded-lg bg-[#1e1e1e] hover:bg-[#252525] transition-colors disabled:opacity-50 text-white"
          >
            {isLoadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}

interface NotificationItemProps {
  notification: NotificationWithActor;
  onClick: () => void;
}

function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const actor = notification.actor;
  const actorName = actor?.displayName || actor?.username || 'Unknown User';
  const actorInitial = actorName[0]?.toUpperCase() || '?';

  const getActionText = () => {
    switch (notification.type) {
      case 'like':
        return 'liked your thread';
      case 'follow':
        return 'started following you';
      case 'reply':
        return 'replied to your thread';
      case 'mention':
        return 'mentioned you';
      default:
        return 'interacted with you';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 p-3 rounded-xl hover:bg-white/[0.06] transition-colors text-left ${
        !notification.read ? 'bg-blue-500/5' : ''
      }`}
    >
      {/* Avatar with type indicator */}
      <div className="relative shrink-0">
        <Avatar className="w-9 h-9 sm:w-11 sm:h-11">
          <AvatarImage src={actor?.avatarUrl || undefined} alt={actorName} />
          <AvatarFallback className="bg-linear-to-br from-primary to-accent text-white font-medium text-xs sm:text-sm">
            {actorInitial}
          </AvatarFallback>
        </Avatar>
        <div
          className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center ${getActivityIconBg(
            notification.type,
          )}`}
        >
          {getActivityIcon(notification.type)}
        </div>
        {/* Unread indicator */}
        {!notification.read && (
          <div className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-blue-500" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[15px] leading-tight">
          <Link
            href={`/profile/${notification.actorId}`}
            onClick={(e) => e.stopPropagation()}
            className="font-semibold hover:underline tracking-[-0.02em]"
          >
            {actorName}
          </Link>{' '}
          <span className="text-[#777]">{getActionText()}</span>
        </p>
        {notification.message && (
          <p className="text-[14px] text-[#777] truncate mt-0.5">
            {notification.message}
          </p>
        )}
        {notification.thread && (
          <p className="text-[14px] text-[#777] truncate mt-0.5">
            {notification.thread.content?.slice(0, 100)}
          </p>
        )}
        <p className="text-[13px] text-[#555] mt-1">
          {formatDistanceToNow(new Date(notification.createdAt), {
            addSuffix: true,
          })}
        </p>
      </div>

      {/* Follow back button for follows */}
      {notification.type === 'follow' && (
        <Link
          href={`/profile/${notification.actorId}`}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 px-4 py-1.5 text-[14px] font-semibold rounded-lg bg-[#1e1e1e] hover:bg-[#252525] transition-colors text-white"
        >
          View
        </Link>
      )}
    </button>
  );
}

function getActivityIconBg(type: NotificationType) {
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

function getActivityIcon(type: NotificationType) {
  const iconClass = 'w-2.5 h-2.5 sm:w-3 sm:h-3 text-white';
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
        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
      />
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
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 8.5v3m0 0v3m0-3h3m-3 0h-3M13 14.062V22h-2v-7.938a6 6 0 00-7-5.918V7h1.5A5.5 5.5 0 0111 12.5M13 14.062a5.48 5.48 0 00-2-1.562M13 14.062A6 6 0 0011 12.5m0 0A5.5 5.5 0 015.5 7"
      />
    </svg>
  );
}

function ReplyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
      />
    </svg>
  );
}

function AtIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 10-2.636 6.364M16.5 12V8.25"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
      />
    </svg>
  );
}

function MoreHorizontalIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  );
}


