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
