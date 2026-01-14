/**
 * Debug API Route - Check Appwrite Connection
 * Tests if server can connect to Appwrite
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check environment variables
    const envCheck = {
      NEXT_PUBLIC_APPWRITE_ENDPOINT: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'NOT SET',
      NEXT_PUBLIC_APPWRITE_PROJECT_ID: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'NOT SET',
      APPWRITE_API_KEY: process.env.APPWRITE_API_KEY ? 'SET (hidden)' : 'NOT SET',
      NEXT_PUBLIC_APPWRITE_DATABASE_ID: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'NOT SET',
    };
    
    // Try to import and use server client
    let serverClientStatus = 'NOT TESTED';
    let usersApiStatus = 'NOT TESTED';
    let databasesApiStatus = 'NOT TESTED';
    
    try {
      const { serverClient, serverUsers, serverDatabases } = await import('@/lib/appwriteServer');
      serverClientStatus = 'IMPORTED OK';
      
      // Test Users API - list users (should return empty or list)
      try {
        const users = await serverUsers.list();
        usersApiStatus = `OK - Found ${users.total} users in Auth`;
      } catch (e: any) {
        usersApiStatus = `ERROR: ${e.message}`;
      }
      
      // Test Databases API - list documents
      try {
        const { APPWRITE_CONFIG } = await import('@/lib/appwriteConfig');
        const docs = await serverDatabases.listDocuments(
          APPWRITE_CONFIG.DATABASE_ID,
          APPWRITE_CONFIG.COLLECTIONS.USERS
        );
        databasesApiStatus = `OK - Found ${docs.total} profiles in database`;
      } catch (e: any) {
        databasesApiStatus = `ERROR: ${e.message}`;
      }
      
    } catch (e: any) {
      serverClientStatus = `IMPORT ERROR: ${e.message}`;
    }
    
    return NextResponse.json({
      status: 'Debug info',
      environment: envCheck,
      serverClient: serverClientStatus,
      usersApi: usersApiStatus,
      databasesApi: databasesApiStatus,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
