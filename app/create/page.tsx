'use client';

/**
 * Create Post Page
 * Dedicated page for creating new threads
 * Mobile-optimized with full-screen composer
 */

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useCurrentUser } from '@/hooks';
import { getSessionToken } from '@/lib/appwriteClient';
import { UserProfile } from '@/types/appwrite';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const MAX_CHARS = 500;
const MAX_FILES = 4; // Maximum 4 media files per post
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charsRemaining = MAX_CHARS - content.length;
  const canPost = content.trim().length > 0 || mediaFiles.length > 0;

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
      <div className="min-h-screen bg-background flex flex-col pb-20 md:pb-0">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-[#121212] border-b border-border/50">
          <div className="max-w-2xl mx-auto px-4">
            <div className="flex items-center justify-between h-14">
              <Link
                href="/feed"
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5" />
                <span className="text-sm">Back</span>
              </Link>
              <h1 className="text-base font-semibold">New thread</h1>
              <button
                onClick={handleSubmit}
                disabled={!canPost || isSubmitting}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  canPost && !isSubmitting
                    ? 'bg-foreground text-background hover:opacity-90'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                {isSubmitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>

        {/* Composer */}
        <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
          <div className="flex gap-3">
            {/* User avatar with thread line */}
            <div className="flex flex-col items-center">
              <Avatar className="w-11 h-11 flex-shrink-0 ring-2 ring-border/50">
                <AvatarImage
                  src={userProfile?.avatarUrl || undefined}
                  alt={userProfile?.displayName || user?.name || 'User'}
                />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-semibold text-lg">
                  {(userProfile?.displayName || user?.name || 'U')[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* Thread line */}
              <div className="w-0.5 flex-1 min-h-[40px] bg-border/40 mt-2 rounded-full" />
            </div>

            {/* Content area */}
            <div className="flex-1 min-w-0 pt-1">
              {/* Username */}
              <p className="text-base font-semibold text-foreground">
                {userProfile?.displayName || user?.name || 'User'}
              </p>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's new?"
                maxLength={MAX_CHARS}
                className="w-full bg-transparent border-0 resize-none text-foreground placeholder:text-muted-foreground/60 focus:outline-none text-[15px] leading-relaxed mt-1 min-h-[100px]"
                autoFocus
                rows={1}
              />

              {/* Media previews */}
              {mediaPreviews.length > 0 && (
                <div
                  className={`grid gap-2 mt-3 ${
                    mediaPreviews.length === 1
                      ? 'grid-cols-1 max-w-sm'
                      : mediaPreviews.length === 2
                        ? 'grid-cols-2'
                        : 'grid-cols-2'
                  }`}
                >
                  {mediaPreviews.map((preview, index) => (
                    <div
                      key={index}
                      className={`relative rounded-xl overflow-hidden bg-secondary ${
                        mediaPreviews.length === 1
                          ? 'aspect-video'
                          : mediaPreviews.length === 3 && index === 0
                            ? 'row-span-2 aspect-[3/4]'
                            : 'aspect-square'
                      }`}
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
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors"
                      >
                        <XIcon className="w-4 h-4 text-white" />
                      </button>
                      {/* Video badge */}
                      {preview.type === 'video' && (
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-xs text-white flex items-center gap-1">
                          <PlayIcon className="w-3 h-3" />
                          Video
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Toolbar */}
              <div className="flex items-center gap-1 mt-4">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Add media button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={mediaFiles.length >= MAX_FILES}
                  className="p-2 rounded-full hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground"
                  title="Add photos or videos"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>

                {/* Camera button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={mediaFiles.length >= MAX_FILES}
                  className="p-2 rounded-full hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground"
                  title="Take a photo"
                >
                  <CameraIcon className="w-5 h-5" />
                </button>

                {/* GIF button (placeholder) */}
                <button
                  className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground opacity-40 cursor-not-allowed"
                  title="GIFs coming soon"
                  disabled
                >
                  <GifIcon className="w-5 h-5" />
                </button>

                {/* Media count indicator */}
                {mediaFiles.length > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {mediaFiles.length}/{MAX_FILES}
                  </span>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Character count */}
                {content.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-5 h-5 rounded-full border-2 ${
                        charsRemaining < 0
                          ? 'border-red-500'
                          : charsRemaining < 50
                            ? 'border-amber-500'
                            : 'border-muted-foreground/30'
                      }`}
                      style={{
                        background: `conic-gradient(${
                          charsRemaining < 0
                            ? '#ef4444'
                            : charsRemaining < 50
                              ? '#f59e0b'
                              : 'var(--muted-foreground)'
                        } ${Math.min(100, (content.length / MAX_CHARS) * 100)}%, transparent 0)`,
                      }}
                    />
                    {charsRemaining <= 20 && (
                      <span
                        className={`text-xs font-medium ${
                          charsRemaining < 0 ? 'text-red-500' : 'text-amber-500'
                        }`}
                      >
                        {charsRemaining}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {/* Upload progress */}
          {uploadProgress && (
            <div className="mt-4 p-3 rounded-xl bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-primary">{uploadProgress}</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom safe area */}
        <div className="h-safe" />
      </div>
    </AuthGuard>
  );
}

// Icons
function XIcon({ className }: { className?: string }) {
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
        d="M6 18L18 6M6 6l12 12"
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

function CameraIcon({ className }: { className?: string }) {
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
        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
      />
    </svg>
  );
}

function GifIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 10.5V8.8h-4.4v6.4h1.7v-2h2v-1.7h-2v-1H19zm-7.3-1.7h1.7v6.4h-1.7V8.8zm-3.6 1.6c.4 0 .9.2 1.2.5l1.2-1C9.9 9.2 9 8.8 8.1 8.8c-1.8 0-3.2 1.4-3.2 3.2s1.4 3.2 3.2 3.2c1 0 1.8-.4 2.4-1v-2.5H7.7v1.2h1.2v.6c-.2.1-.5.2-.8.2-.9 0-1.6-.7-1.6-1.7 0-1 .7-1.7 1.6-1.7z" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
