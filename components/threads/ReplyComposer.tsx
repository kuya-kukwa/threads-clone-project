/**
 * ReplyComposer Component
 * Mobile-first reply input for thread detail page
 *
 * Features:
 * - Auto-resize textarea
 * - Character count
 * - Submit validation
 * - Loading states
 * - Error handling
 * - Optimistic UI updates
 * - Keyboard-friendly (submit doesn't get hidden)
 * - @mention support when replying to comments
 */

'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SECURITY_CONFIG } from '@/lib/appwriteConfig';
import { logger } from '@/lib/logger/logger';
import { getSessionToken } from '@/lib/appwriteClient';

// Loading spinner icon
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

// X icon for cancel button
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

export interface ReplyToInfo {
  username: string;
  displayName: string;
  replyId?: string; // The ID of the comment being replied to (for nested replies)
}

export interface ReplyComposerHandle {
  setReplyTo: (info: ReplyToInfo | null) => void;
  focus: () => void;
}

interface ReplyComposerProps {
  threadId: string;
  onReplyCreated?: () => void;
}

export const ReplyComposer = forwardRef<
  ReplyComposerHandle,
  ReplyComposerProps
>(function ReplyComposer({ threadId, onReplyCreated }, ref) {
  const { user } = useCurrentUser();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyToInfo | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Expose methods to parent via ref
  useImperativeHandle(
    ref,
    () => ({
      setReplyTo: (info: ReplyToInfo | null) => {
        setReplyTo(info);
        if (info) {
          // Prefill with @mention if not already there
          const mention = `@${info.username} `;
          if (!content.startsWith(mention)) {
            setContent(mention + content);
          }
          // Focus and move cursor to end
          setTimeout(() => {
            textareaRef.current?.focus();
            const len = textareaRef.current?.value.length || 0;
            textareaRef.current?.setSelectionRange(len, len);
          }, 50);
        }
      },
      focus: () => {
        textareaRef.current?.focus();
      },
    }),
    [content],
  );

  const maxLength = SECURITY_CONFIG.MAX_LENGTHS.THREAD_CONTENT;
  const remainingChars = maxLength - content.length;
  const isOverLimit = remainingChars < 0;
  const isNearLimit = remainingChars <= 50 && remainingChars >= 0;
  const canSubmit = content.trim().length > 0 && !isOverLimit && !isSubmitting;

  // Get user initials for avatar
  const userInitials =
    user?.name
      ?.split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??';

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [content, adjustTextareaHeight]);

  // Handle submit
  const handleSubmit = async () => {
    if (!canSubmit) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Get session token from Appwrite
      const sessionId = getSessionToken();
      if (!sessionId || !user?.$id) {
        setError('Please log in to reply');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(`/api/threads/${threadId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
          'x-user-id': user.$id,
          'X-CSRF-Token': 'true',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: content.trim(),
          // Include replyToUsername when replying to a specific comment
          ...(replyTo?.username && { replyToUsername: replyTo.username }),
          // Include parentReplyId for nested replies
          ...(replyTo?.replyId && { parentReplyId: replyTo.replyId }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to post reply');
      }

      // Success - clear form and notify parent
      setContent('');
      setError(null);
      setReplyTo(null);
      onReplyCreated?.();
    } catch (err) {
      logger.error({ msg: 'Error posting reply', threadId, error: err });
      setError(err instanceof Error ? err.message : 'Failed to post reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Enter key (Cmd/Ctrl+Enter to submit)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-4 bg-background">
      {/* Error message */}
      {error && (
        <div className="mb-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Replying to indicator */}
      {replyTo && (
        <div className="mb-3 flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Replying to</span>
          <span className="text-primary font-medium">@{replyTo.username}</span>
          <button
            onClick={() => {
              setReplyTo(null);
              // Remove the @mention from content if it's at the start
              const mention = `@${replyTo.username} `;
              if (content.startsWith(mention)) {
                setContent(content.slice(mention.length));
              }
            }}
            className="ml-auto p-1 rounded-full hover:bg-secondary transition-colors"
            aria-label="Cancel reply"
          >
            <XIcon className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Composer */}
      <div className="flex gap-3">
        {/* User Avatar */}
        <Avatar className="w-10 h-10 flex-shrink-0">
          <AvatarImage src={undefined} alt={user?.name || 'User'} />
          <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
        </Avatar>

        {/* Input Area */}
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a reply..."
            disabled={isSubmitting}
            className={`w-full bg-transparent border-none outline-none resize-none text-base placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed ${
              isOverLimit ? 'text-destructive' : ''
            }`}
            style={{
              minHeight: '40px',
              maxHeight: '200px',
            }}
            rows={1}
          />

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 gap-3">
            {/* Character Count */}
            <div
              className={`text-xs font-medium transition-colors ${
                isOverLimit
                  ? 'text-destructive'
                  : isNearLimit
                    ? 'text-orange-500'
                    : 'text-muted-foreground'
              }`}
            >
              {isOverLimit && '- '}
              {Math.abs(remainingChars)}
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              size="sm"
              className="px-6"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner className="w-4 h-4 mr-2" />
                  Posting...
                </>
              ) : (
                'Reply'
              )}
            </Button>
          </div>

          {/* Hint */}
          {/* <p className="text-xs text-muted-foreground mt-2">
            {typeof window !== 'undefined' &&
            window.navigator.platform.includes('Mac')
              ? 'Cmd'
              : 'Ctrl'}
            +Enter to post
          </p>*/}
        </div>
      </div>
    </div>
  );
});
