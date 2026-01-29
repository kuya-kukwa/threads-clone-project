/**
 * Profile Service
 * Handles user profile CRUD operations
 * Follows SOLID principles: Single Responsibility Pattern
 */

import { Query } from 'appwrite';
import { serverDatabases } from '../appwriteServer';
import { APPWRITE_CONFIG } from '../appwriteConfig';
import { UserProfile } from '@/types/appwrite';
import { ProfileUpdateInput } from '@/schemas/profile.schema';
import { sanitizeInput } from '@/lib/utils';
import { logger } from '@/lib/logger/logger';

export class ProfileService {
  /**
   * Get user profile by user ID
   */
  static async getProfileByUserId(userId: string): Promise<UserProfile | null> {
    try {
      const response = await serverDatabases.listDocuments<UserProfile>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.USERS,
        [Query.equal('userId', userId), Query.limit(1)]
      );
      
      return response.documents[0] || null;
    } catch (error: unknown) {
      logger.error({ msg: 'Get profile by userId error', userId, error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  }
  
  /**
   * Get user profile by username
   */
  static async getProfileByUsername(username: string): Promise<UserProfile | null> {
    try {
      const response = await serverDatabases.listDocuments<UserProfile>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.USERS,
        [Query.equal('username', username.toLowerCase()), Query.limit(1)]
      );
      
      return response.documents[0] || null;
    } catch (error: unknown) {
      logger.error({ msg: 'Get profile by username error', username, error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  }
  
  /**
   * Update user profile
   */
  static async updateProfile(
    profileId: string,
    input: ProfileUpdateInput
  ): Promise<{ success: boolean; profile?: UserProfile; error?: string }> {
    try {
      // Sanitize inputs
      const sanitizedDisplayName = sanitizeInput(input.displayName);
      const sanitizedBio = input.bio ? sanitizeInput(input.bio) : '';
      
      // Update profile document
      const profile = await serverDatabases.updateDocument<UserProfile>(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.USERS,
        profileId,
        {
          displayName: sanitizedDisplayName,
          bio: sanitizedBio,
          avatarUrl: input.avatarUrl || '',
          updatedAt: new Date().toISOString(),
        }
      );
      
      return { success: true, profile };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
      logger.error({ msg: 'Update profile error', profileId, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }
}
