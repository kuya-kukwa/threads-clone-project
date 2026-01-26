/**
 * Avatar Proxy API
 * GET /api/avatar/[fileId]
 * Proxies avatar images from Appwrite storage to bypass CORS/permission issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { serverStorage } from '@/lib/appwriteServer';
import { APPWRITE_CONFIG } from '@/lib/appwriteConfig';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    
    if (!fileId) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 });
    }

    console.log('[Avatar Proxy] Fetching file:', fileId);

    // Get file view (raw file) from Appwrite using server SDK
    const fileBuffer = await serverStorage.getFileView(
      APPWRITE_CONFIG.BUCKETS.AVATARS,
      fileId
    );

    console.log('[Avatar Proxy] File fetched, size:', fileBuffer.byteLength);

    // Return image with proper headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[Avatar Proxy] Error:', error);
    return NextResponse.json({ error: 'Avatar not found' }, { status: 404 });
  }
}
