/**
 * Client-side Appwrite client
 * Safe for browser usage (no API keys exposed)
 * Uses public environment variables only
 */

import { Client, Account, Databases, Storage } from 'appwrite';
import { env } from './appwriteConfig';
import { logger } from './logger/logger';

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
  logger.debug({ msg: 'Session data cleared from localStorage' });
}

/**
 * Get the current session JWT from localStorage
 * @returns JWT token string or null if not found
 * 
 * Cross-device notes:
 * - Appwrite stores session in 'cookieFallback' localStorage key
 * - Session key format: a_session_<projectId>
 */
export function getSessionToken(): string | null {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      logger.warn({ msg: 'getSessionToken called on server' });
      return null;
    }
    
    const cookieFallback = localStorage.getItem('cookieFallback');
    if (!cookieFallback) {
      logger.debug({ msg: 'No cookieFallback in localStorage' });
      return null;
    }
    
    const sessionData = JSON.parse(cookieFallback);
    // Find any key that starts with "a_session_"
    const sessionKey = Object.keys(sessionData).find(key => key.startsWith('a_session_'));
    
    if (sessionKey && sessionData[sessionKey]) {
      logger.debug({ msg: 'Session token found', sessionKey });
      return sessionData[sessionKey];
    }
    
    logger.debug({ msg: 'No session key found in cookieFallback', keys: Object.keys(sessionData) });
    return null;
  } catch (error) {
    logger.error({ msg: 'Failed to get session token', error });
    return null;
  }
}

/**
 * Debug session state in production
 * Logs current session info to help troubleshoot auth issues
 */
export function debugSessionState(): void {
  if (typeof window === 'undefined') return;
  
  logger.debug({
    msg: 'Session state debug',
    hasCookieFallback: !!localStorage.getItem('cookieFallback'),
    cookieKeys: (() => {
      try {
        const fallback = localStorage.getItem('cookieFallback');
        return fallback ? Object.keys(JSON.parse(fallback)) : [];
      } catch {
        return [];
      }
    })(),
    sessionToken: getSessionToken()?.substring(0, 20) + '...',
    endpoint: env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    projectId: env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
  });
}
