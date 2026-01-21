/**
 * Thread Service
 * Business logic for thread operations
 * 
 * Features:
 * - Thread creation with validation
 * - Content sanitization
 * - Image handling
 * - Feed retrieval with pagination
 */

import { ID, Query } from 'node-appwrite';
import { serverDatabases } from '@/lib/appwriteServer';
import { APPWRITE_CONFIG } from '@/lib/appwriteConfig';
import { Thread, ThreadWithAuthor, UserProfile, MediaItem } from '@/types/appwrite';
import { threadCreateSchema } from '@/schemas/thread.schema';
import { sanitizeInput } from '@/lib/utils';
import { logger } from '@/lib/logger/logger';
import { getImagePreviewUrl } from './imageService';
import { getMediaUrl } from './mediaService';

/**
 * Sanitize thread content
 * Removes XSS vectors while preserving line breaks
 * @param content - Raw content from user
 * @returns Sanitized content
 */
export function sanitizeThreadContent(content: string): string {
  // Use existing sanitizeInput for basic XSS protection
  let sanitized = sanitizeInput(content, APPWRITE_CONFIG.THREAD_ATTRIBUTES.CONTENT.length);
  
  // Preserve line breaks (convert \n to actual newlines)
  sanitized = sanitized.replace(/\\n/g, '\n');
  
  // Trim excessive consecutive newlines (max 2)
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');
  
  // Trim leading/trailing whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Create a new thread
 * @param authorId - User ID of the author
 * @param content - Thread text content (optional if imageId provided)
 * @param imageId - Optional Appwrite Storage file ID
 * @param altText - Optional alt text for image
 * @returns Created thread document
 * 
 * VALID STATES:
 * - Text only (content required)
 * - Image only (imageId required)
 * - Text + Image (both provided)
 */
export async function createThread(
  authorId: string,
  content: string,
  imageId?: string,
  altText?: string
): Promise<Thread> {
  try {
    // Validate input - schema now allows empty content if imageId is present
    const validation = threadCreateSchema.safeParse({
      content: content || '',
      imageId,
      altText,
    });

    if (!validation.success) {
      throw new Error(validation.error.issues[0]?.message || 'Invalid thread data');
    }

    // Sanitize content (handle empty string gracefully)
    const sanitizedContent = content ? sanitizeThreadContent(content) : '';
    const sanitizedAltText = altText ? sanitizeInput(altText, 200) : undefined;

    logger.info({
      msg: 'Creating thread',
      authorId,
      hasImage: !!imageId,
      hasContent: !!sanitizedContent,
      contentLength: sanitizedContent.length,
    });

    // Generate image URL if imageId is provided and not empty
    const imageUrl = (imageId && imageId.trim()) ? getImagePreviewUrl(imageId) : '';

    // Create thread document
    const thread = await serverDatabases.createDocument<Thread>(
      APPWRITE_CONFIG.DATABASE_ID,
      APPWRITE_CONFIG.COLLECTIONS.THREADS,
      ID.unique(),
      {
        authorId,
        content: sanitizedContent,
        imageId: imageId || '',
        imageUrl: imageUrl || '',
        altText: sanitizedAltText || '',
        parentThreadId: '', // For future reply feature
        replyCount: 0,
        likeCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );

    logger.info({
      msg: 'Thread created successfully',
      threadId: thread.$id,
      authorId,
    });

    return thread;
  } catch (error) {
    logger.error({
      msg: 'Thread creation failed',
      authorId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

/**
 * Create a new thread with multiple media items
 * @param authorId - User ID of the author
 * @param content - Thread text content (optional if media provided)
 * @param media - Array of MediaItem objects
 * @returns Created thread document
 * 
 * VALID STATES:
 * - Text only (content required)
 * - Media only (at least one media item)
 * - Text + Media (both provided)
 */
export async function createThreadWithMedia(
  authorId: string,
  content: string,
  media?: MediaItem[]
): Promise<Thread> {
  try {
    // Determine if we have content or media
    const hasContent = content && content.trim().length > 0;
    const hasMedia = media && media.length > 0;

    if (!hasContent && !hasMedia) {
      throw new Error('Thread must have either text content or media');
    }

    // Sanitize content (handle empty string gracefully)
    const sanitizedContent = hasContent ? sanitizeThreadContent(content) : '';

    logger.info({
      msg: 'Creating thread with media',
      authorId,
      hasMedia,
      mediaCount: media?.length || 0,
      hasContent,
      contentLength: sanitizedContent.length,
    });

    // Prepare media arrays (JSON stringified for Appwrite storage)
    let mediaIds = '';
    let mediaUrls = '';
    let mediaTypes = '';
    let mediaAltTexts = '';
    
    // For backward compatibility, also set single image fields if first item is an image
    let imageId = '';
    let imageUrl = '';
    let altText = '';

    if (hasMedia && media) {
      mediaIds = JSON.stringify(media.map(m => m.id));
      mediaUrls = JSON.stringify(media.map(m => m.url));
      mediaTypes = JSON.stringify(media.map(m => m.type));
      mediaAltTexts = JSON.stringify(media.map(m => m.altText || ''));

      // Set legacy single image fields for backward compatibility
      const firstImage = media.find(m => m.type === 'image');
      if (firstImage) {
        imageId = firstImage.id;
        imageUrl = firstImage.url;
        altText = firstImage.altText || '';
      } else if (media.length > 0) {
        // If no images, use first media item for legacy fields
        imageId = media[0].id;
        imageUrl = media[0].url;
        altText = media[0].altText || '';
      }
    }

    // Create thread document
    const thread = await serverDatabases.createDocument<Thread>(
      APPWRITE_CONFIG.DATABASE_ID,
      APPWRITE_CONFIG.COLLECTIONS.THREADS,
      ID.unique(),
      {
        authorId,
        content: sanitizedContent,
        // Legacy single image fields (backward compatibility)
        imageId,
        imageUrl,
        altText,
        // New multi-media fields (JSON strings)
        mediaIds,
        mediaUrls,
        mediaTypes,
        mediaAltTexts,
        // Other fields
        parentThreadId: '',
        replyCount: 0,
        likeCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );

    logger.info({
      msg: 'Thread with media created successfully',
      threadId: thread.$id,
      authorId,
      mediaCount: media?.length || 0,
    });

    return thread;
  } catch (error) {
    logger.error({
      msg: 'Thread creation with media failed',
      authorId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

/**
 * Parse media from thread document
 * Handles both new multi-media format and legacy single image format
 */
export function parseThreadMedia(thread: Thread): MediaItem[] {
  const media: MediaItem[] = [];

  // Try to parse new multi-media format first
  if (thread.mediaIds && thread.mediaIds.length > 0) {
    try {
      const ids = JSON.parse(thread.mediaIds) as string[];
      const urls = thread.mediaUrls ? JSON.parse(thread.mediaUrls) as string[] : [];
      const types = thread.mediaTypes ? JSON.parse(thread.mediaTypes) as string[] : [];
      const altTexts = thread.mediaAltTexts ? JSON.parse(thread.mediaAltTexts) as string[] : [];

      for (let i = 0; i < ids.length; i++) {
        media.push({
          id: ids[i],
          url: urls[i] || getMediaUrl(ids[i], (types[i] as 'image' | 'video') || 'image'),
          type: (types[i] as 'image' | 'video') || 'image',
          altText: altTexts[i] || undefined,
        });
      }

      return media;
    } catch (parseError) {
      logger.warn({
        msg: 'Failed to parse media JSON',
        threadId: thread.$id,
        error: parseError instanceof Error ? parseError.message : 'Unknown error',
      });
    }
  }

  // Fall back to legacy single image format
  if (thread.imageId && thread.imageId.trim().length > 0) {
    media.push({
      id: thread.imageId,
      url: thread.imageUrl || getImagePreviewUrl(thread.imageId),
      type: 'image',
      altText: thread.altText || undefined,
    });
  }

  return media;
}

/**
 * Get public feed with cursor-based pagination
 * @param cursor - Optional cursor for pagination (thread ID)
 * @param limit - Number of threads to fetch (default: 20, max: 50)
 * @returns Array of threads with author data
 */
export async function getPublicFeed(
  cursor?: string,
  limit: number = 20
): Promise<{ threads: ThreadWithAuthor[]; nextCursor: string | null; hasMore: boolean }> {
  try {
    // Validate limit
    const validLimit = Math.min(Math.max(limit, 1), 50);

    logger.debug({
      msg: 'Fetching public feed',
      cursor,
      limit: validLimit,
    });

    // Build queries
    const queries = [
      Query.orderDesc('createdAt'),
      Query.limit(validLimit + 1), // Fetch one extra to check if there are more
    ];

    // Add cursor for pagination
    if (cursor) {
      queries.push(Query.cursorAfter(cursor));
    }

    // Fetch threads
    const threadsResult = await serverDatabases.listDocuments<Thread>(
      APPWRITE_CONFIG.DATABASE_ID,
      APPWRITE_CONFIG.COLLECTIONS.THREADS,
      queries
    );

    // Check if there are more threads
    const hasMore = threadsResult.documents.length > validLimit;
    const threads = hasMore
      ? threadsResult.documents.slice(0, validLimit)
      : threadsResult.documents;

    // Get next cursor (ID of last thread)
    const nextCursor = hasMore && threads.length > 0
      ? threads[threads.length - 1].$id
      : null;

    // If no threads, return empty result
    if (threads.length === 0) {
      logger.debug({ msg: 'No threads found in feed' });
      return {
        threads: [],
        nextCursor: null,
        hasMore: false,
      };
    }

    // Fetch author profiles for all threads
    const authorIds = [...new Set(threads.map(t => t.authorId))];
    const authorsResult = await serverDatabases.listDocuments<UserProfile>(
      APPWRITE_CONFIG.DATABASE_ID,
      APPWRITE_CONFIG.COLLECTIONS.USERS,
      [Query.equal('userId', authorIds)]
    );

    // Create author map for quick lookup
    const authorMap = new Map(
      authorsResult.documents.map(author => [author.userId, author])
    );

    // Combine threads with author data (defensive parsing)
    const threadsWithAuthors: ThreadWithAuthor[] = threads
      .map(thread => {
        try {
          const author = authorMap.get(thread.authorId);
          if (!author) {
            logger.warn({
              msg: 'Author not found for thread, skipping',
              threadId: thread.$id,
              authorId: thread.authorId,
            });
            return null;
          }

          // Defensive: ensure thread has required fields with defaults
          const safeThread: ThreadWithAuthor = {
            ...thread,
            content: thread.content || '',
            imageId: thread.imageId || '',
            imageUrl: thread.imageUrl || '',
            altText: thread.altText || '',
            replyCount: thread.replyCount ?? 0,
            likeCount: thread.likeCount ?? 0,
            author,
          };

          return safeThread;
        } catch (threadError) {
          logger.error({
            msg: 'Error processing thread for feed',
            threadId: thread?.$id,
            error: threadError instanceof Error ? threadError.message : 'Unknown error',
          });
          return null;
        }
      })
      .filter((thread): thread is ThreadWithAuthor => thread !== null);

    logger.debug({
      msg: 'Public feed fetched',
      threadCount: threadsWithAuthors.length,
      hasMore,
      nextCursor,
    });

    return {
      threads: threadsWithAuthors,
      nextCursor,
      hasMore,
    };
  } catch (error) {
    logger.error({
      msg: 'Failed to fetch public feed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

/**
 * Get a single thread by ID with author data
 * @param threadId - Thread document ID
 * @returns Thread with author data
 */
export async function getThreadById(threadId: string): Promise<ThreadWithAuthor | null> {
  try {
    // Fetch thread
    const thread = await serverDatabases.getDocument<Thread>(
      APPWRITE_CONFIG.DATABASE_ID,
      APPWRITE_CONFIG.COLLECTIONS.THREADS,
      threadId
    );

    // Fetch author
    const authorsResult = await serverDatabases.listDocuments<UserProfile>(
      APPWRITE_CONFIG.DATABASE_ID,
      APPWRITE_CONFIG.COLLECTIONS.USERS,
      [Query.equal('userId', thread.authorId)]
    );

    const author = authorsResult.documents[0];
    if (!author) {
      logger.warn({
        msg: 'Author not found for thread',
        threadId,
        authorId: thread.authorId,
      });
      return null;
    }

    return {
      ...thread,
      author,
    };
  } catch (error) {
    logger.error({
      msg: 'Failed to fetch thread',
      threadId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return null;
  }
}
