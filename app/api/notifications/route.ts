/**
 * Notifications API Route
 *
 * GET /api/notifications - Get user's notifications with pagination
 * POST /api/notifications/read - Mark notifications as read
 * DELETE /api/notifications/[id] - Delete a notification
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSessionClient } from '@/lib/appwriteServer';
import { NotificationService } from '@/lib/services/notificationService';
import { logger } from '@/lib/logger/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications
 * Get notifications for the current user
 */
export async function GET(request: NextRequest) {
  try {
    // Get current user
    const { account } = await createSessionClient(request);
    const user = await account.get();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 20;
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    logger.info({
      msg: 'Fetching notifications',
      userId: user.$id,
      cursor,
      limit,
      unreadOnly,
    });

    const { notifications, nextCursor, hasMore, unreadCount } =
      await NotificationService.getNotifications(user.$id, cursor, limit, unreadOnly);

    return NextResponse.json({
      success: true,
      notifications,
      nextCursor,
      hasMore,
      unreadCount,
    });
  } catch (error) {
    logger.error({
      msg: 'Notifications fetch error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Check if it's an auth error
    if (error instanceof Error && error.message.includes('No session')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * Mark notifications as read
 * Body: { notificationId?: string } - If provided, marks single notification; otherwise marks all
 */
export async function POST(request: NextRequest) {
  try {
    // Get current user
    const { account } = await createSessionClient(request);
    const user = await account.get();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { notificationId } = body;

    if (notificationId) {
      // Mark single notification as read
      const result = await NotificationService.markAsRead(notificationId, user.$id);
      
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true, marked: 1 });
    } else {
      // Mark all as read
      const result = await NotificationService.markAllAsRead(user.$id);

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true, marked: result.count });
    }
  } catch (error) {
    logger.error({
      msg: 'Mark notifications error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { success: false, error: 'Failed to mark notifications' },
      { status: 500 }
    );
  }
}
