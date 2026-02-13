/**
 * Add Topic & Location Attributes to Threads Collection
 * 
 * Run this script to add the 'topic' and 'location' string attributes
 * and corresponding indexes to the existing threads collection.
 *
 * Usage: node scripts/addTopicLocationAttributes.mjs
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

async function addTopicLocationAttributes() {
  console.log('🚀 Adding topic & location attributes to threads collection...\n');

  // 1. Add 'topic' attribute
  try {
    await databases.createStringAttribute(
      DATABASE_ID,
      THREADS_COLLECTION,
      'topic',
      50,     // max size
      false,  // not required
      ''      // default empty
    );
    console.log('   ✓ Created attribute: topic (string, max 50)');
  } catch (error) {
    if (error.code === 409) {
      console.log('   ⚠ Attribute "topic" already exists');
    } else {
      console.error('   ❌ Error creating topic attribute:', error.message);
    }
  }

  await wait(500);

  // 2. Add 'location' attribute
  try {
    await databases.createStringAttribute(
      DATABASE_ID,
      THREADS_COLLECTION,
      'location',
      100,    // max size
      false,  // not required
      ''      // default empty
    );
    console.log('   ✓ Created attribute: location (string, max 100)');
  } catch (error) {
    if (error.code === 409) {
      console.log('   ⚠ Attribute "location" already exists');
    } else {
      console.error('   ❌ Error creating location attribute:', error.message);
    }
  }

  // Wait for attributes to be ready before creating indexes
  console.log('\n   ⏳ Waiting for attributes to be ready...');
  await wait(5000);

  // 3. Add index on 'topic' for queryability
  try {
    await databases.createIndex(
      DATABASE_ID,
      THREADS_COLLECTION,
      'topic_index',
      'key',
      ['topic'],
      ['ASC']
    );
    console.log('   ✓ Created index: topic_index');
  } catch (error) {
    if (error.code === 409) {
      console.log('   ⚠ Index "topic_index" already exists');
    } else {
      console.error('   ❌ Error creating topic index:', error.message);
    }
  }

  await wait(500);

  // 4. Add index on 'location' for queryability
  try {
    await databases.createIndex(
      DATABASE_ID,
      THREADS_COLLECTION,
      'location_index',
      'key',
      ['location'],
      ['ASC']
    );
    console.log('   ✓ Created index: location_index');
  } catch (error) {
    if (error.code === 409) {
      console.log('   ⚠ Index "location_index" already exists');
    } else {
      console.error('   ❌ Error creating location index:', error.message);
    }
  }

  await wait(500);

  // 5. Add fulltext index on 'topic' for search queries (contains)
  try {
    await databases.createIndex(
      DATABASE_ID,
      THREADS_COLLECTION,
      'topic_fulltext',
      'fulltext',
      ['topic'],
      ['ASC']
    );
    console.log('   ✓ Created fulltext index: topic_fulltext');
  } catch (error) {
    if (error.code === 409) {
      console.log('   ⚠ Index "topic_fulltext" already exists');
    } else {
      console.error('   ❌ Error creating topic fulltext index:', error.message);
    }
  }

  await wait(500);

  // 6. Add fulltext index on 'location' for search queries (contains)
  try {
    await databases.createIndex(
      DATABASE_ID,
      THREADS_COLLECTION,
      'location_fulltext',
      'fulltext',
      ['location'],
      ['ASC']
    );
    console.log('   ✓ Created fulltext index: location_fulltext');
  } catch (error) {
    if (error.code === 409) {
      console.log('   ⚠ Index "location_fulltext" already exists');
    } else {
      console.error('   ❌ Error creating location fulltext index:', error.message);
    }
  }

  console.log('\n✅ Topic & location setup complete!');
  console.log('\n📋 Summary:');
  console.log('   • topic attribute (string, max 50 chars)');
  console.log('   • location attribute (string, max 100 chars)');
  console.log('   • topic_index (key index for equality queries)');
  console.log('   • location_index (key index for equality queries)');
  console.log('   • topic_fulltext (fulltext index for contains queries)');
  console.log('   • location_fulltext (fulltext index for contains queries)');
  console.log('\n👉 Now restart your dev server: npm run dev');
}

addTopicLocationAttributes();
