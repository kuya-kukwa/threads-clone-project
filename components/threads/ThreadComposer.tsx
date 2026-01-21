'use client';

/**
 * ThreadComposer Component
 * Mobile-first thread creation interface with multi-media support
 *
 * Features:
 * - Auto-growing textarea
 * - Multiple image/video upload with previews
 * - Character counter
 * - Keyboard-safe layout
 * - Submit disabled during posting
 *
 * UX Principles:
 * - Thumb-friendly interactions
 * - No hidden actions when keyboard is open
 * - Clear validation feedback
 */

import { useState, useRef, FormEvent, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { getSessionToken } from '@/lib/appwriteClient';
import { SECURITY_CONFIG } from '@/lib/appwriteConfig';
import { getErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger/logger';
import { MediaItem, MediaType } from '@/types/appwrite';
import Image from 'next/image';

interface MediaPreview {
  file: File;
  preview: string;
  type: MediaType;
  altText: string;
}

interface ThreadComposerProps {
  onSuccess?: () => void;
}

export function ThreadComposer({ onSuccess }: ThreadComposerProps) {
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

  // Allow submit if: (has text content OR has media) AND not over limit AND not submitting
  const hasContent = content.trim().length > 0;
  const hasMedia = mediaPreviews.length > 0;
  const canSubmit = (hasContent || hasMedia) && !isOverLimit && !isSubmitting;
  const canAddMore =
    mediaPreviews.length < SECURITY_CONFIG.MEDIA.MAX_FILES_PER_POST;

  // Determine media type from MIME type
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

  // Handle file selection
  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      // Validate single file (defined inside callback to avoid dependency issues)
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

        if (
          mediaType === 'image' &&
          file.size > SECURITY_CONFIG.MEDIA.MAX_IMAGE_SIZE_MB * 1024 * 1024
        ) {
          return {
            valid: false,
            error: `Image must be smaller than ${SECURITY_CONFIG.MEDIA.MAX_IMAGE_SIZE_MB}MB`,
          };
        }

        if (
          mediaType === 'video' &&
          file.size > SECURITY_CONFIG.MEDIA.MAX_VIDEO_SIZE_MB * 1024 * 1024
        ) {
          return {
            valid: false,
            error: `Video must be smaller than ${SECURITY_CONFIG.MEDIA.MAX_VIDEO_SIZE_MB}MB`,
          };
        }

        return { valid: true, type: mediaType };
      };

      const remainingSlots =
        SECURITY_CONFIG.MEDIA.MAX_FILES_PER_POST - mediaPreviews.length;
      if (remainingSlots <= 0) {
        setError(
          `Maximum ${SECURITY_CONFIG.MEDIA.MAX_FILES_PER_POST} files allowed`,
        );
        return;
      }

      const filesToAdd = Array.from(files).slice(0, remainingSlots);

      for (const file of filesToAdd) {
        const validation = validateFile(file);
        if (!validation.valid || !validation.type) {
          setError(validation.error || 'Invalid file');
          return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setMediaPreviews((prev) => [
            ...prev,
            {
              file,
              preview: reader.result as string,
              type: validation.type!,
              altText: '',
            },
          ]);
        };
        reader.readAsDataURL(file);
      }

      setError(null);

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [mediaPreviews.length],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const handleRemoveMedia = (index: number) => {
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAltTextChange = (index: number, altText: string) => {
    setMediaPreviews((prev) =>
      prev.map((item, i) => (i === index ? { ...item, altText } : item)),
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);
    setUploadProgress(null);

    try {
      // Get session token
      const sessionId = getSessionToken();
      if (!sessionId) {
        setError('Please log in to post');
        setIsSubmitting(false);
        return;
      }

      let uploadedMedia: MediaItem[] = [];

      // Upload media if present
      if (mediaPreviews.length > 0) {
        setUploadProgress(`Uploading ${mediaPreviews.length} file(s)...`);

        logger.info({
          msg: 'Uploading thread media',
          count: mediaPreviews.length,
          fileNames: mediaPreviews.map((m) => m.file.name),
        });

        // Upload via multi-media API endpoint
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
        logger.info({ msg: 'Media uploaded', count: uploadedMedia.length });
        setUploadProgress('Creating post...');
      }

      // Create thread
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

      // Reset form
      setContent('');
      setMediaPreviews([]);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Notify parent or refresh
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
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

  // Allowed file types for input
  const acceptedTypes = [
    ...SECURITY_CONFIG.MEDIA.ALLOWED_IMAGE_TYPES,
    ...SECURITY_CONFIG.MEDIA.ALLOWED_VIDEO_TYPES,
  ].join(',');

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border-b border-border/50 bg-card/30">
      {/* Textarea */}
      <div>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="min-h-[100px] resize-none text-base bg-secondary/50 border-border/50 focus:border-primary/50 focus:ring-primary/20"
          disabled={isSubmitting}
          aria-label="Thread content"
          maxLength={maxLength + 50}
        />
        <div className="flex justify-between items-center mt-1">
          <span
            className={`text-sm ${
              remainingChars < 0
                ? 'text-destructive'
                : remainingChars < 20
                  ? 'text-orange-500'
                  : 'text-muted-foreground'
            }`}
          >
            {remainingChars} characters remaining
          </span>
        </div>
      </div>

      {/* Media Previews Grid */}
      {mediaPreviews.length > 0 && (
        <div className="space-y-3">
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
                    className="w-full h-auto max-h-[200px] object-cover rounded-xl bg-card border border-border/50"
                  />
                ) : (
                  <video
                    src={media.preview}
                    className="w-full h-auto max-h-[200px] object-cover rounded-xl bg-card border border-border/50"
                    controls
                    muted
                  />
                )}

                {/* Media type badge */}
                <span className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm text-foreground text-xs px-2 py-1 rounded-full">
                  {media.type === 'video' ? '🎬 Video' : '🖼️ Image'}
                </span>

                {/* Remove button */}
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemoveMedia(index)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={isSubmitting}
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>

          {/* Alt text inputs */}
          <div className="space-y-2">
            {mediaPreviews.map((media, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-16">
                  {media.type === 'video' ? 'Video' : 'Image'} {index + 1}:
                </span>
                <Input
                  value={media.altText}
                  onChange={(e) => handleAltTextChange(index, e.target.value)}
                  placeholder="Add alt text for accessibility..."
                  maxLength={200}
                  disabled={isSubmitting}
                  className="flex-1 text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload progress */}
      {uploadProgress && (
        <div className="text-sm text-primary bg-primary/10 p-3 rounded-lg border border-primary/20 flex items-center gap-2">
          <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
          {uploadProgress}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes}
            onChange={handleInputChange}
            className="hidden"
            id="thread-media-upload"
            disabled={isSubmitting || !canAddMore}
            multiple
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSubmitting || !canAddMore}
            aria-label="Add media"
            className="border-border/50 hover:bg-secondary"
          >
            📎 Add Media
          </Button>

          {mediaPreviews.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {mediaPreviews.length}/{SECURITY_CONFIG.MEDIA.MAX_FILES_PER_POST}
            </span>
          )}
        </div>

        <Button type="submit" disabled={!canSubmit} className="min-w-[80px] btn-gradient text-white">
          {isSubmitting ? 'Posting...' : 'Post'}
        </Button>
      </div>

      {/* Help text */}
      <p className="text-xs text-muted-foreground">
        Images: JPG, PNG, WebP, GIF (max{' '}
        {SECURITY_CONFIG.MEDIA.MAX_IMAGE_SIZE_MB}MB) • Videos: MP4, WebM (max{' '}
        {SECURITY_CONFIG.MEDIA.MAX_VIDEO_SIZE_MB}MB) • Up to{' '}
        {SECURITY_CONFIG.MEDIA.MAX_FILES_PER_POST} files
      </p>
    </form>
  );
}
