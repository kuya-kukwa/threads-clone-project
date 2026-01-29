/**
 * Server-side Appwrite client
 * Uses API key for admin operations (user creation, database writes, etc.)
 * NEVER import this in client-side code (use lib/appwriteClient.ts instead)
 */

import { Client, Account, Databases, Storage, Users } from 'node-appwrite';
import { NextRequest } from 'next/server';

// Server-only environment variables - accessed directly
const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const API_KEY = process.env.APPWRITE_API_KEY!;

/**
 * Server client with full admin privileges
 * Used for server actions and API routes
 */
export const serverClient = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY); // Admin API key for server operations

export const serverAccount = new Account(serverClient);
export const serverDatabases = new Databases(serverClient);
export const serverStorage = new Storage(serverClient);
export const serverUsers = new Users(serverClient);

/**
 * Helper to create a session-specific client for server actions
 * This respects user permissions and session context
 * @param sessionOrRequest - Either a session string or a NextRequest object
 */
export function createSessionClient(sessionOrRequest: string | NextRequest) {
  let session: string;
  
  if (typeof sessionOrRequest === 'string') {
    session = sessionOrRequest;
  } else {
    // Try to extract session from request header first (for API calls)
    const sessionHeader = sessionOrRequest.headers.get('x-session-id');
    if (sessionHeader) {
      session = sessionHeader;
    } else {
      // Fall back to cookies (for SSR/middleware)
      const sessionCookie = sessionOrRequest.cookies.get('appwrite_session');
      if (!sessionCookie?.value) {
        throw new Error('No session found');
      }
      session = sessionCookie.value;
    }
  }
  
  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setSession(session);
  
  return {
    account: new Account(client),
    databases: new Databases(client),
    storage: new Storage(client),
  };
}
