/**
 * Client-side Appwrite client
 * Safe for browser usage (no API keys exposed)
 * Uses public environment variables only
 */

import { Client, Account, Databases, Storage } from 'appwrite';
import { env } from './appwriteConfig';

const client = new Client()
  .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export default client;

/**
 * Clear all Appwrite session data from localStorage
 * Useful when logging out or switching accounts
 */
export function clearAppwriteSession() {
  // Remove cookieFallback which contains the session JWT
  localStorage.removeItem('cookieFallback');
  // Remove legacy auth token if exists
  localStorage.removeItem('auth_token');
  console.log('[Appwrite] Session data cleared from localStorage');
}

/**
 * Get the current session JWT from localStorage
 * @returns JWT token string or null if not found
 */
export function getSessionToken(): string | null {
  try {
    const cookieFallback = localStorage.getItem('cookieFallback');
    if (!cookieFallback) return null;
    
    const sessionData = JSON.parse(cookieFallback);
    // Find any key that starts with "a_session_"
    const sessionKey = Object.keys(sessionData).find(key => key.startsWith('a_session_'));
    
    if (sessionKey && sessionData[sessionKey]) {
      return sessionData[sessionKey];
    }
    return null;
  } catch (error) {
    console.error('[Appwrite] Failed to get session token:', error);
    return null;
  }
}
