/**
 * Add Audience Attribute to Threads Collection
 * 
 * Run this script to add the 'audience' string attribute
 * to the existing threads collection. This field controls
 * who can reply to a thread ('anyone' | 'followers' | 'mentioned').
 *
 * Usage: node scripts/addAudienceAttribute.mjs
 */

import { Client, Databases } from 'node-appwrite';
import { config } from 'dotenv';

config();

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

if (!ENDPOINT || !PROJECT_ID || !API_KEY || !DATABASE_ID) {
  console.error('❌ Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, APPWRITE_API_KEY, APPWRITE_DATABASE_ID');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);
const THREADS_COLLECTION = 'threads';

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function addAudienceAttribute() {
  console.log('🚀 Adding audience attribute to threads collection...\n');

  // 1. Add 'audience' attribute
  try {
    await databases.createStringAttribute(
      DATABASE_ID,
      THREADS_COLLECTION,
      'audience',
      20,     // max size (enough for 'anyone', 'followers', 'mentioned')
      false,  // not required
      'anyone' // default value
    );
    console.log('   ✓ Created attribute: audience (string, max 20, default "anyone")');
  } catch (error) {
    if (error.code === 409) {
      console.log('   ⚠ Attribute "audience" already exists');
    } else {
      console.error('   ❌ Error creating audience attribute:', error.message);
    }
  }

  // Wait for attribute to be ready before creating index
  console.log('\n   ⏳ Waiting for attribute to be ready...');
  await wait(5000);

  // 2. Add index on 'audience' for queryability
  try {
    await databases.createIndex(
      DATABASE_ID,
      THREADS_COLLECTION,
      'audience_index',
      'key',
      ['audience'],
      ['ASC']
    );
    console.log('   ✓ Created index: audience_index');
  } catch (error) {
    if (error.code === 409) {
      console.log('   ⚠ Index "audience_index" already exists');
    } else {
      console.error('   ❌ Error creating audience index:', error.message);
    }
  }

  console.log('\n✅ Audience attribute setup complete!');
  console.log('\n📋 Summary:');
  console.log('   • audience attribute (string, max 20 chars, default "anyone")');
  console.log('   • audience_index (key index for equality queries)');
  console.log('\n👉 Now restart your dev server: npm run dev');
}

addAudienceAttribute();
