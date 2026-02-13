/**
 * Trending Topics & Locations API Route
 * GET /api/search/topics
 *
 * Returns the most popular topics and locations sorted by post count.
 * Uses aggregation over recent threads.
 *
 * Query Parameters:
 * - limit: Max items to return per category (default 10, max 30)
 */

import { NextRequest, NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { serverDatabases } from '@/lib/appwriteServer';
import { APPWRITE_CONFIG } from '@/lib/appwriteConfig';
import { Thread } from '@/types/appwrite';
import { logger } from '@/lib/logger/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '10', 10),
      30
    );

    // Fetch recent threads that have a topic OR location set
    // We fetch a larger batch and aggregate client-side
    const [topicResult, locationResult] = await Promise.all([
      serverDatabases.listDocuments<Thread>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.THREADS,
        [
          Query.equal('parentThreadId', ''),
          Query.notEqual('topic', ''),
          Query.orderDesc('createdAt'),
          Query.limit(500),
        ]
      ),
      serverDatabases.listDocuments<Thread>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.THREADS,
        [
          Query.equal('parentThreadId', ''),
          Query.notEqual('location', ''),
          Query.orderDesc('createdAt'),
          Query.limit(500),
        ]
      ),
    ]);

    // Count topic frequency
    const topicCounts = new Map<string, number>();
    for (const thread of topicResult.documents) {
      if (thread.topic && thread.topic.trim()) {
        const topic = thread.topic.trim();
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      }
    }

    // Count location frequency
    const locationCounts = new Map<string, number>();
    for (const thread of locationResult.documents) {
      if (thread.location && thread.location.trim()) {
        const location = thread.location.trim();
        locationCounts.set(location, (locationCounts.get(location) || 0) + 1);
      }
    }

    // Sort by count, descending
    const trendingTopics = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([topic, count]) => ({ topic, count }));

    const trendingLocations = Array.from(locationCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([location, count]) => ({ location, count }));

    logger.info({
      msg: 'Trending topics & locations fetched',
      totalTopics: topicCounts.size,
      totalLocations: locationCounts.size,
      returnedTopics: trendingTopics.length,
      returnedLocations: trendingLocations.length,
    });

    return NextResponse.json(
      {
        success: true,
        topics: trendingTopics,
        locations: trendingLocations,
      },
      {
        headers: {
          // Cache for 2 minutes — trending data can be slightly stale
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    logger.error({
      msg: 'Trending topics/locations error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch trending data',
        topics: [],
        locations: [],
      },
      { status: 500 }
    );
  }
}
