/**
 * Server-side Appwrite client
 * Uses API key for admin operations (user creation, database writes, etc.)
 * NEVER import this in client-side code (use lib/appwriteClient.ts instead)
 */

import { Client, Account, Databases, Storage, Users } from 'node-appwrite';
import { env } from './appwriteConfig';

/**
 * Server client with full admin privileges
 * Used for server actions and API routes
 */
export const serverClient = new Client()
  .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY); // Admin API key for server operations

export const serverAccount = new Account(serverClient);
export const serverDatabases = new Databases(serverClient);
export const serverStorage = new Storage(serverClient);
export const serverUsers = new Users(serverClient);

/**
 * Helper to create a session-specific client for server actions
 * This respects user permissions and session context
 */
export function createSessionClient(session: string) {
  const client = new Client()
    .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
    .setSession(session);
  
  return {
    account: new Account(client),
    databases: new Databases(client),
    storage: new Storage(client),
  };
}
