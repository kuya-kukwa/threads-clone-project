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
import { Thread, ThreadWithAuthor, UserProfile } from '@/types/appwrite';
import { threadCreateSchema } from '@/schemas/thread.schema';
import { sanitizeInput } from '@/lib/utils';
import { logger } from '@/lib/logger/logger';
import { getImagePreviewUrl } from './imageService';

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
