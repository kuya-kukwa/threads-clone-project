import { z } from 'zod';

/**
 * Check if running on server
 */
const isServer = typeof window === 'undefined';

/**
 * Client-side environment schema
 * Only validates public environment variables
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_APPWRITE_ENDPOINT: z.string().url('Invalid Appwrite endpoint URL'),
  NEXT_PUBLIC_APPWRITE_PROJECT_ID: z.string().min(1, 'Appwrite project ID is required'),
});

/**
 * Server-side environment schema
 * Validates all environment variables including server-only ones
 */
const serverEnvSchema = clientEnvSchema.extend({
  APPWRITE_API_KEY: z.string().min(1, 'Appwrite API key is required'),
  APPWRITE_DATABASE_ID: z.string().min(1, 'Appwrite database ID is required'),
});

/**
 * Validates and exports environment variables
 * Uses different schemas for client and server
 */
function validateEnv() {
  try {
    const schema = isServer ? serverEnvSchema : clientEnvSchema;
    const envVars = {
      NEXT_PUBLIC_APPWRITE_ENDPOINT: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
      NEXT_PUBLIC_APPWRITE_PROJECT_ID: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
      ...(isServer && {
        APPWRITE_API_KEY: process.env.APPWRITE_API_KEY,
        APPWRITE_DATABASE_ID: process.env.APPWRITE_DATABASE_ID,
      }),
    };
    
    // Log environment state in production for debugging
    if (!isServer && typeof window !== 'undefined') {
      console.log('[Environment Check] Appwrite config:', {
        hasEndpoint: !!envVars.NEXT_PUBLIC_APPWRITE_ENDPOINT,
        hasProjectId: !!envVars.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
        endpoint: envVars.NEXT_PUBLIC_APPWRITE_ENDPOINT,
        projectId: envVars.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
        environment: process.env.NODE_ENV,
      });
    }
    
    return schema.parse(envVars);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues?.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') || 'Unknown validation error';
      const errorMsg = `Environment variable validation failed: ${missingVars}`;
      
      // In production, log more details for debugging
      if (process.env.NODE_ENV === 'production') {
        console.error('[Critical] ' + errorMsg, {
          serverSide: isServer,
          availableEnvKeys: Object.keys(process.env).filter(k => k.includes('APPWRITE')),
        });
      }
      
      throw new Error(errorMsg);
    }
    throw error;
  }
}

// Validate on module load (fails fast if config is wrong)
export const env = validateEnv();

/**
 * Get database ID (server-only)
 * Throws if accessed on client
 */
function getDatabaseId(): string {
  if (!isServer) {
    throw new Error('DATABASE_ID can only be accessed on the server');
  }
  return process.env.APPWRITE_DATABASE_ID || '';
}

/**
 * Appwrite Database Configuration
 * Collection IDs and attribute names as typed constants
 */
export const APPWRITE_CONFIG = {
  get DATABASE_ID() {
    return getDatabaseId();
  },
  
  COLLECTIONS: {
    USERS: 'users',
    THREADS: 'threads',
    LIKES: 'likes',
    FOLLOWS: 'follows',
    NOTIFICATIONS: 'notifications',
  },
  
  // Storage buckets
  BUCKETS: {
    THREAD_IMAGES: 'thread-images',
    AVATARS: 'thread-images', // Using same bucket for avatars (plan limit)
  },
  
  // User profile attributes
  USER_ATTRIBUTES: {
    USER_ID: 'userId',
    USERNAME: 'username',
    DISPLAY_NAME: 'displayName',
    BIO: 'bio',
    AVATAR_URL: 'avatarUrl',
    CREATED_AT: 'createdAt',
    UPDATED_AT: 'updatedAt',
  },
  
  // Thread post attributes
  THREAD_ATTRIBUTES: {
    AUTHOR_ID: 'authorId',
    CONTENT: 'content',
    IMAGE_ID: 'imageId',
    IMAGE_URL: 'imageUrl',
    ALT_TEXT: 'altText',
    PARENT_THREAD_ID: 'parentThreadId',
    REPLY_TO_USERNAME: 'replyToUsername',
    REPLY_COUNT: 'replyCount',
    LIKE_COUNT: 'likeCount',
    CREATED_AT: 'createdAt',
    UPDATED_AT: 'updatedAt',
  },
  
  // Like attributes
  LIKE_ATTRIBUTES: {
    USER_ID: 'userId',
    THREAD_ID: 'threadId',
    CREATED_AT: 'createdAt',
  },
  
  // Follow attributes
  FOLLOW_ATTRIBUTES: {
    FOLLOWER_ID: 'followerId',
    FOLLOWING_ID: 'followingId',
    CREATED_AT: 'createdAt',
  },
};

/**
 * Security Configuration
 */
export const SECURITY_CONFIG = {
  // Rate limiting (requests per minute)
  RATE_LIMITS: {
    AUTH: 5, // Login/register attempts
    POST_CREATE: 10,
    LIKE: 30,
    FOLLOW: 20,
  },
  
  // Content validation
  MAX_LENGTHS: {
    USERNAME: 30,
    DISPLAY_NAME: 50,
    BIO: 160,
    THREAD_CONTENT: 500,
  },
  
  MIN_LENGTHS: {
    USERNAME: 3,
    DISPLAY_NAME: 1,
    PASSWORD: 8,
  },
  
  // Image upload limits
  IMAGE: {
    MAX_SIZE_MB: 5,
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
  
  // Avatar upload limits
  AVATAR: {
    MAX_SIZE_MB: 2,
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    MIN_DIMENSION: 100,
    MAX_DIMENSION: 1000,
  },
  
  // Video upload limits
  VIDEO: {
    MAX_SIZE_MB: 50,
    ALLOWED_TYPES: ['video/mp4', 'video/webm', 'video/quicktime'],
    MAX_DURATION_SECONDS: 60, // 1 minute max
  },
  
  // Combined media limits
  MEDIA: {
    MAX_FILES_PER_POST: 4, // Maximum media items per thread
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/quicktime'],
    MAX_IMAGE_SIZE_MB: 5,
    MAX_VIDEO_SIZE_MB: 50,
  },
} as const;
