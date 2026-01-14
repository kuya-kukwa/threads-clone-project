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
    
    return schema.parse(envVars);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues?.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') || 'Unknown validation error';
      throw new Error(`Environment variable validation failed: ${missingVars}`);
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
    IMAGE_URL: 'imageUrl',
    PARENT_THREAD_ID: 'parentThreadId',
    REPLY_COUNT: 'replyCount',
    LIKE_COUNT: 'likeCount',
    CREATED_AT: 'createdAt',
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
} as const;
