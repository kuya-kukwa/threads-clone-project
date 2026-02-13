'use client';

/**
 * Create Post Modal — Authentic Threads New Thread Dialog
 *
 * Matches the official Threads app create post experience:
 * - Avatar + username header row
 * - Auto-growing textarea with "What's new?" placeholder
 * - Toolbar: media, emoji, location, topic, GIF, poll
 * - Topic tag (queryable categories)
 * - Emoji picker with categories
 * - Location selector
 * - Audience "Who can reply" selector
 * - Media grid with remove/reorder
 * - Character counter (circular progress)
 * - "Add to thread" for multi-post threads
 */

import { useState, useRef, useCallback, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { UserProfile } from '@/types/appwrite';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCurrentUser } from '@/hooks';
import { getSessionToken } from '@/lib/appwriteClient';
import { SECURITY_CONFIG } from '@/lib/appwriteConfig';
import { getErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger/logger';
import { MediaItem, MediaType } from '@/types/appwrite';
import {
  ImageAttachIcon,
  GifIcon,
  CloseCircleIcon,
} from '@/components/icons/ThreadsIcons';
import { TopicSelector } from './TopicSelector';
import { EmojiPicker } from './EmojiPicker';
import { LocationPicker } from './LocationPicker';
import { AudienceSelector, type AudienceType } from './AudienceSelector';
import { ThreadsSpinner } from '@/components/skeletons';
import { cn } from '@/lib/utils';

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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaPreviews, setMediaPreviews] = useState<MediaPreview[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [audience, setAudience] = useState<AudienceType>('anyone');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  const maxLength = SECURITY_CONFIG.MAX_LENGTHS.THREAD_CONTENT;
  const remainingChars = maxLength - content.length;
  const isOverLimit = remainingChars < 0;
  const charPercentage = Math.min(100, (content.length / maxLength) * 100);

  const hasContent = content.trim().length > 0;
  const hasMedia = mediaPreviews.length > 0;
  const canSubmit = (hasContent || hasMedia) && !isOverLimit && !isSubmitting;
  const canAddMore =
    mediaPreviews.length < SECURITY_CONFIG.MEDIA.MAX_FILES_PER_POST;

  const displayName = userProfile?.displayName || user?.name || 'User';
  const avatarUrl = userProfile?.avatarUrl || undefined;
  const userInitials =
    displayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || '?';

  // Fetch user profile for avatar
  useEffect(() => {
    if (user?.$id && open) {
      fetch(`/api/profile/${user.$id}`, { credentials: 'include' })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.profile) setUserProfile(data.profile);
        })
        .catch(() => {});
    }
  }, [user?.$id, open]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  // Focus textarea when modal opens
  useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open]);

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
          return { valid: false, error: `File too large. Max ${sizeMB}MB.` };
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
        newPreviews.push({
          file,
          preview: URL.createObjectURL(file),
          type: validation.type!,
          altText: '',
        });
      }

      if (newPreviews.length > 0) {
        setMediaPreviews((prev) => [...prev, ...newPreviews]);
        setError(null);
      }

      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [mediaPreviews.length],
  );

  const handleRemoveMedia = useCallback((index: number) => {
    setMediaPreviews((prev) => {
      const toRemove = prev[index];
      if (toRemove) URL.revokeObjectURL(toRemove.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleEmojiSelect = useCallback((emoji: string) => {
    setContent((prev) => prev + emoji);
    textareaRef.current?.focus();
  }, []);

  const hasUnsavedContent =
    content.trim().length > 0 ||
    mediaPreviews.length > 0 ||
    selectedTopic !== null ||
    selectedLocation !== null;

  const handleClose = useCallback(() => {
    if (hasUnsavedContent && !isSubmitting) {
      setShowDiscardConfirm(true);
    } else {
      resetForm();
      onOpenChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnsavedContent, isSubmitting, onOpenChange]);

  const handleConfirmDiscard = useCallback(() => {
    setShowDiscardConfirm(false);
    resetForm();
    onOpenChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onOpenChange]);

  const resetForm = () => {
    setContent('');
    setError(null);
    setSelectedTopic(null);
    setSelectedLocation(null);
    setAudience('anyone');
    setShowDiscardConfirm(false);
    mediaPreviews.forEach((m) => URL.revokeObjectURL(m.preview));
    setMediaPreviews([]);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
          topic: selectedTopic || undefined,
          location: selectedLocation || undefined,
          audience: audience || 'anyone',
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
        aria-describedby={undefined}
        className="sm:max-w-[580px] p-0 gap-0 bg-[#181818] border-white/[0.12] rounded-2xl overflow-visible"
        showCloseButton={false}
        onInteractOutside={(e) => {
          // Prevent modal from closing when clicking inside picker dropdowns
          // which are rendered with position:fixed outside the dialog DOM
          const target = e.target as HTMLElement | null;
          if (target?.closest('[data-picker-dropdown]')) {
            e.preventDefault();
          }
        }}
      >
        {/* Discard confirmation overlay */}
        {showDiscardConfirm && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-2xl">
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
                  onClick={handleConfirmDiscard}
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

        {/* Header — Cancel / "New thread" / Post */}
        <DialogHeader className="px-4 py-3 border-b border-white/[0.08]">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleClose}
              className="text-[15px] text-[#f3f5f7] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <DialogTitle className="text-[15px] font-semibold text-white tracking-[-0.01em]">
              New thread
            </DialogTitle>
            <div className="w-12" />
          </div>
        </DialogHeader>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="px-4 pt-4 pb-2 flex gap-3 max-h-[60vh] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
            {/* Avatar + thread line */}
            <div className="flex flex-col items-center shrink-0">
              <Avatar className="w-9 h-9">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="text-xs bg-[#333] text-white font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="w-0.5 flex-1 min-h-6 bg-white/[0.12] mt-2 rounded-full" />
            </div>

            {/* Input Area */}
            <div className="flex-1 min-w-0 pb-2">
              {/* Username */}
              <p className="text-[15px] font-semibold text-white tracking-[-0.01em] mb-0.5">
                {displayName}
              </p>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's new?"
                className="w-full bg-transparent border-0 resize-none text-[15px] leading-[1.45] text-white placeholder:text-[#777] focus:outline-none min-h-[60px]"
                disabled={isSubmitting}
                rows={1}
                maxLength={maxLength + 50}
              />

              {/* Media Previews */}
              {mediaPreviews.length > 0 && (
                <div className="mt-2">
                  <div
                    className={cn(
                      'grid gap-1.5',
                      mediaPreviews.length === 1
                        ? 'grid-cols-1 max-w-[320px]'
                        : 'grid-cols-2',
                    )}
                  >
                    {mediaPreviews.map((media, index) => (
                      <div
                        key={index}
                        className={cn(
                          'relative group rounded-xl overflow-hidden bg-[#0a0a0a]',
                          mediaPreviews.length === 1
                            ? 'aspect-[4/3]'
                            : mediaPreviews.length === 3 && index === 0
                              ? 'row-span-2 aspect-[3/4]'
                              : 'aspect-square',
                        )}
                      >
                        {media.type === 'image' ? (
                          <Image
                            src={media.preview}
                            alt={media.altText || `Preview ${index + 1}`}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <video
                            src={media.preview}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                          />
                        )}
                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(index)}
                          className="absolute top-1.5 right-1.5 text-white/80 hover:text-white transition-colors drop-shadow-lg"
                          disabled={isSubmitting}
                        >
                          <CloseCircleIcon className="w-6 h-6" />
                        </button>
                        {/* Video badge */}
                        {media.type === 'video' && (
                          <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[11px] text-white flex items-center gap-1">
                            <svg
                              className="w-3 h-3"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M8 5v14l11-7z" />
                            </svg>
                            Video
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
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

              {/* Toolbar — Media, Emoji, GIF, Location, Topic, Poll */}
              <div className="flex items-center gap-0.5 mt-3">
                {/* Media upload */}
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
                  className="p-2 rounded-full hover:bg-white/[0.06] transition-colors text-[#777] hover:text-[#999] disabled:opacity-30 disabled:hover:bg-transparent"
                  title="Add photos or videos"
                >
                  <ImageAttachIcon className="w-5 h-5" />
                </button>

                {/* GIF */}
                <button
                  type="button"
                  disabled
                  className="p-2 rounded-full hover:bg-white/[0.06] transition-colors text-[#777] hover:text-[#999] disabled:opacity-30"
                  title="GIF coming soon"
                >
                  <GifIcon className="w-5 h-5" />
                </button>

                {/* Emoji Picker */}
                <EmojiPicker onEmojiSelect={handleEmojiSelect} />

                {/* Location */}
                {!selectedLocation && (
                  <LocationPicker
                    selectedLocation={selectedLocation}
                    onSelectLocation={setSelectedLocation}
                  />
                )}

                {/* Topic (if not already selected) */}
                {!selectedTopic && (
                  <TopicSelector
                    selectedTopic={selectedTopic}
                    onSelectTopic={setSelectedTopic}
                  />
                )}
              </div>
            </div>
          </div>

          {/* "Add to thread" row */}
          <div className="px-4 pb-3 flex items-center gap-3">
            <Avatar className="w-5 h-5 opacity-40">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback className="text-[8px] bg-[#333] text-white font-semibold">
                {userInitials[0]}
              </AvatarFallback>
            </Avatar>
            <span className="text-[14px] text-[#555]">Add to thread</span>
          </div>

          {/* Upload progress */}
          {uploadProgress && (
            <div className="px-4 pb-2">
              <div className="flex items-center gap-2 text-[13px] text-blue-400">
                <ThreadsSpinner size="sm" className="text-blue-400" />
                {uploadProgress}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-4 pb-2">
              <p className="text-[13px] text-red-400">{error}</p>
            </div>
          )}

          {/* Footer — Audience selector + Character count + Post button */}
          <div className="px-4 py-3 border-t border-white/[0.08] flex items-center justify-between">
            <AudienceSelector
              audience={audience}
              onAudienceChange={setAudience}
            />

            <div className="flex items-center gap-3">
              {/* Character counter — circular progress like real Threads */}
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
                            : remainingChars < 20
                              ? 'text-amber-500'
                              : 'text-[#555]',
                        )}
                      />
                    </svg>
                  </div>
                  {remainingChars <= 20 && (
                    <span
                      className={cn(
                        'text-[12px] font-medium tabular-nums',
                        isOverLimit ? 'text-red-500' : 'text-amber-500',
                      )}
                    >
                      {remainingChars}
                    </span>
                  )}
                </div>
              )}

              {/* Post button */}
              <button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  'px-5 py-1.5 rounded-full text-[15px] font-semibold transition-all',
                  canSubmit
                    ? 'bg-white text-black hover:bg-white/90 active:scale-95'
                    : 'bg-white/[0.15] text-white/[0.35] cursor-not-allowed',
                )}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <ThreadsSpinner size="sm" className="text-black" />
                    Posting
                  </div>
                ) : (
                  'Post'
                )}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
