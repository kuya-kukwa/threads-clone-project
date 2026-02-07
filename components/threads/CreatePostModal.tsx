'use client';

/**
 * Create Post Modal
 * Desktop modal for creating new threads
 * Matches official Threads app design
 */

import { useState, useRef, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCurrentUser } from '@/hooks';
import { getSessionToken } from '@/lib/appwriteClient';
import { SECURITY_CONFIG } from '@/lib/appwriteConfig';
import { getErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger/logger';
import { MediaItem, MediaType } from '@/types/appwrite';

interface MediaPreview {
  file: File;
  preview: string;
  type: MediaType;
  altText: string;
}

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated?: () => void;
}

export function CreatePostModal({
  open,
  onOpenChange,
  onPostCreated,
}: CreatePostModalProps) {
  const { user } = useCurrentUser();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaPreviews, setMediaPreviews] = useState<MediaPreview[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const maxLength = SECURITY_CONFIG.MAX_LENGTHS.THREAD_CONTENT;
  const remainingChars = maxLength - content.length;
  const isOverLimit = remainingChars < 0;

  const hasContent = content.trim().length > 0;
  const hasMedia = mediaPreviews.length > 0;
  const canSubmit = (hasContent || hasMedia) && !isOverLimit && !isSubmitting;
  const canAddMore =
    mediaPreviews.length < SECURITY_CONFIG.MEDIA.MAX_FILES_PER_POST;

  const userInitials =
    user?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || '?';

  const getMediaTypeFromMime = (mimeType: string): MediaType | null => {
    if (
      (SECURITY_CONFIG.MEDIA.ALLOWED_IMAGE_TYPES as readonly string[]).includes(
        mimeType,
      )
    ) {
      return 'image';
    }
    if (
      (SECURITY_CONFIG.MEDIA.ALLOWED_VIDEO_TYPES as readonly string[]).includes(
        mimeType,
      )
    ) {
      return 'video';
    }
    return null;
  };

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const validateFile = (
        file: File,
      ): { valid: boolean; error?: string; type?: MediaType } => {
        const mediaType = getMediaTypeFromMime(file.type);

        if (!mediaType) {
          return {
            valid: false,
            error:
              'File type not allowed. Use JPG, PNG, WebP, GIF images or MP4, WebM videos.',
          };
        }

        const maxSize =
          mediaType === 'video'
            ? SECURITY_CONFIG.MEDIA.MAX_VIDEO_SIZE_MB * 1024 * 1024
            : SECURITY_CONFIG.MEDIA.MAX_IMAGE_SIZE_MB * 1024 * 1024;

        if (file.size > maxSize) {
          const sizeMB = Math.round(maxSize / 1024 / 1024);
          return {
            valid: false,
            error: `File too large. Maximum size is ${sizeMB}MB.`,
          };
        }

        return { valid: true, type: mediaType };
      };

      const newPreviews: MediaPreview[] = [];
      const remainingSlots =
        SECURITY_CONFIG.MEDIA.MAX_FILES_PER_POST - mediaPreviews.length;

      for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
        const file = files[i];
        const validation = validateFile(file);

        if (!validation.valid) {
          setError(validation.error || 'Invalid file');
          continue;
        }

        const preview = URL.createObjectURL(file);
        newPreviews.push({
          file,
          preview,
          type: validation.type!,
          altText: '',
        });
      }

      if (newPreviews.length > 0) {
        setMediaPreviews((prev) => [...prev, ...newPreviews]);
        setError(null);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [mediaPreviews.length],
  );

  const handleRemoveMedia = useCallback((index: number) => {
    setMediaPreviews((prev) => {
      const toRemove = prev[index];
      if (toRemove) {
        URL.revokeObjectURL(toRemove.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleAltTextChange = useCallback((index: number, altText: string) => {
    setMediaPreviews((prev) =>
      prev.map((media, i) => (i === index ? { ...media, altText } : media)),
    );
  }, []);

  const resetForm = () => {
    setContent('');
    setError(null);
    mediaPreviews.forEach((m) => URL.revokeObjectURL(m.preview));
    setMediaPreviews([]);
    setUploadProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const sessionId = getSessionToken();
      if (!sessionId) {
        setError('Please log in to create a thread');
        setIsSubmitting(false);
        return;
      }

      let uploadedMedia: MediaItem[] = [];

      if (mediaPreviews.length > 0) {
        setUploadProgress(`Uploading ${mediaPreviews.length} file(s)...`);

        const formData = new FormData();
        mediaPreviews.forEach((media, index) => {
          formData.append(`file${index}`, media.file);
          formData.append(`altText${index}`, media.altText);
        });

        const uploadResponse = await fetch('/api/upload/media', {
          method: 'POST',
          headers: {
            'x-session-id': sessionId,
            'X-CSRF-Token': 'true',
          },
          credentials: 'include',
          body: formData,
        });

        const uploadResult = await uploadResponse.json();

        if (!uploadResult.success) {
          setError(uploadResult.error || 'Failed to upload media');
          setIsSubmitting(false);
          setUploadProgress(null);
          return;
        }

        uploadedMedia = uploadResult.media;
        setUploadProgress('Creating post...');
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
          content: content.trim(),
          media: uploadedMedia.length > 0 ? uploadedMedia : undefined,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to create thread');
        setIsSubmitting(false);
        setUploadProgress(null);
        return;
      }

      logger.info({ msg: 'Thread created', threadId: result.thread.$id });

      resetForm();
      onOpenChange(false);
      onPostCreated?.();
      window.dispatchEvent(new CustomEvent('feed-refresh'));
      router.refresh();
    } catch (err) {
      logger.error({
        msg: 'Thread creation failed',
        error: getErrorMessage(err),
      });
      setError('Failed to create thread. Please try again.');
      setUploadProgress(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const acceptedTypes = [
    ...SECURITY_CONFIG.MEDIA.ALLOWED_IMAGE_TYPES,
    ...SECURITY_CONFIG.MEDIA.ALLOWED_VIDEO_TYPES,
  ].join(',');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-150 p-0 gap-0 bg-[#181818] border-[#363636]"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b border-[#363636]">
          <div className="flex items-center justify-between">
            <button
              onClick={() => onOpenChange(false)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <DialogTitle className="text-base font-semibold">
              New thread
            </DialogTitle>
            <div className="w-12" /> {/* Spacer for centering */}
          </div>
        </DialogHeader>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-4 flex gap-3">
            {/* Avatar */}
            <Avatar className="w-10 h-10 shrink-0">
              <AvatarImage src={undefined} alt={user?.name || 'User'} />
              <AvatarFallback className="text-xs bg-secondary">
                {userInitials}
              </AvatarFallback>
            </Avatar>

            {/* Input Area */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-1">{user?.name || 'User'}</p>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's new?"
                className="min-h-25 resize-none text-base bg-transparent border-0 p-0 focus:ring-0 focus-visible:ring-0 placeholder:text-muted-foreground/60"
                disabled={isSubmitting}
                autoFocus
                maxLength={maxLength + 50}
              />

              {/* Media Previews */}
              {mediaPreviews.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div
                    className={`grid gap-2 ${
                      mediaPreviews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                    }`}
                  >
                    {mediaPreviews.map((media, index) => (
                      <div key={index} className="relative group">
                        {media.type === 'image' ? (
                          <Image
                            src={media.preview}
                            alt={media.altText || `Preview ${index + 1}`}
                            width={300}
                            height={200}
                            className="w-full h-auto max-h-50 object-cover rounded-xl border border-[#363636]"
                          />
                        ) : (
                          <video
                            src={media.preview}
                            className="w-full h-auto max-h-50 object-cover rounded-xl border border-[#363636]"
                            controls
                            muted
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(index)}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          disabled={isSubmitting}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload progress */}
              {uploadProgress && (
                <p className="text-sm text-muted-foreground mt-2">
                  {uploadProgress}
                </p>
              )}

              {/* Error */}
              {error && (
                <p className="text-sm text-destructive mt-2">{error}</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-[#363636] flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Media upload button */}
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptedTypes}
                multiple
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
                disabled={isSubmitting || !canAddMore}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting || !canAddMore}
                className="p-2 rounded-full hover:bg-secondary/50 transition-colors disabled:opacity-50"
              >
                <svg
                  className="w-5 h-5 text-muted-foreground"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                  <path d="M21 15l-5-5L5 21" strokeLinecap="round" />
                </svg>
              </button>

              {/* Character count */}
              <span
                className={`text-xs ${
                  remainingChars < 0
                    ? 'text-destructive'
                    : remainingChars < 20
                      ? 'text-orange-500'
                      : 'text-muted-foreground'
                }`}
              >
                {remainingChars}
              </span>
            </div>

            <Button
              type="submit"
              disabled={!canSubmit}
              className="rounded-full px-5 h-9"
            >
              {isSubmitting ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
