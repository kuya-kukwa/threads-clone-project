'use client';

/**
 * Follow List Modal — Official Threads Style
 *
 * Desktop: centered card matching the app's bg-[#181818] content card style
 * with border-border/30 rounded-2xl — same as feed/profile/activity desktop areas.
 * Mobile: bottom sheet.
 *
 * Backdrop: semi-transparent dim (not solid black) so the profile page is
 * visible but dimmed, matching official Threads behavior.
 *
 * Tabs: "Followers" / "Following" with count below, underline active indicator
 * — identical to the official Threads followers overlay.
 *
 * Performance: per-tab caching, silent prefetch, optimistic follow toggles.
 */

import { useState, useEffect, useCallback, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getSessionToken } from '@/lib/appwriteClient';

type TabType = 'followers' | 'following';

interface FollowUser {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  isFollowedByMe: boolean;
  isOwnProfile: boolean;
}

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  initialTab: TabType;
  followersCount: number;
  followingCount: number;
}

// In-memory cache
const listCache = new Map<string, { users: FollowUser[]; ts: number }>();
const CACHE_TTL = 30_000;
const key = (uid: string, tab: TabType) => `${uid}:${tab}`;

export function FollowListModal({
  isOpen,
  onClose,
  userId,
  initialTab,
  followersCount,
  followingCount,
}: FollowListModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Separate data per tab so switching is instant
  const [followersData, setFollowersData] = useState<FollowUser[]>([]);
  const [followingData, setFollowingData] = useState<FollowUser[]>([]);
  const [followersLoaded, setFollowersLoaded] = useState(false);
  const [followingLoaded, setFollowingLoaded] = useState(false);

  const [followLoadingIds, setFollowLoadingIds] = useState<Set<string>>(
    new Set(),
  );
  const [, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);

  const users = activeTab === 'followers' ? followersData : followingData;
  const loaded = activeTab === 'followers' ? followersLoaded : followingLoaded;

  /* ------------------------------------------------------------------ */
  /*  Data fetching                                                      */
  /* ------------------------------------------------------------------ */

  const fetchTab = useCallback(
    async (tab: TabType, silent = false) => {
      const k = key(userId, tab);
      const cached = listCache.get(k);
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        if (tab === 'followers') {
          setFollowersData(cached.users);
          setFollowersLoaded(true);
        } else {
          setFollowingData(cached.users);
          setFollowingLoaded(true);
        }
        return;
      }

      if (!silent) {
        if (tab === 'followers') setFollowersLoaded(false);
        else setFollowingLoaded(false);
      }

      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const sessionToken = getSessionToken();
        const headers: Record<string, string> = {};
        if (sessionToken) headers['x-session-id'] = sessionToken;

        const res = await fetch(
          `/api/profile/${userId}/follow?list=${tab}&limit=50`,
          { credentials: 'include', headers, signal: ctrl.signal },
        );
        const data = await res.json();
        if (data.success) {
          const u = data.users as FollowUser[];
          listCache.set(k, { users: u, ts: Date.now() });
          startTransition(() => {
            if (tab === 'followers') {
              setFollowersData(u);
              setFollowersLoaded(true);
            } else {
              setFollowingData(u);
              setFollowingLoaded(true);
            }
          });
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (tab === 'followers') setFollowersLoaded(true);
        else setFollowingLoaded(true);
      }
    },
    [userId, startTransition],
  );

  // On open: fetch active + prefetch other silently
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    fetchTab(initialTab);
    const other: TabType =
      initialTab === 'followers' ? 'following' : 'followers';
    const t = setTimeout(() => fetchTab(other, true), 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userId]);

  useEffect(() => {
    if (isOpen) setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => () => abortRef.current?.abort(), []);

  /* ------------------------------------------------------------------ */
  /*  Handlers                                                           */
  /* ------------------------------------------------------------------ */

  const handleTabSwitch = (tab: TabType) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    if (!(tab === 'followers' ? followersLoaded : followingLoaded))
      fetchTab(tab);
  };

  const handleFollowToggle = async (
    targetUserId: string,
    currentlyFollowing: boolean,
  ) => {
    setFollowLoadingIds((p) => new Set(p).add(targetUserId));

    const apply = (l: FollowUser[]) =>
      l.map((u) =>
        u.userId === targetUserId
          ? { ...u, isFollowedByMe: !currentlyFollowing }
          : u,
      );
    setFollowersData(apply);
    setFollowingData(apply);
    listCache.delete(key(userId, 'followers'));
    listCache.delete(key(userId, 'following'));

    try {
      const sessionToken = getSessionToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-CSRF-Token': 'true',
      };
      if (sessionToken) headers['x-session-id'] = sessionToken;

      const res = await fetch(`/api/profile/${targetUserId}/follow`, {
        method: 'POST',
        credentials: 'include',
        headers,
      });
      const data = await res.json();
      if (!data.success) {
        const revert = (l: FollowUser[]) =>
          l.map((u) =>
            u.userId === targetUserId
              ? { ...u, isFollowedByMe: currentlyFollowing }
              : u,
          );
        setFollowersData(revert);
        setFollowingData(revert);
      }
    } catch {
      const revert = (l: FollowUser[]) =>
        l.map((u) =>
          u.userId === targetUserId
            ? { ...u, isFollowedByMe: currentlyFollowing }
            : u,
        );
      setFollowersData(revert);
      setFollowingData(revert);
    } finally {
      setFollowLoadingIds((p) => {
        const n = new Set(p);
        n.delete(targetUserId);
        return n;
      });
    }
  };

  const handleUserClick = (id: string) => {
    onClose();
    router.push(`/profile/${id}`);
  };

  if (!isOpen) return null;

  /* ------------------------------------------------------------------ */
  /*  Render                                                              */
  /* ------------------------------------------------------------------ */

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop — semi-transparent dim so profile page is visible but darkened */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal container */}
      <div className="absolute inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-[480px] sm:mx-4">
        <div className="bg-[#181818] rounded-t-2xl sm:rounded-2xl border border-border/30 max-h-[85vh] sm:max-h-[70vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:fade-in sm:zoom-in-95 duration-200 shadow-2xl">
          {/* Tabs — official Threads style: label + count, underline active */}
          <div className="flex shrink-0 border-b border-border/30 px-2 sm:px-3">
            <button
              onClick={() => handleTabSwitch('followers')}
              className={`flex-1 flex flex-col items-center justify-center py-4 sm:py-5 transition-colors relative ${
                activeTab === 'followers'
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground/70'
              }`}
            >
              <span className="text-[15px] font-semibold">Followers</span>
              <span className="text-sm text-muted-foreground mt-0.5">
                {followersCount}
              </span>
              {activeTab === 'followers' && (
                <span className="absolute bottom-0 inset-x-0 h-[1.5px] bg-foreground" />
              )}
            </button>
            <button
              onClick={() => handleTabSwitch('following')}
              className={`flex-1 flex flex-col items-center justify-center py-4 sm:py-5 transition-colors relative ${
                activeTab === 'following'
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground/70'
              }`}
            >
              <span className="text-[15px] font-semibold">Following</span>
              <span className="text-sm text-muted-foreground mt-0.5">
                {followingCount}
              </span>
              {activeTab === 'following' && (
                <span className="absolute bottom-0 inset-x-0 h-[1.5px] bg-foreground" />
              )}
            </button>
          </div>

          {/* User list */}
          <div className="flex-1 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {!loaded ? (
              <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <FollowUserSkeleton key={i} />
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 sm:py-24 px-6">
                <p className="text-muted-foreground text-sm">
                  {activeTab === 'followers'
                    ? 'No followers yet'
                    : 'Not following anyone yet'}
                </p>
              </div>
            ) : (
              <div className="py-2 sm:py-3">
                {users.map((user, i) => (
                  <div key={user.userId}>
                    <FollowUserItem
                      user={user}
                      loading={followLoadingIds.has(user.userId)}
                      onFollow={() =>
                        handleFollowToggle(user.userId, user.isFollowedByMe)
                      }
                      onClick={() => handleUserClick(user.userId)}
                    />
                    {i < users.length - 1 && (
                      <div className="ml-[56px] sm:ml-[62px] mr-4 sm:mr-6">
                        <div className="h-px bg-border/40" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ====================================================================== */
/*  Sub-components                                                         */
/* ====================================================================== */

function FollowUserItem({
  user,
  loading,
  onFollow,
  onClick,
}: {
  user: FollowUser;
  loading: boolean;
  onFollow: () => void;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-3.5 hover:bg-white/[0.04] transition-colors">
      <button onClick={onClick} className="shrink-0">
        <Avatar className="w-9 h-9 sm:w-10 sm:h-10">
          <AvatarImage
            src={user.avatarUrl || undefined}
            alt={user.displayName}
          />
          <AvatarFallback className="bg-[#333] text-white text-sm font-medium">
            {user.displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </button>

      <button onClick={onClick} className="flex-1 min-w-0 text-left">
        <p className="text-[15px] font-semibold text-foreground truncate leading-tight tracking-[-0.02em]">
          {user.username}
        </p>
        <p className="text-[14px] text-muted-foreground truncate leading-tight mt-0.5">
          {user.displayName}
        </p>
      </button>

      {!user.isOwnProfile && (
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onFollow();
          }}
          variant={user.isFollowedByMe ? 'outline' : 'default'}
          size="sm"
          className={`shrink-0 h-8 min-w-[90px] text-[13px] font-semibold rounded-xl border ${
            user.isFollowedByMe
              ? 'border-border/50 bg-transparent hover:bg-white/[0.06]'
              : 'border-transparent'
          } ${loading ? 'opacity-50 pointer-events-none' : ''}`}
          disabled={loading}
        >
          {user.isFollowedByMe ? 'Following' : 'Follow'}
        </Button>
      )}
    </div>
  );
}

function FollowUserSkeleton() {
  return (
    <div className="flex items-center gap-3 py-0.5">
      <Skeleton className="w-9 h-9 sm:w-10 sm:h-10 rounded-full shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-8 w-[90px] rounded-xl shrink-0" />
    </div>
  );
}
