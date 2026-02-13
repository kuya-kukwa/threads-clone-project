'use client';

/**
 * EmbeddedActivity — Real notifications content for multi-column layout.
 * Self-contained: fetches its own data, manages its own state.
 * Renders directly into a column's scroll area (no page wrapper).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { NotificationWithActor, NotificationType } from '@/types/appwrite';
import { getSessionToken } from '@/lib/appwriteClient';

type TabType = 'all' | 'follows' | 'replies' | 'likes' | 'mentions';

const TABS: { id: TabType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'follows', label: 'Follows' },
  { id: 'replies', label: 'Replies' },
  { id: 'likes', label: 'Likes' },
  { id: 'mentions', label: 'Mentions' },
];

/* ---- API helpers ---- */

async function fetchNotifications(
  type?: NotificationType,
  cursor?: string,
  limit = 20,
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

  const res = await fetch(`/api/notifications?${params}`, {
    headers: { 'x-session-id': sessionId, 'x-csrf-token': 'true' },
  });
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

async function markNotificationAsRead(
  notificationId?: string,
  all?: boolean,
): Promise<void> {
  const sessionId = getSessionToken();
  if (!sessionId) return;

  await fetch('/api/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': sessionId,
      'x-csrf-token': 'true',
    },
    body: JSON.stringify(all ? { all: true } : { notificationId }),
  });
}

/* ---- Main Component ---- */

export function EmbeddedActivity() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  return (
    <div className="flex flex-col h-full">
      {/* Dropdown filter header */}
      <div className="shrink-0 px-4 pt-3 pb-2" ref={dropdownRef}>
        <div className="flex items-center justify-center relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1.5 text-[14px] font-medium hover:opacity-80 transition-opacity"
          >
            {TABS.find((t) => t.id === activeTab)?.label || 'All'}
            <ChevronDownIcon className="w-3.5 h-3.5 text-[#777]" />
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-44 bg-[#181818] border border-white/[0.12] rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
              <div className="py-2">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setShowDropdown(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.06] transition-colors"
                  >
                    <span
                      className={`text-[14px] text-white ${activeTab === tab.id ? 'font-medium' : ''}`}
                    >
                      {tab.label}
                    </span>
                    {activeTab === tab.id && <CheckIcon className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notifications list */}
      <div className="flex-1 min-h-0 px-2 py-1">
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
        />
      </div>
    </div>
  );
}

/* ---- Notifications List ---- */

function NotificationsList({ type }: { type?: NotificationType }) {
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
        if (cursor) setIsLoadingMore(true);
        else setIsLoading(true);
        setError(null);

        const data = await fetchNotifications(type, cursor);
        if (cursor) {
          setNotifications((prev) => [...prev, ...data.notifications]);
        } else {
          setNotifications(data.notifications);
        }
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [type],
  );

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleClick = async (n: NotificationWithActor) => {
    if (!n.read) {
      try {
        await markNotificationAsRead(n.$id);
        setNotifications((prev) =>
          prev.map((x) => (x.$id === n.$id ? { ...x, read: true } : x)),
        );
      } catch {
        /* ignore */
      }
    }
    if (n.type === 'follow') router.push(`/profile/${n.actorId}`);
    else if (n.threadId) router.push(`/thread/${n.threadId}`);
  };

  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <BellIcon className="w-8 h-8 text-[#555] mb-3" />
        <p className="text-sm text-[#777] mb-3">{error}</p>
        <button
          onClick={() => loadNotifications()}
          className="px-4 py-1.5 text-sm font-medium rounded-lg bg-white text-black hover:bg-white/90"
        >
          Retry
        </button>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BellIcon className="w-10 h-10 text-[#555] mb-3" />
        <p className="text-sm text-[#777]">No activity yet</p>
      </div>
    );
  }

  return (
    <div>
      {notifications.map((n, index) => (
        <div key={n.$id}>
          {index > 0 && (
            <div className="mx-3">
              <div className="border-t border-white/[0.08]" />
            </div>
          )}
          <NotificationItem notification={n} onClick={() => handleClick(n)} />
        </div>
      ))}
      {hasMore && (
        <div className="py-4 flex justify-center">
          <button
            onClick={() => loadNotifications(nextCursor || undefined)}
            disabled={isLoadingMore}
            className="px-5 py-1.5 text-sm font-medium rounded-lg bg-[#1e1e1e] hover:bg-[#252525] transition-colors disabled:opacity-50 text-white"
          >
            {isLoadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ---- Notification Item ---- */

function NotificationItem({
  notification,
  onClick,
}: {
  notification: NotificationWithActor;
  onClick: () => void;
}) {
  const actor = notification.actor;
  const actorName = actor?.displayName || actor?.username || 'Unknown';
  const actorInitial = actorName[0]?.toUpperCase() || '?';

  const actionText = (() => {
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
  })();

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 p-3 rounded-xl hover:bg-white/[0.06] transition-colors text-left ${
        !notification.read ? 'bg-blue-500/5' : ''
      }`}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar className="w-9 h-9">
          <AvatarImage src={actor?.avatarUrl || undefined} alt={actorName} />
          <AvatarFallback className="bg-linear-to-br from-primary to-accent text-white font-medium text-xs">
            {actorInitial}
          </AvatarFallback>
        </Avatar>
        <div
          className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ${getIconBg(notification.type)}`}
        >
          {getIcon(notification.type)}
        </div>
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
          <span className="text-[#777]">{actionText}</span>
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

/* ---- Helpers ---- */

function getIconBg(type: NotificationType) {
  switch (type) {
    case 'like':
      return 'bg-red-500';
    case 'follow':
      return 'bg-blue-500';
    case 'reply':
      return 'bg-green-500';
    case 'mention':
      return 'bg-amber-500';
    default:
      return 'bg-[#1e1e1e]';
  }
}

function getIcon(type: NotificationType) {
  const cls = 'w-2.5 h-2.5 text-white';
  switch (type) {
    case 'like':
      return <HeartIcon className={cls} />;
    case 'follow':
      return <UserPlusIcon className={cls} />;
    case 'reply':
      return <ReplyIcon className={cls} />;
    case 'mention':
      return <AtIcon className={cls} />;
    default:
      return <BellIcon className={cls} />;
  }
}

function LoadingSkeleton() {
  return (
    <div className="space-y-1 px-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3 animate-pulse">
          <div className="w-9 h-9 rounded-full bg-[#1e1e1e]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-[#1e1e1e] rounded w-3/4" />
            <div className="h-3 bg-[#1e1e1e] rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---- Icons ---- */

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
