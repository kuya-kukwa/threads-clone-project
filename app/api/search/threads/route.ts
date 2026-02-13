/**
 * Thread Search API Route
 * GET /api/search/threads
 *
 * Search threads by topic, location, or content text.
 * Supports cursor-based pagination.
 *
 * Query Parameters:
 * - q: Search query (searches content, topic, location)
 * - topic: Filter by exact topic
 * - location: Filter by exact location
 * - cursor: Pagination cursor
 * - limit: Results per page (default 20, max 50)
 */

import { NextRequest, NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { serverDatabases } from '@/lib/appwriteServer';
import { APPWRITE_CONFIG } from '@/lib/appwriteConfig';
import { Thread, ThreadWithAuthor, UserProfile } from '@/types/appwrite';
import { logger } from '@/lib/logger/logger';

function sanitizeQuery(query: string): string {
  return query
    .trim()
    .replace(/[<>{}]/g, '')
    .slice(0, 100);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get('q') || '';
    const topicFilter = searchParams.get('topic') || '';
    const locationFilter = searchParams.get('location') || '';
    const cursor = searchParams.get('cursor') || undefined;
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '20', 10),
      50
    );

    const query = rawQuery ? sanitizeQuery(rawQuery) : '';

    // Must have at least one search parameter
    if (!query && !topicFilter && !locationFilter) {
      return NextResponse.json({
        success: true,
        threads: [],
        nextCursor: null,
        hasMore: false,
        message: 'Provide q, topic, or location parameter',
      });
    }

    logger.info({
      msg: 'Thread search request',
      query,
      topicFilter,
      locationFilter,
      limit,
    });

    // Build Appwrite queries
    const queries: string[] = [
      Query.equal('parentThreadId', ''), // Only parent threads
      Query.orderDesc('createdAt'),
      Query.limit(limit + 1),
    ];

    if (cursor) {
      queries.push(Query.cursorAfter(cursor));
    }

    // Strategy: Use the most specific filter available.
    // Appwrite doesn't support OR across different attributes easily,
    // so we do parallel searches and merge results.
    let threads: Thread[] = [];

    if (topicFilter) {
      // Exact topic filter
      const result = await serverDatabases.listDocuments<Thread>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.THREADS,
        [...queries, Query.equal('topic', topicFilter)]
      );
      threads = result.documents;
    } else if (locationFilter) {
      // Exact location filter
      const result = await serverDatabases.listDocuments<Thread>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.THREADS,
        [...queries, Query.equal('location', locationFilter)]
      );
      threads = result.documents;
    } else if (query) {
      // Free-text search: search across content, topic, and location in parallel
      const [contentResults, topicResults, locationResults] = await Promise.all([
        serverDatabases.listDocuments<Thread>(
          APPWRITE_CONFIG.DATABASE_ID,
          APPWRITE_CONFIG.COLLECTIONS.THREADS,
          [...queries, Query.contains('content', query)]
        ).catch(() => ({ documents: [] as Thread[] })),
        serverDatabases.listDocuments<Thread>(
          APPWRITE_CONFIG.DATABASE_ID,
          APPWRITE_CONFIG.COLLECTIONS.THREADS,
          [...queries, Query.contains('topic', query)]
        ).catch(() => ({ documents: [] as Thread[] })),
        serverDatabases.listDocuments<Thread>(
          APPWRITE_CONFIG.DATABASE_ID,
          APPWRITE_CONFIG.COLLECTIONS.THREADS,
          [...queries, Query.contains('location', query)]
        ).catch(() => ({ documents: [] as Thread[] })),
      ]);

      // Merge and deduplicate, maintaining order
      const seenIds = new Set<string>();
      const merged: Thread[] = [];
      for (const doc of [
        ...topicResults.documents,
        ...locationResults.documents,
        ...contentResults.documents,
      ]) {
        if (!seenIds.has(doc.$id)) {
          seenIds.add(doc.$id);
          merged.push(doc);
        }
      }

      // Sort by createdAt descending
      merged.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      threads = merged.slice(0, limit + 1);
    }

    // Pagination
    const hasMore = threads.length > limit;
    if (hasMore) threads = threads.slice(0, limit);
    const nextCursor =
      hasMore && threads.length > 0
        ? threads[threads.length - 1].$id
        : null;

    if (threads.length === 0) {
      return NextResponse.json({
        success: true,
        threads: [],
        nextCursor: null,
        hasMore: false,
      });
    }

    // Fetch author profiles
    const authorIds = [...new Set(threads.map((t) => t.authorId))];
    const authorsResult = await serverDatabases.listDocuments<UserProfile>(
      APPWRITE_CONFIG.DATABASE_ID,
      APPWRITE_CONFIG.COLLECTIONS.USERS,
      [Query.equal('userId', authorIds)]
    );

    const authorMap = new Map(
      authorsResult.documents.map((a) => [a.userId, a])
    );

    const threadsWithAuthors: ThreadWithAuthor[] = threads.reduce<ThreadWithAuthor[]>((acc, thread) => {
      const author = authorMap.get(thread.authorId);
      if (!author) return acc;
      acc.push({
        ...thread,
        author,
      });
      return acc;
    }, []);

    logger.info({
      msg: 'Thread search completed',
      query,
      topicFilter,
      locationFilter,
      resultCount: threadsWithAuthors.length,
    });

    return NextResponse.json({
      success: true,
      threads: threadsWithAuthors,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    logger.error({
      msg: 'Thread search error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search threads',
        threads: [],
      },
      { status: 500 }
    );
  }
}
