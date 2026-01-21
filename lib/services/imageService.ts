/**
 * Image Upload Service
 * Handles image uploads to Appwrite Storage with validation
 * 
 * Security:
 * - Client-side validation (size, type)
 * - Server-side upload for security
 * - Progress tracking for UX
 */

import { ID } from 'node-appwrite';
import { serverStorage } from '@/lib/appwriteServer';
import { APPWRITE_CONFIG } from '@/lib/appwriteConfig';
import { imageUploadSchema } from '@/schemas/thread.schema';
import { ImageUploadResponse } from '@/types/appwrite';
import { logger } from '@/lib/logger/logger';

/**
 * Validate image file before upload
 * @param file - File to validate
 * @returns Validation result
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const validation = imageUploadSchema.safeParse({
    file,
    size: file.size,
    type: file.type,
  });

  if (!validation.success) {
    return {
      valid: false,
      error: validation.error.issues[0]?.message || 'Invalid image file',
    };
  }

  return { valid: true };
}

/**
 * Upload image to Appwrite Storage
 * @param file - Image file to upload
 * @returns Upload result with imageId and URL
 * 
 * Error handling:
 * - Validates file before upload
 * - Catches and logs all Appwrite errors
 * - Returns structured error response (never throws)
 */
export async function uploadThreadImage(
  file: File
): Promise<ImageUploadResponse> {
  try {
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      logger.warn({ msg: 'Image validation failed', error: validation.error });
      return {
        success: false,
        error: validation.error,
      };
    }

    logger.info({
      msg: 'Starting image upload',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      bucketId: APPWRITE_CONFIG.BUCKETS.THREAD_IMAGES,
    });

    // Verify bucket ID is configured
    if (!APPWRITE_CONFIG.BUCKETS.THREAD_IMAGES) {
      logger.error({ msg: 'Thread images bucket ID not configured' });
      return {
        success: false,
        error: 'Storage bucket not configured. Please contact support.',
      };
    }

    // Generate unique file ID
    const fileId = ID.unique();
    logger.debug({ msg: 'Generated file ID', fileId });

    // Convert File to Buffer for node-appwrite
    // node-appwrite's createFile expects InputFile, not browser File
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Create InputFile from buffer
    const { InputFile } = await import('node-appwrite/file');
    const inputFile = InputFile.fromBuffer(buffer, file.name);

    // Upload to Appwrite Storage (server-side for security)
    logger.debug({ msg: 'Uploading to Appwrite Storage', bucketId: APPWRITE_CONFIG.BUCKETS.THREAD_IMAGES });
    
    const uploadedFile = await serverStorage.createFile(
      APPWRITE_CONFIG.BUCKETS.THREAD_IMAGES,
      fileId,
      inputFile,
      undefined // permissions (use bucket-level permissions)
    );

    logger.debug({ msg: 'File uploaded to Appwrite', uploadedFileId: uploadedFile.$id });

    // Generate public URL for the uploaded file
    const imageUrl = getImagePreviewUrl(uploadedFile.$id);

    logger.info({
      msg: 'Image uploaded successfully',
      fileId: uploadedFile.$id,
      fileName: uploadedFile.name,
      imageUrl,
    });

    return {
      success: true,
      imageId: uploadedFile.$id,
      imageUrl: imageUrl,
    };
  } catch (error) {
    // Detailed error logging for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = (error && typeof error === 'object' && ('code' in error || 'type' in error)) 
      ? (error as { code?: string; type?: string }).code || (error as { code?: string; type?: string }).type || 'UNKNOWN'
      : 'UNKNOWN';
    
    logger.error({
      msg: 'Image upload failed',
      error: errorMessage,
      errorCode,
      errorType: typeof error,
      errorDetails: error instanceof Error ? error.stack : String(error),
      bucketId: APPWRITE_CONFIG.BUCKETS.THREAD_IMAGES,
    });

    // Return user-friendly error messages based on error type
    let userMessage = 'Failed to upload image. Please try again.';
    
    if (errorMessage.includes('bucket') || errorMessage.includes('Bucket')) {
      userMessage = 'Storage configuration error. Please contact support.';
    } else if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
      userMessage = 'Permission denied. Please log in again.';
    } else if (errorMessage.includes('size') || errorMessage.includes('Size')) {
      userMessage = 'Image file is too large.';
    } else if (errorMessage.includes('type') || errorMessage.includes('Type')) {
      userMessage = 'Invalid image format.';
    }

    return {
      success: false,
      error: userMessage,
    };
  }
}

/**
 * Delete image from Appwrite Storage
 * Used for cleanup when thread creation fails
 * @param imageId - Appwrite file ID
 */
export async function deleteThreadImage(imageId: string): Promise<boolean> {
  try {
    await serverStorage.deleteFile(APPWRITE_CONFIG.BUCKETS.THREAD_IMAGES, imageId);
    
    logger.info({
      msg: 'Image deleted',
      imageId,
    });

    return true;
  } catch (error) {
    logger.error({
      msg: 'Image deletion failed',
      imageId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return false;
  }
}

/**
 * Get image preview URL
 * @param imageId - Appwrite file ID
 * @param width - Optional width for thumbnail
 * @param height - Optional height for thumbnail
 * @returns Image URL or empty string if no imageId
 */
export function getImagePreviewUrl(
  imageId: string | undefined | null,
  width?: number,
  height?: number
): string {
  // Guard against empty/null/undefined imageId
  if (!imageId || imageId.trim() === '') {
    return '';
  }

  try {
    if (width && height) {
      return serverStorage.getFilePreview(
        APPWRITE_CONFIG.BUCKETS.THREAD_IMAGES,
        imageId,
        width,
        height
      ).toString();
    }

    return serverStorage.getFileView(
      APPWRITE_CONFIG.BUCKETS.THREAD_IMAGES,
      imageId
    ).toString();
  } catch (error) {
    logger.error({
      msg: 'Failed to generate image preview URL',
      imageId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return '';
  }
}
