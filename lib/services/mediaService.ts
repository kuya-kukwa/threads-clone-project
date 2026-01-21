/**
 * Media Upload Service
 * Handles image and video uploads to Appwrite Storage
 * 
 * Features:
 * - Multi-file upload support
 * - Image and video validation
 * - Thumbnail generation for videos (future)
 * - Progress tracking
 * 
 * Security:
 * - Server-side upload only
 * - File type validation
 * - Size limits per media type
 */

import { ID } from 'node-appwrite';
import { serverStorage } from '@/lib/appwriteServer';
import { APPWRITE_CONFIG, SECURITY_CONFIG } from '@/lib/appwriteConfig';
import { mediaUploadSchema } from '@/schemas/thread.schema';
import { MediaItem, MediaType, SingleMediaUploadResult } from '@/types/appwrite';
import { logger } from '@/lib/logger/logger';

/**
 * Determine media type from MIME type
 */
export function getMediaType(mimeType: string): MediaType | null {
  if ((SECURITY_CONFIG.MEDIA.ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType)) {
    return 'image';
  }
  if ((SECURITY_CONFIG.MEDIA.ALLOWED_VIDEO_TYPES as readonly string[]).includes(mimeType)) {
    return 'video';
  }
  return null;
}

/**
 * Validate media file before upload
 * @param file - File to validate
 * @returns Validation result with media type
 */
export function validateMediaFile(file: File): { 
  valid: boolean; 
  error?: string; 
  mediaType?: MediaType 
} {
  const mediaType = getMediaType(file.type);
  
  if (!mediaType) {
    const allowedTypes = [
      ...SECURITY_CONFIG.MEDIA.ALLOWED_IMAGE_TYPES,
      ...SECURITY_CONFIG.MEDIA.ALLOWED_VIDEO_TYPES,
    ].join(', ');
    return {
      valid: false,
      error: `File type not allowed. Supported: ${allowedTypes}`,
    };
  }

  const validation = mediaUploadSchema.safeParse({
    file,
    size: file.size,
    type: file.type,
  });

  if (!validation.success) {
    return {
      valid: false,
      error: validation.error.issues[0]?.message || 'Invalid media file',
    };
  }

  return { valid: true, mediaType };
}

/**
 * Validate multiple media files
 * @param files - Array of files to validate
 * @returns Validation result
 */
export function validateMediaFiles(files: File[]): { 
  valid: boolean; 
  error?: string;
  validFiles?: Array<{ file: File; mediaType: MediaType }>;
} {
  if (files.length === 0) {
    return { valid: false, error: 'No files provided' };
  }

  if (files.length > SECURITY_CONFIG.MEDIA.MAX_FILES_PER_POST) {
    return { 
      valid: false, 
      error: `Maximum ${SECURITY_CONFIG.MEDIA.MAX_FILES_PER_POST} files allowed per post` 
    };
  }

  const validFiles: Array<{ file: File; mediaType: MediaType }> = [];

  for (const file of files) {
    const result = validateMediaFile(file);
    if (!result.valid) {
      return { valid: false, error: `${file.name}: ${result.error}` };
    }
    validFiles.push({ file, mediaType: result.mediaType! });
  }

  return { valid: true, validFiles };
}

/**
 * Get media URL for a file
 * Builds URL manually to avoid async SDK issues
 */
export function getMediaUrl(fileId: string, mediaType: MediaType): string {
  if (!fileId || fileId.trim() === '') {
    return '';
  }

  try {
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
    const bucketId = APPWRITE_CONFIG.BUCKETS.THREAD_IMAGES; // Same bucket for all media

    if (!endpoint || !projectId) {
      logger.error({ msg: 'Missing Appwrite config for media URL generation' });
      return '';
    }

    const baseUrl = `${endpoint}/storage/buckets/${bucketId}/files/${fileId}`;
    
    // For images, use view endpoint
    // For videos, also use view endpoint (streaming)
    return `${baseUrl}/view?project=${projectId}`;
  } catch (error) {
    logger.error({
      msg: 'Failed to generate media URL',
      fileId,
      mediaType,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return '';
  }
}

/**
 * Get thumbnail URL for video (preview image)
 * Currently returns empty - could be enhanced with video thumbnail service
 * @param _fileId - Appwrite file ID (unused, reserved for future thumbnail generation)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getVideoThumbnailUrl(_fileId: string): string {
  // Future: Generate video thumbnails using a service like FFmpeg
  // For now, return empty (UI will show video player directly)
  return '';
}

/**
 * Upload a single media file to Appwrite Storage
 * @param file - Media file to upload
 * @param altText - Optional accessibility text
 * @returns Upload result with MediaItem
 */
export async function uploadMediaFile(
  file: File,
  altText?: string
): Promise<SingleMediaUploadResult> {
  try {
    // Validate file
    const validation = validateMediaFile(file);
    if (!validation.valid || !validation.mediaType) {
      logger.warn({ msg: 'Media validation failed', error: validation.error });
      return {
        success: false,
        error: validation.error,
      };
    }

    const mediaType = validation.mediaType;

    logger.info({
      msg: 'Starting media upload',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      mediaType,
      bucketId: APPWRITE_CONFIG.BUCKETS.THREAD_IMAGES,
    });

    // Verify bucket ID is configured
    if (!APPWRITE_CONFIG.BUCKETS.THREAD_IMAGES) {
      logger.error({ msg: 'Thread media bucket ID not configured' });
      return {
        success: false,
        error: 'Storage bucket not configured. Please contact support.',
      };
    }

    // Verify the bucket exists
    try {
      const bucket = await serverStorage.getBucket(APPWRITE_CONFIG.BUCKETS.THREAD_IMAGES);
      logger.debug({ msg: 'Bucket verified', bucketId: bucket.$id, bucketName: bucket.name });
    } catch (bucketError) {
      const bucketErrorMsg = bucketError instanceof Error ? bucketError.message : 'Unknown bucket error';
      logger.error({ 
        msg: 'Storage bucket not found or inaccessible', 
        bucketId: APPWRITE_CONFIG.BUCKETS.THREAD_IMAGES,
        error: bucketErrorMsg
      });
      return {
        success: false,
        error: `Storage bucket "${APPWRITE_CONFIG.BUCKETS.THREAD_IMAGES}" not found.`,
      };
    }

    // Generate unique file ID
    const fileId = ID.unique();
    logger.debug({ msg: 'Generated file ID', fileId });

    // Convert File to Buffer for node-appwrite
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Normalize file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    const normalizedName = file.name.replace(/\.[^.]+$/, `.${fileExtension}`);
    
    logger.debug({ 
      msg: 'File details for upload', 
      originalName: file.name, 
      normalizedName,
      fileExtension,
      mimeType: file.type 
    });
    
    // Create InputFile from buffer
    const { InputFile } = await import('node-appwrite/file');
    const inputFile = InputFile.fromBuffer(buffer, normalizedName);

    // Upload to Appwrite Storage
    logger.debug({ msg: 'Uploading to Appwrite Storage', bucketId: APPWRITE_CONFIG.BUCKETS.THREAD_IMAGES });
    
    const uploadedFile = await serverStorage.createFile(
      APPWRITE_CONFIG.BUCKETS.THREAD_IMAGES,
      fileId,
      inputFile,
      undefined // permissions (use bucket-level permissions)
    );

    logger.debug({ msg: 'File uploaded to Appwrite', uploadedFileId: uploadedFile.$id });

    // Generate URL
    const url = getMediaUrl(uploadedFile.$id, mediaType);
    const thumbnailUrl = mediaType === 'video' ? getVideoThumbnailUrl(uploadedFile.$id) : undefined;

    const mediaItem: MediaItem = {
      id: uploadedFile.$id,
      url,
      type: mediaType,
      altText: altText || undefined,
      thumbnailUrl,
      mimeType: file.type,
    };

    logger.info({
      msg: 'Media uploaded successfully',
      fileId: uploadedFile.$id,
      fileName: uploadedFile.name,
      mediaType,
      url,
    });

    return {
      success: true,
      item: mediaItem,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = (error && typeof error === 'object' && ('code' in error || 'type' in error)) 
      ? (error as { code?: string; type?: string }).code || (error as { code?: string; type?: string }).type || 'UNKNOWN'
      : 'UNKNOWN';
    
    logger.error({
      msg: 'Media upload failed',
      error: errorMessage,
      errorCode,
      errorType: typeof error,
      errorDetails: error instanceof Error ? error.stack : String(error),
      bucketId: APPWRITE_CONFIG.BUCKETS.THREAD_IMAGES,
    });

    // User-friendly error messages
    let userMessage = 'Failed to upload media. Please try again.';
    if (errorMessage.includes('bucket') || errorMessage.includes('Bucket')) {
      userMessage = 'Storage configuration error. Please contact support.';
    } else if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
      userMessage = 'Permission denied. Please log in again.';
    } else if (errorMessage.includes('size') || errorMessage.includes('Size')) {
      userMessage = 'File is too large.';
    } else if (errorMessage.includes('type') || errorMessage.includes('Type') || errorMessage.includes('extension')) {
      userMessage = 'Invalid file format.';
    }

    return {
      success: false,
      error: userMessage,
    };
  }
}

/**
 * Upload multiple media files
 * @param files - Array of files to upload
 * @param altTexts - Optional array of alt texts (same order as files)
 * @returns Upload results for all files
 */
export async function uploadMultipleMediaFiles(
  files: File[],
  altTexts?: string[]
): Promise<{ success: boolean; media?: MediaItem[]; error?: string; partialResults?: SingleMediaUploadResult[] }> {
  // Validate all files first
  const validation = validateMediaFiles(files);
  if (!validation.valid || !validation.validFiles) {
    return { success: false, error: validation.error };
  }

  const results: SingleMediaUploadResult[] = [];
  const successfulMedia: MediaItem[] = [];

  // Upload files sequentially to avoid overwhelming the server
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const altText = altTexts?.[i];
    
    const result = await uploadMediaFile(file, altText);
    results.push(result);

    if (result.success && result.item) {
      successfulMedia.push(result.item);
    } else {
      // If any upload fails, return partial results
      logger.warn({
        msg: 'Multi-file upload partially failed',
        failedFile: file.name,
        error: result.error,
        uploadedCount: successfulMedia.length,
        totalCount: files.length,
      });
      
      return {
        success: false,
        error: `Failed to upload ${file.name}: ${result.error}`,
        partialResults: results,
        media: successfulMedia.length > 0 ? successfulMedia : undefined,
      };
    }
  }

  logger.info({
    msg: 'All media files uploaded successfully',
    count: successfulMedia.length,
  });

  return {
    success: true,
    media: successfulMedia,
  };
}

/**
 * Delete media file from Appwrite Storage
 * Used for cleanup when thread creation fails
 * @param fileId - Appwrite file ID
 */
export async function deleteMediaFile(fileId: string): Promise<boolean> {
  try {
    await serverStorage.deleteFile(APPWRITE_CONFIG.BUCKETS.THREAD_IMAGES, fileId);
    
    logger.info({
      msg: 'Media deleted',
      fileId,
    });

    return true;
  } catch (error) {
    logger.error({
      msg: 'Media deletion failed',
      fileId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return false;
  }
}

/**
 * Delete multiple media files
 * Used for cleanup when thread creation fails
 */
export async function deleteMultipleMediaFiles(fileIds: string[]): Promise<void> {
  await Promise.all(fileIds.map(id => deleteMediaFile(id)));
}
