'use client';

/**
 * Create Post Page — Authentic Threads Full-Screen Composer
 *
 * Mobile-optimized full-screen thread creation with:
 * - Avatar + thread line UI identical to official Threads
 * - Emoji picker, topic tags, location, audience selector
 * - Media grid with smart aspect ratio handling
 * - Circular character counter
 * - Upload progress with spinner
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useCurrentUser } from '@/hooks';
import { getSessionToken } from '@/lib/appwriteClient';
import { UserProfile } from '@/types/appwrite';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ImageAttachIcon,
  GifIcon,
  CloseCircleIcon,
} from '@/components/icons/ThreadsIcons';
import { TopicSelector } from '@/components/threads/TopicSelector';
import { EmojiPicker } from '@/components/threads/EmojiPicker';
import { LocationPicker } from '@/components/threads/LocationPicker';
import { ThreadsSpinner } from '@/components/skeletons';
import {
  AudienceSelector,
  type AudienceType,
} from '@/components/threads/AudienceSelector';
import { cn } from '@/lib/utils';

const MAX_CHARS = 500;
const MAX_FILES = 4;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export default function CreatePage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<
    { url: string; type: 'image' | 'video' }[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [audience, setAudience] = useState<AudienceType>('anyone');
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charsRemaining = MAX_CHARS - content.length;
  const charPercentage = Math.min(100, (content.length / MAX_CHARS) * 100);
  const isOverLimit = charsRemaining < 0;
  const canPost =
    (content.trim().length > 0 || mediaFiles.length > 0) && !isOverLimit;
  const hasUnsavedContent =
    content.trim().length > 0 ||
    mediaFiles.length > 0 ||
    selectedTopic !== null ||
    selectedLocation !== null;

  const handleCancel = useCallback(() => {
    if (hasUnsavedContent && !isSubmitting) {
      setShowDiscardConfirm(true);
    } else {
      router.push('/feed');
    }
  }, [hasUnsavedContent, isSubmitting, router]);

  // Fetch user profile to get avatar
  useEffect(() => {
    if (user?.$id) {
      fetch(`/api/profile/${user.$id}`, {
        credentials: 'include',
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.profile) {
            setUserProfile(data.profile);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch user profile:', err);
        });
    }
  }, [user?.$id]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    setContent((prev) => prev + emoji);
    textareaRef.current?.focus();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file count
    if (mediaFiles.length + files.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    // Validate each file
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`File ${file.name} exceeds 50MB limit`);
        return;
      }
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        setError(`File ${file.name} is not a supported format`);
        return;
      }
    }

    setError(null);

    // Add files and generate previews
    const newFiles = [...mediaFiles, ...files];
    setMediaFiles(newFiles);

    const newPreviews = files.map((file) => ({
      url: URL.createObjectURL(file),
      type: (file.type.startsWith('video/') ? 'video' : 'image') as
        | 'image'
        | 'video',
    }));
    setMediaPreviews([...mediaPreviews, ...newPreviews]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeMedia = (index: number) => {
    URL.revokeObjectURL(mediaPreviews[index].url);
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
    setMediaPreviews(mediaPreviews.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!canPost || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Get session token for authenticated requests
      const sessionId = getSessionToken();
      if (!sessionId) {
        setError('Please log in to post');
        setIsSubmitting(false);
        return;
      }

      // Store uploaded media items for API
      let uploadedMedia: {
        id: string;
        url: string;
        type: 'image' | 'video';
        altText?: string;
      }[] = [];

      if (mediaFiles.length > 0) {
        setUploadProgress('Uploading media...');

        // Use multi-media upload endpoint for batch upload
        const formData = new FormData();
        mediaFiles.forEach((file, index) => {
          formData.append(`file${index}`, file);
          formData.append(`altText${index}`, '');
        });

        const response = await fetch('/api/upload/media', {
          method: 'POST',
          headers: {
            'x-session-id': sessionId,
            'X-CSRF-Token': 'true',
          },
          credentials: 'include',
          body: formData,
        });

        if (!response.ok) {
          // Handle non-JSON error responses (like "Request Entity Too Large")
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload files');
          } else {
            // Non-JSON response - likely server error like body too large
            if (response.status === 413) {
              throw new Error('File too large. Videos must be under 50MB.');
            }
            throw new Error(`Upload failed (${response.status}): Server error`);
          }
        }

        const uploadResult = await response.json();
        if (uploadResult.success && uploadResult.media) {
          uploadedMedia = uploadResult.media;
        } else {
          throw new Error(uploadResult.error || 'Upload failed');
        }
      }

      setUploadProgress('Creating post...');

      // Create thread
      const threadResponse = await fetch('/api/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
          'X-CSRF-Token': 'true',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: content.trim(),
          media: uploadedMedia.length > 0 ? uploadedMedia : undefined,
          topic: selectedTopic || undefined,
          location: selectedLocation || undefined,
          audience: audience || 'anyone',
        }),
      });

      if (!threadResponse.ok) {
        const contentType = threadResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const threadError = await threadResponse.json();
          throw new Error(threadError.error || 'Failed to create post');
        } else {
          throw new Error(`Failed to create post (${threadResponse.status})`);
        }
      }

      // Clean up previews
      mediaPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));

      // Navigate to feed
      window.dispatchEvent(new CustomEvent('feed-refresh'));
      router.push('/feed');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
      setUploadProgress(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-black flex flex-col pb-20 lg:pb-0">
        {/* Mobile Layout */}
        <div className="lg:hidden max-w-[640px] mx-auto w-full flex-1">
          {/* Mobile Header */}
          <div className="sticky top-0 z-50 bg-black">
            <div className="px-4">
              <div className="flex items-center justify-between h-14">
                <Link
                  href="/feed"
                  onClick={(e) => {
                    if (hasUnsavedContent) {
                      e.preventDefault();
                      handleCancel();
                    }
                  }}
                  className="text-[15px] text-[#f3f5f7] hover:text-white transition-colors"
                >
                  Cancel
                </Link>
                <h1 className="text-[15px] font-semibold text-white">
                  New thread
                </h1>
                <button
                  onClick={handleSubmit}
                  disabled={!canPost || isSubmitting}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-[14px] font-semibold transition-all',
                    canPost && !isSubmitting
                      ? 'bg-white text-black hover:bg-white/90 active:scale-95'
                      : 'bg-white/[0.15] text-white/[0.35] cursor-not-allowed',
                  )}
                >
                  {isSubmitting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
            <div className="h-px bg-white/[0.08]" />
          </div>

          {/* Composer */}
          <div className="flex-1 w-full px-4 py-4">
            <div className="flex gap-3">
              {/* User avatar with thread line */}
              <div className="flex flex-col items-center">
                <Avatar className="w-9 h-9 shrink-0">
                  <AvatarImage
                    src={userProfile?.avatarUrl || undefined}
                    alt={userProfile?.displayName || user?.name || 'User'}
                  />
                  <AvatarFallback className="bg-[#333] text-white font-semibold text-sm">
                    {(userProfile?.displayName ||
                      user?.name ||
                      'U')[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {/* Thread line */}
                <div className="w-0.5 flex-1 min-h-8 bg-white/[0.12] mt-2 rounded-full" />
              </div>

              {/* Content area */}
              <div className="flex-1 min-w-0 pt-0.5">
                {/* Username */}
                <p className="text-[15px] font-semibold text-white tracking-[-0.01em]">
                  {userProfile?.displayName || user?.name || 'User'}
                </p>

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's new?"
                  maxLength={MAX_CHARS + 50}
                  className="w-full bg-transparent border-0 resize-none text-[15px] leading-[1.45] text-white placeholder:text-[#777] focus:outline-none mt-1 min-h-[60px]"
                  autoFocus
                  rows={1}
                />

                {/* Media previews */}
                {mediaPreviews.length > 0 && (
                  <div
                    className={cn(
                      'grid gap-1.5 mt-2',
                      mediaPreviews.length === 1
                        ? 'grid-cols-1 max-w-[280px]'
                        : 'grid-cols-2',
                    )}
                  >
                    {mediaPreviews.map((preview, index) => (
                      <div
                        key={index}
                        className={cn(
                          'relative rounded-xl overflow-hidden bg-[#0a0a0a]',
                          mediaPreviews.length === 1
                            ? 'aspect-[4/3]'
                            : mediaPreviews.length === 3 && index === 0
                              ? 'row-span-2 aspect-[3/4]'
                              : 'aspect-square',
                        )}
                      >
                        {preview.type === 'video' ? (
                          <video
                            src={preview.url}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={preview.url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )}
                        {/* Remove button */}
                        <button
                          onClick={() => removeMedia(index)}
                          className="absolute top-1.5 right-1.5 text-white/80 hover:text-white transition-colors drop-shadow-lg"
                        >
                          <CloseCircleIcon className="w-6 h-6" />
                        </button>
                        {/* Video badge */}
                        {preview.type === 'video' && (
                          <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[11px] text-white flex items-center gap-1">
                            <PlayIcon className="w-3 h-3" />
                            Video
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Tags row: topic + location pills */}
                {(selectedTopic || selectedLocation) && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                    {selectedTopic && (
                      <TopicSelector
                        selectedTopic={selectedTopic}
                        onSelectTopic={setSelectedTopic}
                      />
                    )}
                    {selectedLocation && (
                      <LocationPicker
                        selectedLocation={selectedLocation}
                        onSelectLocation={setSelectedLocation}
                      />
                    )}
                  </div>
                )}

                {/* Toolbar */}
                <div className="flex items-center gap-0.5 mt-3">
                  {/* Media */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={mediaFiles.length >= MAX_FILES}
                    className="p-2 rounded-full hover:bg-white/[0.06] transition-colors disabled:opacity-30 text-[#777] hover:text-[#999]"
                    title="Add photos or videos"
                  >
                    <ImageAttachIcon className="w-5 h-5" />
                  </button>

                  {/* GIF */}
                  <button
                    disabled
                    className="p-2 rounded-full hover:bg-white/[0.06] transition-colors text-[#777] hover:text-[#999] disabled:opacity-30"
                    title="GIF coming soon"
                  >
                    <GifIcon className="w-5 h-5" />
                  </button>

                  {/* Emoji */}
                  <EmojiPicker onEmojiSelect={handleEmojiSelect} />

                  {/* Location */}
                  {!selectedLocation && (
                    <LocationPicker
                      selectedLocation={selectedLocation}
                      onSelectLocation={setSelectedLocation}
                    />
                  )}

                  {/* Topic */}
                  {!selectedTopic && (
                    <TopicSelector
                      selectedTopic={selectedTopic}
                      onSelectTopic={setSelectedTopic}
                    />
                  )}

                  <div className="flex-1" />

                  {/* Character count */}
                  {content.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="relative w-5 h-5">
                        <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
                          <circle
                            cx="10"
                            cy="10"
                            r="8"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-white/[0.08]"
                          />
                          <circle
                            cx="10"
                            cy="10"
                            r="8"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeDasharray={`${charPercentage * 0.502} 50.265`}
                            strokeLinecap="round"
                            className={cn(
                              isOverLimit
                                ? 'text-red-500'
                                : charsRemaining < 20
                                  ? 'text-amber-500'
                                  : 'text-[#555]',
                            )}
                          />
                        </svg>
                      </div>
                      {charsRemaining <= 20 && (
                        <span
                          className={cn(
                            'text-[12px] font-medium tabular-nums',
                            isOverLimit ? 'text-red-500' : 'text-amber-500',
                          )}
                        >
                          {charsRemaining}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* "Add to thread" row */}
            <div className="flex items-center gap-3 mt-1 pl-[3px]">
              <Avatar className="w-5 h-5 opacity-40">
                <AvatarImage
                  src={userProfile?.avatarUrl || undefined}
                  alt={userProfile?.displayName || user?.name || 'User'}
                />
                <AvatarFallback className="text-[8px] bg-[#333] text-white font-semibold">
                  {(userProfile?.displayName ||
                    user?.name ||
                    'U')[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-[14px] text-[#555]">Add to thread</span>
            </div>

            {/* Error message */}
            {error && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-[13px] text-red-400">{error}</p>
              </div>
            )}

            {/* Upload progress */}
            {uploadProgress && (
              <div className="mt-4 flex items-center gap-2">
                <ThreadsSpinner size="sm" className="text-blue-400" />
                <p className="text-[13px] text-blue-400">{uploadProgress}</p>
              </div>
            )}
          </div>

          {/* Bottom bar — audience selector */}
          <div className="fixed bottom-[68px] left-0 right-0 bg-black border-t border-white/[0.08] px-4 py-2.5 z-40 lg:hidden">
            <AudienceSelector
              audience={audience}
              onAudienceChange={setAudience}
            />
          </div>
        </div>

        {/* Desktop Content Container */}
        <div className="hidden lg:flex lg:flex-col max-w-[580px] mx-auto w-full h-screen">
          {/* Fixed Header */}
          <div className="shrink-0 pt-6 pb-2">
            <div className="flex items-center justify-between h-12 px-4">
              <Link
                href="/feed"
                onClick={(e) => {
                  if (hasUnsavedContent) {
                    e.preventDefault();
                    handleCancel();
                  }
                }}
                className="text-[15px] text-[#f3f5f7] hover:text-white transition-colors"
              >
                Cancel
              </Link>
              <span className="text-[15px] font-semibold text-white">
                New thread
              </span>
              <button
                onClick={handleSubmit}
                disabled={!canPost || isSubmitting}
                className={cn(
                  'px-5 py-1.5 rounded-full text-[14px] font-semibold transition-all',
                  canPost && !isSubmitting
                    ? 'bg-white text-black hover:bg-white/90 active:scale-95'
                    : 'bg-white/[0.15] text-white/[0.35] cursor-not-allowed',
                )}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <ThreadsSpinner size="sm" className="text-black" />
                    Posting
                  </span>
                ) : (
                  'Post'
                )}
              </button>
            </div>
          </div>

          {/* Content wrapper — bordered card */}
          <div className="border border-white/[0.08] rounded-t-2xl flex-1 min-h-0 overflow-y-auto bg-[#181818] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="px-4 py-5">
              <div className="flex gap-3">
                {/* Avatar + thread line */}
                <div className="flex flex-col items-center">
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarImage
                      src={userProfile?.avatarUrl || undefined}
                      alt={userProfile?.displayName || user?.name || 'User'}
                    />
                    <AvatarFallback className="bg-[#333] text-white font-semibold text-sm">
                      {(userProfile?.displayName ||
                        user?.name ||
                        'U')[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="w-0.5 flex-1 min-h-8 bg-white/[0.12] mt-2 rounded-full" />
                </div>

                {/* Content area */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-[15px] font-semibold text-white tracking-[-0.01em]">
                    {userProfile?.displayName || user?.name || 'User'}
                  </p>

                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What's new?"
                    maxLength={MAX_CHARS + 50}
                    className="w-full bg-transparent border-0 resize-none text-[15px] leading-[1.45] text-white placeholder:text-[#777] focus:outline-none mt-1 min-h-[80px]"
                    rows={1}
                  />

                  {/* Media previews */}
                  {mediaPreviews.length > 0 && (
                    <div
                      className={cn(
                        'grid gap-2 mt-2',
                        mediaPreviews.length === 1
                          ? 'grid-cols-1 max-w-[360px]'
                          : 'grid-cols-2',
                      )}
                    >
                      {mediaPreviews.map((preview, index) => (
                        <div
                          key={index}
                          className={cn(
                            'relative rounded-xl overflow-hidden bg-[#0a0a0a]',
                            mediaPreviews.length === 1
                              ? 'aspect-[4/3]'
                              : mediaPreviews.length === 3 && index === 0
                                ? 'row-span-2 aspect-[3/4]'
                                : 'aspect-square',
                          )}
                        >
                          {preview.type === 'video' ? (
                            <video
                              src={preview.url}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={preview.url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          )}
                          <button
                            onClick={() => removeMedia(index)}
                            className="absolute top-1.5 right-1.5 text-white/80 hover:text-white transition-colors drop-shadow-lg"
                          >
                            <CloseCircleIcon className="w-6 h-6" />
                          </button>
                          {preview.type === 'video' && (
                            <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[11px] text-white flex items-center gap-1">
                              <PlayIcon className="w-3 h-3" />
                              Video
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tags row */}
                  {(selectedTopic || selectedLocation) && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                      {selectedTopic && (
                        <TopicSelector
                          selectedTopic={selectedTopic}
                          onSelectTopic={setSelectedTopic}
                        />
                      )}
                      {selectedLocation && (
                        <LocationPicker
                          selectedLocation={selectedLocation}
                          onSelectLocation={setSelectedLocation}
                        />
                      )}
                    </div>
                  )}

                  {/* Toolbar */}
                  <div className="flex items-center gap-0.5 mt-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={mediaFiles.length >= MAX_FILES}
                      className="p-2 rounded-full hover:bg-white/[0.06] transition-colors disabled:opacity-30 text-[#777] hover:text-[#999]"
                      title="Add photos or videos"
                    >
                      <ImageAttachIcon className="w-5 h-5" />
                    </button>

                    <button
                      disabled
                      className="p-2 rounded-full hover:bg-white/[0.06] transition-colors text-[#777] hover:text-[#999] disabled:opacity-30"
                      title="GIF coming soon"
                    >
                      <GifIcon className="w-5 h-5" />
                    </button>

                    <EmojiPicker onEmojiSelect={handleEmojiSelect} />

                    {!selectedLocation && (
                      <LocationPicker
                        selectedLocation={selectedLocation}
                        onSelectLocation={setSelectedLocation}
                      />
                    )}

                    {!selectedTopic && (
                      <TopicSelector
                        selectedTopic={selectedTopic}
                        onSelectTopic={setSelectedTopic}
                      />
                    )}

                    <div className="flex-1" />

                    {content.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <div className="relative w-5 h-5">
                          <svg
                            className="w-5 h-5 -rotate-90"
                            viewBox="0 0 20 20"
                          >
                            <circle
                              cx="10"
                              cy="10"
                              r="8"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className="text-white/[0.08]"
                            />
                            <circle
                              cx="10"
                              cy="10"
                              r="8"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeDasharray={`${charPercentage * 0.502} 50.265`}
                              strokeLinecap="round"
                              className={cn(
                                isOverLimit
                                  ? 'text-red-500'
                                  : charsRemaining < 20
                                    ? 'text-amber-500'
                                    : 'text-[#555]',
                              )}
                            />
                          </svg>
                        </div>
                        {charsRemaining <= 20 && (
                          <span
                            className={cn(
                              'text-[12px] font-medium tabular-nums',
                              isOverLimit ? 'text-red-500' : 'text-amber-500',
                            )}
                          >
                            {charsRemaining}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-[13px] text-red-400">{error}</p>
                </div>
              )}

              {/* Upload progress */}
              {uploadProgress && (
                <div className="mt-4 flex items-center gap-2">
                  <ThreadsSpinner size="sm" className="text-blue-400" />
                  <p className="text-[13px] text-blue-400">{uploadProgress}</p>
                </div>
              )}

              {/* "Add to thread" row */}
              <div className="flex items-center gap-3 mt-3">
                <Avatar className="w-5 h-5 opacity-40">
                  <AvatarImage
                    src={userProfile?.avatarUrl || undefined}
                    alt={userProfile?.displayName || user?.name || 'User'}
                  />
                  <AvatarFallback className="text-[8px] bg-[#333] text-white font-semibold">
                    {(userProfile?.displayName ||
                      user?.name ||
                      'U')[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[14px] text-[#555]">Add to thread</span>
              </div>
            </div>

            {/* Desktop footer — audience */}
            <div className="sticky bottom-0 bg-[#181818] border-t border-white/[0.08] px-4 py-2.5">
              <AudienceSelector
                audience={audience}
                onAudienceChange={setAudience}
              />
            </div>
          </div>
        </div>

        {/* Hidden file input used by both layouts */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Discard confirmation overlay — shared across layouts */}
        {showDiscardConfirm && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-[#262626] rounded-2xl w-[280px] overflow-hidden shadow-2xl">
              <div className="px-6 pt-5 pb-4 text-center">
                <p className="text-[16px] font-semibold text-white">
                  Discard thread?
                </p>
                <p className="text-[14px] text-[#777] mt-1">
                  If you go back now, you&apos;ll lose your changes.
                </p>
              </div>
              <div className="border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    router.push('/feed');
                  }}
                  className="w-full py-3.5 text-[15px] font-semibold text-red-500 hover:bg-white/[0.04] transition-colors"
                >
                  Discard
                </button>
              </div>
              <div className="border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="w-full py-3.5 text-[15px] text-[#f3f5f7] hover:bg-white/[0.04] transition-colors"
                >
                  Keep editing
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}

// Small play icon for video badge overlay
function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
