/**
 * Thread Schema
 * Zod validation for thread posts
 * 
 * Security: Client & server-side validation
 * Max length aligned with SECURITY_CONFIG.MAX_LENGTHS.THREAD_CONTENT
 */

import { z } from 'zod';
import { SECURITY_CONFIG } from '@/lib/appwriteConfig';

/**
 * Thread creation input schema
 * Used for validating new thread posts
 * 
 * VALID STATES:
 * - Text only (content required)
 * - Image only (imageId required)
 * - Text + Image (both required)
 * - Neither → REJECTED
 */
export const threadCreateSchema = z.object({
  content: z
    .string()
    .max(
      SECURITY_CONFIG.MAX_LENGTHS.THREAD_CONTENT,
      `Thread cannot exceed ${SECURITY_CONFIG.MAX_LENGTHS.THREAD_CONTENT} characters`
    )
    .trim()
    .optional()
    .default(''),
  
  imageId: z
    .string()
    .optional(),
  
  altText: z
    .string()
    .max(200, 'Alt text cannot exceed 200 characters')
    .optional(),
}).refine(
  (data) => {
    // At least one of content or imageId must be provided
    const hasContent = data.content && data.content.trim().length > 0;
    const hasImage = data.imageId && data.imageId.trim().length > 0;
    return hasContent || hasImage;
  },
  {
    message: 'Thread must have either text content or an image',
    path: ['content'], // Associate error with content field
  }
);

/**
 * Thread update input schema
 * Currently threads are immutable (no edit after posting)
 * Reserved for future use
 */
export const threadUpdateSchema = z.object({
  content: z
    .string()
    .min(1, 'Thread content cannot be empty')
    .max(
      SECURITY_CONFIG.MAX_LENGTHS.THREAD_CONTENT,
      `Thread cannot exceed ${SECURITY_CONFIG.MAX_LENGTHS.THREAD_CONTENT} characters`
    )
    .trim(),
});

/**
 * Image metadata schema
 * Validates image file before upload
 */
export const imageUploadSchema = z.object({
  file: z.instanceof(File, { message: 'Invalid file' }),
  size: z
    .number()
    .max(
      SECURITY_CONFIG.IMAGE.MAX_SIZE_MB * 1024 * 1024,
      `Image size cannot exceed ${SECURITY_CONFIG.IMAGE.MAX_SIZE_MB}MB`
    ),
  type: z
    .string()
    .refine(
      (type) => (SECURITY_CONFIG.IMAGE.ALLOWED_TYPES as readonly string[]).includes(type),
      {
        message: `Only ${SECURITY_CONFIG.IMAGE.ALLOWED_TYPES.join(', ')} images are allowed`,
      }
    ),
});

/**
 * Video metadata schema
 * Validates video file before upload
 */
export const videoUploadSchema = z.object({
  file: z.instanceof(File, { message: 'Invalid file' }),
  size: z
    .number()
    .max(
      SECURITY_CONFIG.VIDEO.MAX_SIZE_MB * 1024 * 1024,
      `Video size cannot exceed ${SECURITY_CONFIG.VIDEO.MAX_SIZE_MB}MB`
    ),
  type: z
    .string()
    .refine(
      (type) => (SECURITY_CONFIG.VIDEO.ALLOWED_TYPES as readonly string[]).includes(type),
      {
        message: `Only ${SECURITY_CONFIG.VIDEO.ALLOWED_TYPES.join(', ')} videos are allowed`,
      }
    ),
});

/**
 * Combined media upload schema
 * Validates any media file (image or video)
 */
export const mediaUploadSchema = z.object({
  file: z.instanceof(File, { message: 'Invalid file' }),
  size: z.number(),
  type: z.string(),
}).refine(
  (data) => {
    const isImage = (SECURITY_CONFIG.MEDIA.ALLOWED_IMAGE_TYPES as readonly string[]).includes(data.type);
    const isVideo = (SECURITY_CONFIG.MEDIA.ALLOWED_VIDEO_TYPES as readonly string[]).includes(data.type);
    
    if (isImage) {
      return data.size <= SECURITY_CONFIG.MEDIA.MAX_IMAGE_SIZE_MB * 1024 * 1024;
    }
    if (isVideo) {
      return data.size <= SECURITY_CONFIG.MEDIA.MAX_VIDEO_SIZE_MB * 1024 * 1024;
    }
    return false;
  },
  {
    message: `Invalid file type or size. Images: max ${SECURITY_CONFIG.MEDIA.MAX_IMAGE_SIZE_MB}MB (${SECURITY_CONFIG.MEDIA.ALLOWED_IMAGE_TYPES.join(', ')}). Videos: max ${SECURITY_CONFIG.MEDIA.MAX_VIDEO_SIZE_MB}MB (${SECURITY_CONFIG.MEDIA.ALLOWED_VIDEO_TYPES.join(', ')})`,
  }
);

/**
 * Reply creation input schema
 * Similar to thread creation but requires content (replies should be meaningful)
 * Images are optional in replies
 */
export const replyCreateSchema = z.object({
  content: z
    .string()
    .min(1, 'Reply cannot be empty')
    .max(
      SECURITY_CONFIG.MAX_LENGTHS.THREAD_CONTENT,
      `Reply cannot exceed ${SECURITY_CONFIG.MAX_LENGTHS.THREAD_CONTENT} characters`
    )
    .trim(),
  
  imageId: z
    .string()
    .optional(),
  
  altText: z
    .string()
    .max(200, 'Alt text cannot exceed 200 characters')
    .optional(),
});

/**
 * Feed pagination parameters schema
 */
export const feedPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .number()
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50')
    .default(20),
});

/**
 * Thread ID parameter schema
 * Validates thread ID from URL params
 */
export const threadIdSchema = z.object({
  id: z.string().min(1, 'Thread ID is required'),
});

/**
 * Type exports for TypeScript
 */
export type ThreadCreateInput = z.infer<typeof threadCreateSchema>;
export type ThreadUpdateInput = z.infer<typeof threadUpdateSchema>;
export type ReplyCreateInput = z.infer<typeof replyCreateSchema>;
export type ImageUploadInput = z.infer<typeof imageUploadSchema>;
export type VideoUploadInput = z.infer<typeof videoUploadSchema>;
export type MediaUploadInput = z.infer<typeof mediaUploadSchema>;
export type FeedPaginationInput = z.infer<typeof feedPaginationSchema>;
export type ThreadIdInput = z.infer<typeof threadIdSchema>;
