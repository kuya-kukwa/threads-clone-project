/**
 * Feed Page
 * Main feed with public timeline
 *
 * Features:
 * - Public feed with pagination
 * - Following feed for posts from followed users
 * - Mobile-first layout with dark theme
 * - Authentication required
 * - Create post via bottom nav + button or /create page
 * - Mobile top nav with menu and search
 * - Desktop: centered content with sidebars
 * - Desktop: modal composer like official Threads
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PublicFeed } from '@/components/threads/PublicFeed';
import { FollowingFeed } from '@/components/threads/FollowingFeed';
import { MobileTopNav } from '@/components/layout/MobileTopNav';
import { useCurrentUser } from '@/hooks';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getSessionToken } from '@/lib/appwriteClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type FeedTab = 'for-you' | 'following' | 'ghost-posts';

const MAX_CHARS = 500;

function FeedContent() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<FeedTab>('for-you');
  const [userProfile, setUserProfile] = useState<{
    avatarUrl?: string;
    displayName?: string;
  } | null>(null);

  // Feed refresh key - increment to trigger re-fetch
  const [refreshKey, setRefreshKey] = useState(0);

  // Listen for feed-refresh events (from CreatePostModal in sidebar/floating button)
  useEffect(() => {
    const handleFeedRefresh = () => setRefreshKey((k) => k + 1);
    window.addEventListener('feed-refresh', handleFeedRefresh);
    return () => window.removeEventListener('feed-refresh', handleFeedRefresh);
  }, []);

  // Modal composer state
  const [showComposer, setShowComposer] = useState(false);
  const [composerContent, setComposerContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charsRemaining = MAX_CHARS - composerContent.length;
  const canPost = composerContent.trim().length > 0;

  // Fetch user profile for avatar
  useEffect(() => {
    if (user?.$id) {
      fetch(`/api/profile/${user.$id}`, { credentials: 'include' })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.profile) {
            setUserProfile(data.profile);
          }
        })
        .catch(() => {});
    }
  }, [user?.$id]);

  // Auto-resize textarea in modal
  useEffect(() => {
    if (textareaRef.current && showComposer) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      textareaRef.current.focus();
    }
  }, [composerContent, showComposer]);

  // Handle post submission from modal
  const handleSubmitPost = async () => {
    if (!canPost || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const sessionId = getSessionToken();
      if (!sessionId) {
        setIsSubmitting(false);
        return;
      }

      const response = await fetch('/api/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
          'X-CSRF-Token': 'true',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: composerContent.trim(),
        }),
      });

      if (response.ok) {
        setComposerContent('');
        setShowComposer(false);
        setRefreshKey((k) => k + 1);
        window.dispatchEvent(new CustomEvent('feed-refresh'));
      }
    } catch {
      // Handle error silently
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      {/* Mobile Top Navigation - hidden on lg+ */}
      <div className="lg:hidden">
        <MobileTopNav
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as FeedTab)}
        />
      </div>

      {/* Desktop Content Container - Fixed height with internal scroll */}
      <div className="hidden lg:flex lg:flex-col max-w-160 mx-auto lg:pl-6 lg:pr-4 h-screen overflow-hidden">
        {/* Fixed Header - Outside bordered area */}
        <div className="shrink-0 bg-background pt-6 pb-2">
          {/* Tabs row */}
          <div className="flex items-center h-12 px-4">
            {/* Tabs */}
            <div className="flex-1 flex items-center justify-center gap-8">
              <button
                onClick={() => setActiveTab('for-you')}
                className={`relative py-3 text-[15px] font-medium transition-colors ${
                  activeTab === 'for-you'
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                For you
              </button>
              <button
                onClick={() => setActiveTab('following')}
                className={`relative py-3 text-[15px] font-medium transition-colors ${
                  activeTab === 'following'
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Following
              </button>
            </div>
            {/* More menu */}
            <button className="p-2 rounded-full hover:bg-secondary/50 transition-colors -mr-2">
              <MoreHorizontalIcon className="w-6 h-6 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content wrapper with border and rounded corners - scrollable area contained */}
        <div className="border border-border/30 rounded-t-2xl flex-1 min-h-0 overflow-y-auto bg-[#181818] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Compact Composer Card - "What's new?" - Opens modal on desktop */}
          <button
            onClick={() => setShowComposer(true)}
            className="flex items-center gap-3 w-full px-4 py-4 hover:bg-[#1e1e1e] transition-colors text-left"
          >
            <Avatar className="w-10 h-10 shrink-0">
              <AvatarImage src={userProfile?.avatarUrl} />
              <AvatarFallback className="bg-linear-to-br from-primary to-accent text-white text-sm">
                {(userProfile?.displayName ||
                  user?.name ||
                  'U')[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="flex-1 text-[15px] text-muted-foreground">
              What&apos;s new?
            </span>
            <span className="px-5 py-1.5 text-[15px] font-semibold border border-border/50 rounded-xl text-foreground/80">
              Post
            </span>
          </button>
          <div className="border-b border-border/30" />

          {/* Feed content based on active tab */}
          {activeTab === 'for-you' && <PublicFeed refreshKey={refreshKey} />}
          {activeTab === 'following' && (
            <FollowingFeed refreshKey={refreshKey} />
          )}
          {activeTab === 'ghost-posts' && (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <GhostIcon className="w-8 h-8 text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Feed Content */}
      <div className="lg:hidden">
        {activeTab === 'for-you' && <PublicFeed refreshKey={refreshKey} />}
        {activeTab === 'following' && <FollowingFeed refreshKey={refreshKey} />}
        {activeTab === 'ghost-posts' && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <GhostIcon className="w-8 h-8 text-muted-foreground" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GhostIcon({ className }: { className?: string }) {
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
        d="M12 2C6.48 2 2 6.48 2 12v9c0 .55.45 1 1 1h1.5c.28 0 .5-.22.5-.5v-1c0-.28.22-.5.5-.5s.5.22.5.5v1c0 .28.22.5.5.5h1c.28 0 .5-.22.5-.5v-1c0-.28.22-.5.5-.5s.5.22.5.5v1c0 .28.22.5.5.5h1c.28 0 .5-.22.5-.5v-1c0-.28.22-.5.5-.5s.5.22.5.5v1c0 .28.22.5.5.5h1c.28 0 .5-.22.5-.5v-1c0-.28.22-.5.5-.5s.5.22.5.5v1c0 .28.22.5.5.5h1c.28 0 .5-.22.5-.5v-1c0-.28.22-.5.5-.5s.5.22.5.5v1c0 .28.22.5.5.5H21c.55 0 1-.45 1-1v-9c0-5.52-4.48-10-10-10zM8 13c-.83 0-1.5-.67-1.5-1.5S7.17 10 8 10s1.5.67 1.5 1.5S8.83 13 8 13zm8 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"
      />
    </svg>
  );
}

function MoreHorizontalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

function DraftsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
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
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function GifIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <text
        x="12"
        y="14"
        textAnchor="middle"
        fontSize="6"
        fill="currentColor"
        stroke="none"
        fontWeight="bold"
      >
        GIF
      </text>
    </svg>
  );
}

function EmojiIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line
        x1="9"
        y1="9"
        x2="9.01"
        y2="9"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <line
        x1="15"
        y1="9"
        x2="15.01"
        y2="9"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}

function HashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  );
}

function PollIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="7" y1="8" x2="17" y2="8" />
      <line x1="7" y1="12" x2="14" y2="12" />
      <line x1="7" y1="16" x2="11" y2="16" />
    </svg>
  );
}

function LocationIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path d="M12 21s-8-7.5-8-12a8 8 0 1 1 16 0c0 4.5-8 12-8 12z" />
      <circle cx="12" cy="9" r="3" />
    </svg>
  );
}

function ReplyOptionsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

export default function FeedPage() {
  return (
    <AuthGuard>
      <FeedContent />
    </AuthGuard>
  );
}
