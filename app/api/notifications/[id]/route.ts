/**
 * Single Notification API Route
 *
 * DELETE /api/notifications/[id] - Delete a notification
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSessionClient } from '@/lib/appwriteServer';
import { NotificationService } from '@/lib/services/notificationService';
import { logger } from '@/lib/logger/logger';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/notifications/[id]
 * Delete a specific notification
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const notificationId = params.id;

    // Get current user
    const { account } = await createSessionClient(request);
    const user = await account.get();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await NotificationService.deleteNotification(
      notificationId,
      user.$id
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({
      msg: 'Delete notification error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { success: false, error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
