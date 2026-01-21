'use client';

/**
 * ThreadComposer Component
 * Mobile-first thread creation interface
 *
 * Features:
 * - Auto-growing textarea
 * - Image upload with preview
 * - Character counter
 * - Keyboard-safe layout
 * - Submit disabled during posting
 *
 * UX Principles:
 * - Thumb-friendly interactions
 * - No hidden actions when keyboard is open
 * - Clear validation feedback
 */

import { useState, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { getSessionToken } from '@/lib/appwriteClient';
import { SECURITY_CONFIG } from '@/lib/appwriteConfig';
import { getErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger/logger';

interface ThreadComposerProps {
  onSuccess?: () => void;
}

export function ThreadComposer({ onSuccess }: ThreadComposerProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [altText, setAltText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const maxLength = SECURITY_CONFIG.MAX_LENGTHS.THREAD_CONTENT;
  const remainingChars = maxLength - content.length;
  const isOverLimit = remainingChars < 0;
  // Allow submit if: (has text content OR has image) AND not over limit AND not submitting
  const hasContent = content.trim().length > 0;
  const hasImage = imageFile !== null;
  const canSubmit = (hasContent || hasImage) && !isOverLimit && !isSubmitting;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > SECURITY_CONFIG.IMAGE.MAX_SIZE_MB * 1024 * 1024) {
      setError(
        `Image must be smaller than ${SECURITY_CONFIG.IMAGE.MAX_SIZE_MB}MB`,
      );
      return;
    }

    // Validate file type
    const allowedTypes = SECURITY_CONFIG.IMAGE
      .ALLOWED_TYPES as readonly string[];
    if (!allowedTypes.includes(file.type)) {
      setError('Only JPG, PNG, WebP, and GIF images are allowed');
      return;
    }

    setImageFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setAltText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Get session token
      const sessionId = getSessionToken();
      if (!sessionId) {
        setError('Please log in to post');
        setIsSubmitting(false);
        return;
      }

      let imageId: string | undefined;

      // Upload image if present
      if (imageFile) {
        logger.info({
          msg: 'Uploading thread image',
          fileName: imageFile.name,
        });

        // Upload via API endpoint
        const formData = new FormData();
        formData.append('file', imageFile);

        const uploadResponse = await fetch('/api/upload/image', {
          method: 'POST',
          headers: {
            'x-session-id': sessionId, // Send session in header
            'X-CSRF-Token': 'true', // Required by middleware for POST requests
          },
          credentials: 'include', // Ensure cookies are sent for cross-device requests
          body: formData,
        });

        const uploadResult = await uploadResponse.json();

        if (!uploadResult.success) {
          setError(uploadResult.error || 'Failed to upload image');
          setIsSubmitting(false);
          return;
        }

        imageId = uploadResult.imageId;
        logger.info({ msg: 'Image uploaded', imageId });
      }

      // Create thread
      const response = await fetch('/api/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
          'X-CSRF-Token': 'true', // Required by middleware for POST requests
        },
        credentials: 'include', // Ensure cookies are sent for cross-device requests
        body: JSON.stringify({
          content: content.trim(),
          imageId,
          altText: altText.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to create thread');
        setIsSubmitting(false);
        return;
      }

      logger.info({ msg: 'Thread created', threadId: result.thread.$id });

      // Reset form
      setContent('');
      setImageFile(null);
      setImagePreview(null);
      setAltText('');
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
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border-b">
      {/* Textarea */}
      <div>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="min-h-[100px] resize-none text-base"
          disabled={isSubmitting}
          aria-label="Thread content"
          maxLength={maxLength + 50} // Allow typing past limit for better UX
        />
        <div className="flex justify-between items-center mt-1">
          <span
            className={`text-sm ${
              remainingChars < 0
                ? 'text-red-600'
                : remainingChars < 20
                  ? 'text-orange-600'
                  : 'text-muted-foreground'
            }`}
          >
            {remainingChars} characters remaining
          </span>
        </div>
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="space-y-2">
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-w-full max-h-[300px] rounded-lg border"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemoveImage}
              className="absolute top-2 right-2"
              disabled={isSubmitting}
            >
              Remove
            </Button>
          </div>

          {/* Alt text input */}
          <div>
            <Label htmlFor="alt-text" className="text-sm">
              Alt text (optional, for accessibility)
            </Label>
            <Input
              id="alt-text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Describe this image..."
              maxLength={200}
              disabled={isSubmitting}
              className="mt-1"
            />
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          className="text-sm text-red-600 bg-red-50 p-3 rounded-md"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={SECURITY_CONFIG.IMAGE.ALLOWED_TYPES.join(',')}
            onChange={handleImageSelect}
            className="hidden"
            id="thread-image-upload"
            disabled={isSubmitting}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSubmitting || !!imageFile}
            aria-label="Add image"
          >
            {imageFile ? 'Image Added' : 'Add Image'}
          </Button>
        </div>

        <Button type="submit" disabled={!canSubmit} className="min-w-[80px]">
          {isSubmitting ? 'Posting...' : 'Post'}
        </Button>
      </div>
    </form>
  );
}
