/**
 * Debug API Route - Check User Profile
 * Helps debug profile lookup issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { serverDatabases } from '@/lib/appwriteServer';
import { APPWRITE_CONFIG } from '@/lib/appwriteConfig';
import { Query } from 'appwrite';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        console.log('[Debug API] Mapping profile:', p.$id, (p as any).userId);
        return {
          documentId: p.$id,
          userId: (p as any).userId,
          username: (p as any).username,
          displayName: (p as any).displayName,
        };
      }),
    };
    
    console.log('[Debug API] Returning response');
    return NextResponse.json(responseData);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
