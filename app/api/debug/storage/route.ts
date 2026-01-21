/**
 * Debug Storage Endpoint
 * GET /api/debug/storage
 * 
 * Tests Appwrite Storage connectivity and permissions
 * REMOVE IN PRODUCTION after debugging
 */

import { NextResponse } from 'next/server';
import { serverStorage } from '@/lib/appwriteServer';
import { APPWRITE_CONFIG } from '@/lib/appwriteConfig';

export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    bucketId: APPWRITE_CONFIG.BUCKETS.THREAD_IMAGES,
    apiKeyConfigured: !!process.env.APPWRITE_API_KEY,
    apiKeyLength: process.env.APPWRITE_API_KEY?.length || 0,
    apiKeyPrefix: process.env.APPWRITE_API_KEY?.substring(0, 10) || 'NOT_SET',
  };

  // Test 1: Can we access the bucket?
  try {
    const bucket = await serverStorage.getBucket(APPWRITE_CONFIG.BUCKETS.THREAD_IMAGES);
    results.bucketAccess = 'SUCCESS';
    results.bucketDetails = {
      id: bucket.$id,
      name: bucket.name,
      enabled: bucket.enabled,
      maxFileSize: bucket.maximumFileSize,
      allowedExtensions: bucket.allowedFileExtensions,
    };
  } catch (error) {
    results.bucketAccess = 'FAILED';
    results.bucketError = error instanceof Error ? error.message : String(error);
  }

  // Test 2: Can we list files in the bucket?
  try {
    const files = await serverStorage.listFiles(APPWRITE_CONFIG.BUCKETS.THREAD_IMAGES);
    results.listFiles = 'SUCCESS';
    results.fileCount = files.total;
  } catch (error) {
    results.listFiles = 'FAILED';
    results.listFilesError = error instanceof Error ? error.message : String(error);
  }

  // Test 3: Try a minimal file upload
  try {
    const { InputFile } = await import('node-appwrite/file');
    const testBuffer = Buffer.from('test');
    const testFile = InputFile.fromBuffer(testBuffer, 'test.txt');
    
    // We won't actually upload, just verify InputFile works
    results.inputFileCreation = 'SUCCESS';
    results.inputFileType = typeof testFile;
  } catch (error) {
    results.inputFileCreation = 'FAILED';
    results.inputFileError = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(results, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
