/**
 * Debug API Route - Check User Profile
 * Helps debug profile lookup issues
 * 
 * SECURITY: Only available in development mode
 */

import { NextRequest, NextResponse } from 'next/server';
import { serverDatabases } from '@/lib/appwriteServer';
import { APPWRITE_CONFIG } from '@/lib/appwriteConfig';
import { Query } from 'appwrite';
import { logger } from '@/lib/logger/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Block in production
  if (process.env.NODE_ENV === 'production') {
    logger.warn({
      msg: 'Attempt to access debug endpoint in production',
      endpoint: '/api/debug/profile',
    });
    return NextResponse.json(
      { error: 'Debug endpoints are not available in production' },
      { status: 404 }
    );
  }

  try {
    const { id } = await params;
    
    console.log('[Debug API] Searching for userId:', id);
    
    // Try to find profile by userId
    let profilesByUserId;
    try {
      profilesByUserId = await serverDatabases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.USERS,
        [Query.equal('userId', id)]
      );
      console.log('[Debug API] profilesByUserId result:', profilesByUserId.documents.length, 'documents');
    } catch (error) {
      console.error('[Debug API] Error in profilesByUserId query:', error);
      profilesByUserId = { documents: [] };
    }
    
    // Also list all profiles to see what's there
    let allProfiles;
    try {
      allProfiles = await serverDatabases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.USERS,
        [Query.limit(10)]
      );
      console.log('[Debug API] allProfiles result:', allProfiles.documents.length, 'documents');
    } catch (error) {
      console.error('[Debug API] Error in allProfiles query:', error);
      allProfiles = { documents: [] };
    }
    
    console.log('[Debug API] Preparing response data');
    
    const responseData = {
      searchedUserId: id,
      foundByUserId: profilesByUserId.documents,
      allProfilesInDatabase: allProfiles.documents.map(p => {
        const profile = p as unknown as { userId?: string; username?: string; displayName?: string };
        console.log('[Debug API] Mapping profile:', p.$id, profile.userId);
        return {
          documentId: p.$id,
          userId: profile.userId,
          username: profile.username,
          displayName: profile.displayName,
        };
      }),
    };
    
    console.log('[Debug API] Returning response');
    return NextResponse.json(responseData);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
