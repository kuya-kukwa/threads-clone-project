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
    
    // Try to find profile by userId
    const profilesByUserId = await serverDatabases.listDocuments(
      APPWRITE_CONFIG.DATABASE_ID,
      APPWRITE_CONFIG.COLLECTIONS.USERS,
      [Query.equal('userId', id)]
    );
    
    // Also list all profiles to see what's there
    const allProfiles = await serverDatabases.listDocuments(
      APPWRITE_CONFIG.DATABASE_ID,
      APPWRITE_CONFIG.COLLECTIONS.USERS,
      [Query.limit(10)]
    );
    
    return NextResponse.json({
      searchedUserId: id,
      foundByUserId: profilesByUserId.documents,
      allProfilesInDatabase: allProfiles.documents.map(p => ({
        documentId: p.$id,
        userId: (p as any).userId,
        username: (p as any).username,
        displayName: (p as any).displayName,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
