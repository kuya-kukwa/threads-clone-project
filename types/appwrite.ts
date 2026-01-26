/**
 * Type definitions for Appwrite database models
 * Matches the database schema in appwriteConfig.ts
 */

import { Models } from 'appwrite';

/**
 * User Profile Document
 * Extends Appwrite auth user with custom profile data
 */
export interface UserProfile extends Models.Document {
  userId: string; // References Appwrite Auth user ID
  username: string; // Unique username (lowercase, alphanumeric + underscore)
  displayName: string; // Display name shown in UI
  bio?: string; // Optional bio text
  avatarUrl?: string; // URL to avatar image in Appwrite Storage
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

/**
 * Media type enum for distinguishing images from videos
 */
export type MediaType = 'image' | 'video';

/**
 * Individual media item (image or video)
 */
export interface MediaItem {
  id: string; // Appwrite Storage file ID
  url: string; // Generated URL from Storage
  type: MediaType; // 'image' or 'video'
  altText?: string; // Accessibility alt text
  thumbnailUrl?: string; // For videos, thumbnail image URL
  mimeType?: string; // Original MIME type (e.g., 'image/jpeg', 'video/mp4')
}

/**
 * Thread Post Document
 * Represents a post or reply
 * 
 * Storage: Appwrite Database (threads collection)
 * Media: Stored in Appwrite Storage, referenced by mediaIds
 * 
 * Backward compatibility:
 * - imageId/imageUrl still supported for old posts
 * - New posts use media array
 */
export interface Thread extends Models.Document {
  authorId: string; // References UserProfile.userId (Appwrite Auth user ID)
  content: string; // Post text content (max 500 chars)
  
  // Legacy single image fields (backward compatibility)
  imageId?: string; // Optional Appwrite Storage file ID
  imageUrl?: string; // Optional generated image URL (from Storage)
  altText?: string; // Optional accessibility alt text for image
  
  // New multi-media support (JSON stringified array)
  mediaIds?: string; // JSON array of file IDs: '["id1", "id2"]'
  mediaUrls?: string; // JSON array of URLs: '["url1", "url2"]'
  mediaTypes?: string; // JSON array of types: '["image", "video"]'
  mediaAltTexts?: string; // JSON array of alt texts: '["alt1", "alt2"]'
  
  parentThreadId?: string; // If reply, references parent Thread.$id (future feature)
  parentReplyId?: string; // If replying to a comment, references the parent comment's $id
  replyToUsername?: string; // Username of the user being replied to (for @mention display)
  replyCount: number; // Denormalized count of direct replies (default: 0)
  likeCount: number; // Denormalized count of likes (default: 0)
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

/**
 * Like Document
 * Represents a user liking a thread
 */
export interface Like extends Models.Document {
  userId: string; // References UserProfile.$id
  threadId: string; // References Thread.$id
  createdAt: string; // ISO timestamp
}

/**
 * Follow Document
 * Represents a user following another user
 */
export interface Follow extends Models.Document {
  followerId: string; // UserProfile.$id of the follower
  followingId: string; // UserProfile.$id being followed
  createdAt: string; // ISO timestamp
}

/**
 * Thread with populated author data
 * Used in feed displays
 */
export interface ThreadWithAuthor extends Thread {
  author: UserProfile;
}

/**
 * User profile with follow counts
 * Used in profile displays
 */
export interface UserProfileWithCounts extends UserProfile {
  followersCount: number;
  followingCount: number;
  threadsCount: number;
}

/**
 * Authentication response types
 */
export interface AuthResponse {
  success: boolean;
  user?: Models.User<Models.Preferences>;
  profile?: UserProfile;
  error?: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  username: string;
  displayName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

/**
 * API Response Types
 * Standardized response structure for all API endpoints
 */

/**
 * Success response wrapper
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp?: string;
  requestId?: string;
}

/**
 * Error response wrapper
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  code: string;
  timestamp: string;
  requestId?: string;
  errors?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

/**
 * Generic API response (success or error)
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Cursor-based pagination response
 * Used for feed pagination with better performance
 */
export interface CursorPaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number; // Optional total count
}

/**
 * Loading state wrapper for async operations
 */
export interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Form submission result
 */
export interface FormResult {
  success: boolean;
  error?: string;
  code?: string;
}

/**
 * Thread-specific types
 */

/**
 * Thread creation response
 */
export interface ThreadCreateResponse {
  success: boolean;
  thread?: Thread;
  error?: string;
}

/**
 * Feed response with cursor pagination
 */
export interface FeedResponse {
  success: boolean;
  threads?: ThreadWithAuthor[];
  nextCursor?: string | null;
  hasMore?: boolean;
  error?: string;
}

/**
 * Image upload response (legacy, single file)
 */
export interface ImageUploadResponse {
  success: boolean;
  imageId?: string;
  imageUrl?: string;
  error?: string;
}

/**
 * Media upload response (multi-file support)
 */
export interface MediaUploadResponse {
  success: boolean;
  media?: MediaItem[];
  error?: string;
}

/**
 * Single media upload result
 */
export interface SingleMediaUploadResult {
  success: boolean;
  item?: MediaItem;
  error?: string;
}

/**
 * Image upload progress callback
 */
export interface UploadProgress {
  loaded: number; // Bytes uploaded
  total: number; // Total bytes
  percentage: number; // 0-100
}

