'use client';

/**
 * Create Post Page
 * Dedicated page for creating new threads
 * Mobile-optimized with full-screen composer
 */

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useCurrentUser } from '@/hooks';
import { getSessionToken } from '@/lib/appwriteClient';

const MAX_CHARS = 500;
const MAX_FILES = 4; // Maximum 4 media files per post
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function CreatePage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<
    { url: string; type: 'image' | 'video' }[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const charsRemaining = MAX_CHARS - content.length;
  const canPost = content.trim().length > 0 || mediaFiles.length > 0;

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
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to upload files');
        }

        const uploadResult = await response.json();
        if (uploadResult.success && uploadResult.media) {
          uploadedMedia = uploadResult.media;
        } else {
          throw new Error(uploadResult.error || 'Upload failed');
        }
      }

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
        const threadError = await threadResponse.json();
        throw new Error(threadError.error || 'Failed to create post');
      }

      // Clean up previews
      mediaPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));

      // Navigate to feed
      router.push('/feed');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background flex flex-col pb-20 md:pb-0">
        {/* Header */}
        <div className="sticky top-0 z-50 glass border-b border-border/50">
          <div className="max-w-2xl mx-auto px-4">
            <div className="flex items-center justify-between h-12">
              <Link
                href="/feed"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors min-w-[60px]"
              >
                Cancel
              </Link>
              <h1 className="text-sm font-semibold">New Thread</h1>
              <button
                onClick={handleSubmit}
                disabled={!canPost || isSubmitting}
                className={`text-sm font-semibold transition-colors min-w-[60px] text-right ${
                  canPost && !isSubmitting
                    ? 'text-primary hover:text-primary/80'
                    : 'text-muted-foreground'
                }`}
              >
                {isSubmitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>

        {/* Composer */}
        <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-4">
          <div className="flex gap-3">
            {/* User avatar */}
            <div className="shrink-0">
              <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary to-accent flex items-center justify-center text-white font-medium">
                {user?.name?.[0] || 'U'}
              </div>
              {/* Vertical line connecting avatar to add button */}
              <div className="w-0.5 h-full min-h-8 bg-border/50 mx-auto mt-2" />
            </div>

            {/* Content area */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold mb-1">
                {user?.name || 'User'}
              </p>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start a thread..."
                maxLength={MAX_CHARS}
                className="w-full bg-transparent border-0 resize-none text-foreground placeholder:text-muted-foreground focus:outline-none text-base min-h-[80px]"
                autoFocus
              />

              {/* Media previews */}
              {mediaPreviews.length > 0 && (
                <div
                  className={`grid gap-2 mt-2 ${
                    mediaPreviews.length === 1
                      ? 'grid-cols-1'
                      : mediaPreviews.length === 2
                        ? 'grid-cols-2'
                        : 'grid-cols-3'
                  }`}
                >
                  {mediaPreviews.map((preview, index) => (
                    <div
                      key={index}
                      className="relative rounded-xl overflow-hidden bg-secondary aspect-square"
                    >
                      {preview.type === 'video' ? (
                        <video
                          src={preview.url}
                          className="w-full h-full object-cover"
                          muted
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
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                      {preview.type === 'video' && (
                        <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-background/80 backdrop-blur-sm text-xs">
                          Video
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Inline toolbar - always visible */}
              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/30">
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
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 group"
                >
                  <div className="p-2 rounded-lg bg-secondary/50 group-hover:bg-secondary transition-colors">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <span className="text-sm">
                    {mediaFiles.length > 0
                      ? `${mediaFiles.length}/${MAX_FILES}`
                      : 'Add media'}
                  </span>
                </button>

                {/* Media limit hint */}
                {mediaFiles.length === 0 && (
                  <span className="text-xs text-muted-foreground/60">
                    Max 4 photos/videos
                  </span>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Character count */}
                <div className="flex items-center gap-2">
                  {content.length > 0 && (
                    <div
                      className={`text-xs px-2 py-1 rounded-full ${
                        charsRemaining < 0
                          ? 'bg-red-500/20 text-red-500'
                          : charsRemaining < 50
                            ? 'bg-amber-500/20 text-amber-500'
                            : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {charsRemaining}
                    </div>
                  )}
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
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
