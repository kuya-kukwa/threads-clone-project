/**
 * AvatarUpload Component
 * Handles avatar image selection, preview, and upload
 *
 * Features:
 * - Click to upload or drag & drop
 * - Image preview before upload
 * - Auto-upload on selection (no confirm step)
 * - Progress indicator
 * - Error handling with retry
 * - Accessible design
 * - Mobile-first responsive
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getSessionToken } from '@/lib/appwriteClient';
import { SECURITY_CONFIG } from '@/lib/appwriteConfig';

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  displayName: string;
  onUploadSuccess: (avatarUrl: string) => void;
  onUploadError?: (error: string) => void;
  disabled?: boolean;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export function AvatarUpload({
  currentAvatarUrl,
  displayName,
  onUploadSuccess,
  onUploadError,
  disabled = false,
}: AvatarUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Show preview during upload, then current avatar
  const displayUrl = previewUrl || currentAvatarUrl;

  // Debug logging
  console.log(
    '[AvatarUpload] displayUrl:',
    displayUrl,
    'previewUrl:',
    previewUrl,
    'currentAvatarUrl:',
    currentAvatarUrl,
  );

  /**
   * Validate file before upload
   */
  const validateFile = useCallback((file: File): string | null => {
    const maxSize = SECURITY_CONFIG.AVATAR.MAX_SIZE_MB * 1024 * 1024;
    const allowedTypes: readonly string[] =
      SECURITY_CONFIG.AVATAR.ALLOWED_TYPES;

    if (file.size > maxSize) {
      return `File size must be under ${SECURITY_CONFIG.AVATAR.MAX_SIZE_MB}MB`;
    }

    if (!allowedTypes.includes(file.type)) {
      return 'Only JPG, PNG, and WebP images are allowed';
    }

    return null;
  }, []);

  /**
   * Upload file to server
   */
  const uploadFile = useCallback(
    async (file: File, localPreviewUrl: string) => {
      setUploadState('uploading');
      setError(null);

      try {
        const sessionId = getSessionToken();
        if (!sessionId) {
          throw new Error('Please log in to upload an avatar');
        }

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload/avatar', {
          method: 'POST',
          headers: {
            'x-session-id': sessionId,
          },
          body: formData,
        });

        const result = await response.json();

        console.log('[AvatarUpload] API Response:', result);

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Upload failed');
        }

        const avatarUrl = result.data.avatarUrl;
        console.log('[AvatarUpload] Avatar URL received:', avatarUrl);

        setUploadState('success');
        onUploadSuccess(avatarUrl);

        // Clear preview and reset state after success
        setTimeout(() => {
          setPreviewUrl(null);
          setUploadState('idle');
        }, 1500);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Upload failed';
        setError(errorMessage);
        setUploadState('error');
        // Clear preview on error
        setPreviewUrl(null);
        onUploadError?.(errorMessage);
      }
    },
    [onUploadSuccess, onUploadError],
  );

  /**
   * Handle file selection - validates and auto-uploads
   */
  const handleFileSelect = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setUploadState('error');
        return;
      }

      // Create preview and immediately start upload
      const reader = new FileReader();
      reader.onload = (e) => {
        const localPreviewUrl = e.target?.result as string;
        setPreviewUrl(localPreviewUrl);
        // Auto-upload immediately after showing preview
        uploadFile(file, localPreviewUrl);
      };
      reader.readAsDataURL(file);
    },
    [validateFile, uploadFile],
  );

  /**
   * Handle input change
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  /**
   * Handle drag events
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  /**
   * Trigger file input click
   */
  const handleClick = () => {
    if (!disabled && uploadState !== 'uploading') {
      fileInputRef.current?.click();
    }
  };

  /**
   * Retry after error
   */
  const handleRetry = () => {
    setError(null);
    setUploadState('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar Preview Area */}
      <div
        className={`relative group cursor-pointer transition-all duration-200 ${
          isDragging ? 'scale-105' : ''
        } ${disabled || uploadState === 'uploading' ? 'opacity-70 cursor-not-allowed' : ''}`}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload avatar"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <Avatar
          className={`w-24 h-24 ring-2 ring-offset-2 ring-offset-background transition-all duration-200 ${
            isDragging
              ? 'ring-primary scale-105'
              : uploadState === 'success'
                ? 'ring-green-500'
                : uploadState === 'error'
                  ? 'ring-destructive'
                  : 'ring-border group-hover:ring-primary/60'
          }`}
        >
          <AvatarImage
            src={displayUrl}
            alt={displayName}
            className="object-cover"
          />
          <AvatarFallback className="text-xl bg-muted">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Hover Overlay - only show when idle */}
        {uploadState === 'idle' && !disabled && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <CameraIcon className="w-7 h-7 text-white" />
          </div>
        )}

        {/* Upload Progress Indicator */}
        {uploadState === 'uploading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
            <LoadingSpinner className="w-7 h-7 text-white" />
          </div>
        )}

        {/* Success Indicator */}
        {uploadState === 'success' && (
          <div className="absolute inset-0 flex items-center justify-center bg-green-500/70 rounded-full">
            <CheckIcon className="w-7 h-7 text-white" />
          </div>
        )}

        {/* Error Indicator */}
        {uploadState === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-destructive/70 rounded-full">
            <XIcon className="w-7 h-7 text-white" />
          </div>
        )}

        {/* Drag indicator ring */}
        {isDragging && (
          <div className="absolute -inset-2 border-2 border-dashed border-primary rounded-full animate-pulse" />
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
        className="hidden"
        aria-hidden="true"
        disabled={disabled || uploadState === 'uploading'}
      />

      {/* Status Text */}
      <div className="text-center min-h-8 flex flex-col items-center justify-center">
        {uploadState === 'idle' && (
          <p className="text-xs text-muted-foreground">
            Click to change avatar
          </p>
        )}

        {uploadState === 'uploading' && (
          <p className="text-xs text-muted-foreground animate-pulse">
            Uploading...
          </p>
        )}

        {uploadState === 'success' && (
          <p className="text-xs text-green-500 font-medium">Avatar updated!</p>
        )}

        {uploadState === 'error' && error && (
          <div className="flex flex-col items-center gap-1">
            <p className="text-xs text-destructive">{error}</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRetry}
              className="h-7 text-xs"
            >
              Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Icons
function CameraIcon({ className }: { className?: string }) {
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
        d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z"
      />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={`${className} animate-spin`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
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
