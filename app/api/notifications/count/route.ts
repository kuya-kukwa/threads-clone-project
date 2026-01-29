/**
 * Notification Count API Route
 *
 * GET /api/notifications/count - Get unread notification count
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSessionClient } from '@/lib/appwriteServer';
import { NotificationService } from '@/lib/services/notificationService';
import { logger } from '@/lib/logger/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications/count
 * Get unread notification count for the current user
 */
export async function GET(request: NextRequest) {
  try {
    // Get current user
    const { account } = await createSessionClient(request);
    const user = await account.get();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', count: 0 },
        { status: 401 }
      );
    }

    const count = await NotificationService.getUnreadCount(user.$id);

    return NextResponse.json({
      success: true,
      count,
    });
  } catch (error) {
    logger.error({
      msg: 'Notification count error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Return 0 count on error instead of failing
    return NextResponse.json({
      success: true,
      count: 0,
    });
  }
}
