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
 * Thread Post Document
 * Represents a post or reply
 */
export interface Thread extends Models.Document {
  authorId: string; // References UserProfile.$id
  content: string; // Post text content
  imageUrl?: string; // Optional image URL
  parentThreadId?: string; // If reply, references parent Thread.$id
  replyCount: number; // Denormalized count of direct replies
  likeCount: number; // Denormalized count of likes
  createdAt: string; // ISO timestamp
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
