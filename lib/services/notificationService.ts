/**
 * Notification Service
 * Handles creation, retrieval, and management of notifications
 *
 * Best Practices Applied:
 * - Batch operations for efficiency
 * - Deduplication to prevent spam
 * - Self-notification prevention
 * - Cursor-based pagination
 * - Read status management
 */

import { ID, Query, Permission, Role } from 'node-appwrite';
import { serverDatabases } from '@/lib/appwriteServer';
import { APPWRITE_CONFIG } from '@/lib/appwriteConfig';
import {
  Notification,
  NotificationType,
  NotificationWithActor,
  UserProfile,
  Thread,
} from '@/types/appwrite';
import { logger } from '@/lib/logger/logger';

export class NotificationService {
  /**
   * Create a notification
   * Includes deduplication and self-notification prevention
   */
  static async createNotification({
    recipientId,
    actorId,
    type,
    threadId,
    message,
  }: {
    recipientId: string;
    actorId: string;
    type: NotificationType;
    threadId?: string;
    message?: string;
  }): Promise<{ success: boolean; notification?: Notification; error?: string }> {
    try {
      // Don't notify yourself
      if (recipientId === actorId) {
        logger.debug({
          msg: 'Skipping self-notification',
          recipientId,
          actorId,
          type,
        });
        return { success: true }; // Silent success - not an error
      }

      // Check for recent duplicate (within 5 minutes) to prevent spam
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const duplicateCheck = await serverDatabases.listDocuments<Notification>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.NOTIFICATIONS,
        [
          Query.equal('recipientId', recipientId),
          Query.equal('actorId', actorId),
          Query.equal('type', type),
          ...(threadId ? [Query.equal('threadId', threadId)] : []),
          Query.greaterThan('createdAt', fiveMinutesAgo),
          Query.limit(1),
        ]
      );

      if (duplicateCheck.documents.length > 0) {
        logger.debug({
          msg: 'Duplicate notification prevented',
          recipientId,
          actorId,
          type,
        });
        return { success: true }; // Silent success - duplicate prevention
      }

      // Create notification with proper permissions
      const notification = await serverDatabases.createDocument<Notification>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.NOTIFICATIONS,
        ID.unique(),
        {
          recipientId,
          actorId,
          type,
          threadId: threadId || '',
          message: message || '',
          read: false,
          createdAt: new Date().toISOString(),
        },
        [
          Permission.read(Role.user(recipientId)),
          Permission.update(Role.user(recipientId)),
          Permission.delete(Role.user(recipientId)),
        ]
      );

      logger.info({
        msg: 'Notification created',
        notificationId: notification.$id,
        recipientId,
        actorId,
        type,
      });

      return { success: true, notification };
    } catch (error) {
      logger.error({
        msg: 'Error creating notification',
        recipientId,
        actorId,
        type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create notification',
      };
    }
  }

  /**
   * Get notifications for a user with pagination
   */
  static async getNotifications(
    userId: string,
    cursor?: string,
    limit: number = 20,
    unreadOnly: boolean = false
  ): Promise<{
    notifications: NotificationWithActor[];
    nextCursor: string | null;
    hasMore: boolean;
    unreadCount: number;
  }> {
    try {
      const queries: string[] = [
        Query.equal('recipientId', userId),
        Query.orderDesc('createdAt'),
        Query.limit(limit + 1),
      ];

      if (unreadOnly) {
        queries.push(Query.equal('read', false));
      }

      if (cursor) {
        queries.push(Query.cursorAfter(cursor));
      }

      const response = await serverDatabases.listDocuments<Notification>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.NOTIFICATIONS,
        queries
      );

      // Determine pagination
      const hasMore = response.documents.length > limit;
      const notifications = hasMore
        ? response.documents.slice(0, limit)
        : response.documents;
      const nextCursor =
        hasMore && notifications.length > 0
          ? notifications[notifications.length - 1].$id
          : null;

      // Get unique actor IDs
      const actorIds = [...new Set(notifications.map((n) => n.actorId))];
      
      // Get unique thread IDs (filter out empty strings)
      const threadIds = [
        ...new Set(notifications.map((n) => n.threadId).filter(Boolean)),
      ] as string[];

      // Fetch actors
      const actorsResponse = await serverDatabases.listDocuments<UserProfile>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.USERS,
        [Query.equal('userId', actorIds), Query.limit(100)]
      );

      const actorMap = new Map<string, UserProfile>();
      actorsResponse.documents.forEach((actor) => {
        actorMap.set(actor.userId, actor);
      });

      // Fetch threads if any
      const threadMap = new Map<string, Thread>();
      if (threadIds.length > 0) {
        const threadsResponse = await serverDatabases.listDocuments<Thread>(
          APPWRITE_CONFIG.DATABASE_ID,
          APPWRITE_CONFIG.COLLECTIONS.THREADS,
          [Query.equal('$id', threadIds), Query.limit(100)]
        );

        threadsResponse.documents.forEach((thread) => {
          threadMap.set(thread.$id, thread);
        });
      }

      // Combine notifications with actor and thread data
      const notificationsWithActors: NotificationWithActor[] = notifications
        .filter((n) => actorMap.has(n.actorId))
        .map((notification) => ({
          ...notification,
          actor: actorMap.get(notification.actorId)!,
          thread: notification.threadId
            ? threadMap.get(notification.threadId)
            : undefined,
        }));

      // Get unread count
      const unreadResponse = await serverDatabases.listDocuments<Notification>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.NOTIFICATIONS,
        [
          Query.equal('recipientId', userId),
          Query.equal('read', false),
          Query.limit(1),
          Query.select(['$id']),
        ]
      );

      return {
        notifications: notificationsWithActors,
        nextCursor,
        hasMore,
        unreadCount: unreadResponse.total,
      };
    } catch (error) {
      logger.error({
        msg: 'Error fetching notifications',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        notifications: [],
        nextCursor: null,
        hasMore: false,
        unreadCount: 0,
      };
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const response = await serverDatabases.listDocuments<Notification>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.NOTIFICATIONS,
        [
          Query.equal('recipientId', userId),
          Query.equal('read', false),
          Query.limit(1),
          Query.select(['$id']),
        ]
      );

      return response.total;
    } catch (error) {
      logger.error({
        msg: 'Error getting unread count',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify ownership
      const notification = await serverDatabases.getDocument<Notification>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.NOTIFICATIONS,
        notificationId
      );

      if (notification.recipientId !== userId) {
        return { success: false, error: 'Not authorized' };
      }

      await serverDatabases.updateDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.NOTIFICATIONS,
        notificationId,
        { read: true }
      );

      return { success: true };
    } catch (error) {
      logger.error({
        msg: 'Error marking notification as read',
        notificationId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark as read',
      };
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      // Get all unread notifications
      const unreadNotifications = await serverDatabases.listDocuments<Notification>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.NOTIFICATIONS,
        [
          Query.equal('recipientId', userId),
          Query.equal('read', false),
          Query.limit(100), // Batch limit
        ]
      );

      // Update each notification
      let count = 0;
      for (const notification of unreadNotifications.documents) {
        try {
          await serverDatabases.updateDocument(
            APPWRITE_CONFIG.DATABASE_ID,
            APPWRITE_CONFIG.COLLECTIONS.NOTIFICATIONS,
            notification.$id,
            { read: true }
          );
          count++;
        } catch {
          // Continue on individual failures
          logger.warn({
            msg: 'Failed to mark notification as read',
            notificationId: notification.$id,
          });
        }
      }

      logger.info({
        msg: 'Marked notifications as read',
        userId,
        count,
      });

      return { success: true, count };
    } catch (error) {
      logger.error({
        msg: 'Error marking all notifications as read',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        count: 0,
        error: error instanceof Error ? error.message : 'Failed to mark all as read',
      };
    }
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(
    notificationId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify ownership
      const notification = await serverDatabases.getDocument<Notification>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.NOTIFICATIONS,
        notificationId
      );

      if (notification.recipientId !== userId) {
        return { success: false, error: 'Not authorized' };
      }

      await serverDatabases.deleteDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.NOTIFICATIONS,
        notificationId
      );

      return { success: true };
    } catch (error) {
      logger.error({
        msg: 'Error deleting notification',
        notificationId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete notification',
      };
    }
  }

  // ============================================
  // Convenience methods for creating specific notification types
  // ============================================

  /**
   * Create a like notification
   */
  static async notifyLike(
    threadAuthorId: string,
    likerId: string,
    threadId: string
  ): Promise<void> {
    await this.createNotification({
      recipientId: threadAuthorId,
      actorId: likerId,
      type: 'like',
      threadId,
    });
  }

  /**
   * Create a follow notification
   */
  static async notifyFollow(
    followedUserId: string,
    followerId: string
  ): Promise<void> {
    await this.createNotification({
      recipientId: followedUserId,
      actorId: followerId,
      type: 'follow',
    });
  }

  /**
   * Create a reply notification
   */
  static async notifyReply(
    threadAuthorId: string,
    replierId: string,
    threadId: string,
    replyContent?: string
  ): Promise<void> {
    await this.createNotification({
      recipientId: threadAuthorId,
      actorId: replierId,
      type: 'reply',
      threadId,
      message: replyContent ? replyContent.slice(0, 100) : undefined,
    });
  }

  /**
   * Create a mention notification
   */
  static async notifyMention(
    mentionedUserId: string,
    mentionerId: string,
    threadId: string
  ): Promise<void> {
    await this.createNotification({
      recipientId: mentionedUserId,
      actorId: mentionerId,
      type: 'mention',
      threadId,
    });
  }
}
