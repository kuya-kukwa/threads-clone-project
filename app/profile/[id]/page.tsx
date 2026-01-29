/**
 * User Profile Page
 * Client Component - dynamic route for viewing user profiles
 * Includes tabs: Threads, Replies, Media, Reposts
 * Settings menu with logout for own profile
 */

'use client';

import { useEffect, useState, use } from 'react';
import { useCurrentUser, useAuth } from '@/hooks';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { UserProfile, Thread } from '@/types/appwrite';
import { 
  ProfileCardSkeleton, 
  ProfileThreadsSkeleton, 
  MediaGridSkeleton 
} from '@/components/ui/skeletons';

interface ProfilePageProps {
  params: Promise<{ id: string }>;
}

type TabType = 'threads' | 'replies' | 'media' | 'reposts';

function ProfileContent({ userId }: { userId: string }) {
  const { user } = useCurrentUser();
  const { logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('threads');
  const [showSettings, setShowSettings] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [replies, setReplies] = useState<Thread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);

  const tabs: { id: TabType; label: string }[] = [
    { id: 'threads', label: 'Threads' },
    { id: 'replies', label: 'Replies' },
    { id: 'media', label: 'Media' },
    { id: 'reposts', label: 'Reposts' },
  ];

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`/api/profile/${userId}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();

        if (data.success && data.profile) {
          setProfile(data.profile);
        } else {
          setError(data.error || 'Profile not found');
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setError('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  useEffect(() => {
    const fetchUserThreads = async () => {
      if (!profile) return;
      setLoadingThreads(true);
      try {
        // Fetch user's threads
        const response = await fetch(`/api/threads?userId=${userId}`, {
          credentials: 'include',
        });
        const data = await response.json();
        if (data.threads) {
          setThreads(data.threads);
        }
      } catch (err) {
        console.error('Failed to fetch threads:', err);
      } finally {
        setLoadingThreads(false);
      }
    };

    if (activeTab === 'threads' && profile) {
      fetchUserThreads();
    }
  }, [activeTab, profile, userId]);

  // Fetch user's replies when replies tab is active
  useEffect(() => {
    const fetchUserReplies = async () => {
      if (!profile) return;
      setLoadingReplies(true);
      try {
        // Fetch user's replies (threads with parentThreadId)
        const response = await fetch(`/api/profile/${userId}/replies`, {
          credentials: 'include',
        });
        const data = await response.json();
        if (data.success && data.replies) {
          setReplies(data.replies);
        }
      } catch (err) {
        console.error('Failed to fetch replies:', err);
      } finally {
        setLoadingReplies(false);
      }
    };

    if (activeTab === 'replies' && profile) {
      fetchUserReplies();
    }
  }, [activeTab, profile, userId]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
  };

  const isOwnProfile = user?.$id === profile?.userId;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <div className="max-w-2xl mx-auto">
          <ProfileHeader isOwnProfile={false} onSettingsClick={() => {}} />
          {/* Profile Card Skeleton */}
          <div className="px-4 py-4">
            <ProfileCardSkeleton />
          </div>
          {/* Tabs Skeleton */}
          <div className="border-b border-border/50">
            <div className="max-w-2xl mx-auto px-4">
              <div className="flex">
                {tabs.map((tab) => (
                  <div key={tab.id} className="flex-1 py-3 flex justify-center">
                    <div className="h-4 w-16 bg-secondary rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Content Skeleton */}
          <div className="px-4 py-4">
            <ProfileThreadsSkeleton count={3} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <div className="max-w-2xl mx-auto">
          <ProfileHeader isOwnProfile={false} onSettingsClick={() => {}} />
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
              <ProfileIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Profile Not Found
            </h2>
            <p className="text-muted-foreground mb-4">
              {error || 'The requested profile does not exist.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-2xl mx-auto">
        {/* Header with settings */}
        <ProfileHeader
          isOwnProfile={isOwnProfile}
          onSettingsClick={() => setShowSettings(true)}
        />

        {/* Profile Card */}
        <div className="px-4 py-4">
          <ProfileCard profile={profile} isOwnProfile={isOwnProfile} />
        </div>

        {/* Tabs */}
        <div className="sticky top-0 md:top-12 z-40 bg-background border-b border-border/50">
          <div className="max-w-2xl mx-auto px-4">
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
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

        {/* Tab Content */}
        <div className="px-4 py-4">
          {activeTab === 'threads' && (
            <ThreadsTab threads={threads} loading={loadingThreads} />
          )}
          {activeTab === 'replies' && (
            <RepliesTab replies={replies} loading={loadingReplies} />
          )}
          {activeTab === 'media' && (
            <MediaTab threads={threads} loading={loadingThreads} />
          )}
          {activeTab === 'reposts' && (
            <EmptyTab
              icon={<RepostIcon className="w-8 h-8" />}
              message="No reposts yet"
            />
          )}
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <SettingsModal
            onClose={() => setShowSettings(false)}
            onLogout={handleLogout}
            isLoggingOut={isLoggingOut}
          />
        )}
      </div>
    </div>
  );
}

function ProfileHeader({
  isOwnProfile,
  onSettingsClick,
}: {
  isOwnProfile: boolean;
  onSettingsClick: () => void;
}) {
  if (!isOwnProfile) {
    return null;
  }

  return (
    <div className="sticky top-0 z-40 bg-background">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-end h-12">
          <button
            onClick={onSettingsClick}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Settings"
          >
            <MenuIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ThreadsTab({
  threads,
  loading,
}: {
  threads: Thread[];
  loading: boolean;
}) {
  if (loading) {
    return <ProfileThreadsSkeleton count={3} />;
  }

  if (threads.length === 0) {
    return (
      <EmptyTab
        icon={<ThreadIcon className="w-8 h-8" />}
        message="No threads yet"
      />
    );
  }

  return (
    <div className="space-y-4">
      {threads.map((thread) => {
        // Parse mediaUrls from JSON string
        const mediaUrls: string[] = thread.mediaUrls
          ? (JSON.parse(thread.mediaUrls) as string[])
          : thread.imageUrl
            ? [thread.imageUrl]
            : [];

        return (
          <div
            key={thread.$id}
            className="p-4 rounded-xl bg-secondary/30 border border-border/50"
          >
            <p className="text-sm">{thread.content}</p>
            {mediaUrls.length > 0 && (
              <div className="mt-2 flex gap-2">
                {mediaUrls.slice(0, 3).map((url: string, i: number) => (
                  <div
                    key={i}
                    className="w-16 h-16 rounded-lg bg-secondary overflow-hidden"
                  >
                    {url.includes('.mp4') || url.includes('.webm') ? (
                      <video src={url} className="w-full h-full object-cover" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                ))}
                {mediaUrls.length > 3 && (
                  <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center text-sm text-muted-foreground">
                    +{mediaUrls.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MediaTab({
  threads,
  loading,
}: {
  threads: Thread[];
  loading: boolean;
}) {
  if (loading) {
    return <MediaGridSkeleton />;
  }

  // Parse mediaUrls from JSON strings and flatten
  const mediaItems: string[] = threads.flatMap((t) => {
    if (t.mediaUrls) {
      try {
        return JSON.parse(t.mediaUrls) as string[];
      } catch {
        return [];
      }
    }
    if (t.imageUrl) {
      return [t.imageUrl];
    }
    return [];
  });

  if (mediaItems.length === 0) {
    return (
      <EmptyTab
        icon={<ImageIcon className="w-8 h-8" />}
        message="No media yet"
      />
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1">
      {mediaItems.map((url: string, i: number) => (
        <div
          key={i}
          className="aspect-square rounded-lg bg-secondary overflow-hidden"
        >
          {url.includes('.mp4') || url.includes('.webm') ? (
            <video src={url} className="w-full h-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="w-full h-full object-cover" />
          )}
        </div>
      ))}
    </div>
  );
}

function RepliesTab({
  replies,
  loading,
}: {
  replies: Thread[];
  loading: boolean;
}) {
  if (loading) {
    return <ProfileThreadsSkeleton count={3} />;
  }

  if (replies.length === 0) {
    return (
      <EmptyTab
        icon={<ReplyIcon className="w-8 h-8" />}
        message="No replies yet"
      />
    );
  }

  return (
    <div className="space-y-4">
      {replies.map((reply) => {
        // Parse mediaUrls from JSON string
        const mediaUrls: string[] = reply.mediaUrls
          ? (JSON.parse(reply.mediaUrls) as string[])
          : reply.imageUrl
            ? [reply.imageUrl]
            : [];

        return (
          <div
            key={reply.$id}
            className="p-4 rounded-xl bg-secondary/30 border border-border/50"
          >
            {/* Reply context */}
            {reply.replyToUsername && (
              <p className="text-xs text-muted-foreground mb-2">
                Replying to <span className="text-primary">@{reply.replyToUsername}</span>
              </p>
            )}
            <p className="text-sm">{reply.content}</p>
            {mediaUrls.length > 0 && (
              <div className="mt-2 flex gap-2">
                {mediaUrls.slice(0, 3).map((url: string, i: number) => (
                  <div
                    key={i}
                    className="w-16 h-16 rounded-lg bg-secondary overflow-hidden"
                  >
                    {url.includes('.mp4') || url.includes('.webm') ? (
                      <video src={url} className="w-full h-full object-cover" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                ))}
                {mediaUrls.length > 3 && (
                  <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center text-sm text-muted-foreground">
                    +{mediaUrls.length - 3}
                  </div>
                )}
              </div>
            )}
            {/* Engagement stats */}
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span>{reply.likeCount} likes</span>
              <span>{reply.replyCount} replies</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyTab({
  icon,
  message,
}: {
  icon: React.ReactNode;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4 text-muted-foreground">
        {icon}
      </div>
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

function SettingsModal({
  onClose,
  onLogout,
  isLoggingOut,
}: {
  onClose: () => void;
  onLogout: () => void;
  isLoggingOut: boolean;
}) {
  // Hide bottom nav when modal is open
  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-card border border-border rounded-t-2xl md:rounded-2xl overflow-hidden animate-slide-up">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Settings</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-2">
          <button
            onClick={onLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors text-red-500"
          >
            <LogoutIcon className="w-5 h-5" />
            <span>{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
          </button>
        </div>

        {/* Safe area padding for mobile */}
        <div className="h-safe" />
      </div>
    </div>
  );
}

// Icons
function MenuIcon({ className }: { className?: string }) {
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
        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
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
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
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
        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
      />
    </svg>
  );
}

function ProfileIcon({ className }: { className?: string }) {
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
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}

function ThreadIcon({ className }: { className?: string }) {
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
        d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
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
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
      />
    </svg>
  );
}

function ImageIcon({ className }: { className?: string }) {
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
        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
      />
    </svg>
  );
}

function RepostIcon({ className }: { className?: string }) {
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
        d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3"
      />
    </svg>
  );
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const { id } = use(params);

  return (
    <AuthGuard>
      <ProfileContent userId={id} />
    </AuthGuard>
  );
}
