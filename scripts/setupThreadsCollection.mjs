/**
 * Appwrite Database Setup Script - Threads Collection
 * Creates the threads collection with proper attributes and indexes
 * 
 * Run: node scripts/setupThreadsCollection.mjs
 */

import { Client, Databases, IndexType } from 'node-appwrite';
import 'dotenv/config';

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||process.env.APPWRITE_DATABASE_ID;

if (!ENDPOINT || !PROJECT_ID || !API_KEY || !DATABASE_ID) {
  console.error('❌ Missing environment variables!');
  console.error('Required: NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, APPWRITE_API_KEY, APPWRITE_DATABASE_ID');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);

const COLLECTION_ID = 'threads';

async function setupThreadsCollection() {
  console.log('🚀 Starting threads collection setup...\n');

  try {
    // Check if collection already exists
    let collectionExists = false;
    try {
      await databases.getCollection(DATABASE_ID, COLLECTION_ID);
      collectionExists = true;
      console.log(`✅ Collection "${COLLECTION_ID}" already exists`);
    } catch (error) {
      if (error.code !== 404) {
        throw error;
      }
    }

    // Create collection if it doesn't exist
    if (!collectionExists) {
      console.log(`📦 Creating collection: ${COLLECTION_ID}...`);
      
      await databases.createCollection(
        DATABASE_ID,
        COLLECTION_ID,
        COLLECTION_ID,
        undefined, // permissions (use database-level)
        true,  // documentSecurity
        true   // enabled
      );

      console.log(`✅ Collection "${COLLECTION_ID}" created!`);
    }

    // Create or update attributes
    console.log('\n📝 Setting up attributes...');

    const attributes = [
      { key: 'authorId', type: 'string', size: 50, required: true },
      { key: 'content', type: 'string', size: 500, required: true },
      { key: 'imageId', type: 'string', size: 100, required: false },
      { key: 'imageUrl', type: 'string', size: 500, required: false },
      { key: 'altText', type: 'string', size: 200, required: false },
      { key: 'parentThreadId', type: 'string', size: 50, required: false },
      { key: 'replyToUsername', type: 'string', size: 50, required: false },
      { key: 'replyCount', type: 'integer', required: true, default: 0 },
      { key: 'likeCount', type: 'integer', required: true, default: 0 },
      { key: 'createdAt', type: 'datetime', required: true },
      { key: 'updatedAt', type: 'datetime', required: true },
    ];

    for (const attr of attributes) {
      try {
        if (attr.type === 'string') {
          await databases.createStringAttribute(
            DATABASE_ID,
            COLLECTION_ID,
            attr.key,
            attr.size,
            attr.required,
            attr.default,
            false // array
          );
          console.log(`  ✅ ${attr.key} (string, ${attr.size})`);
        } else if (attr.type === 'integer') {
          await databases.createIntegerAttribute(
            DATABASE_ID,
            COLLECTION_ID,
            attr.key,
            attr.required,
            undefined, // min
            undefined, // max
            attr.default,
            false // array
          );
          console.log(`  ✅ ${attr.key} (integer)`);
        } else if (attr.type === 'datetime') {
          await databases.createDatetimeAttribute(
            DATABASE_ID,
            COLLECTION_ID,
            attr.key,
            attr.required,
            undefined, // default
            false // array
          );
          console.log(`  ✅ ${attr.key} (datetime)`);
        }

        // Wait a bit between attribute creations
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        if (error.code === 409) {
          console.log(`  ⏭️  ${attr.key} (already exists)`);
        } else {
          console.error(`  ❌ Failed to create ${attr.key}:`, error.message);
        }
      }
    }

    // Create indexes
    console.log('\n📊 Creating indexes...');

    const indexes = [
      { key: 'authorId_idx', type: IndexType.Key, attributes: ['authorId'] },
      { key: 'createdAt_idx', type: IndexType.Key, attributes: ['createdAt'], orders: ['DESC'] },
      { key: 'parentThreadId_idx', type: IndexType.Key, attributes: ['parentThreadId'] },
    ];

    for (const index of indexes) {
      try {
        await databases.createIndex(
          DATABASE_ID,
          COLLECTION_ID,
          index.key,
          index.type,
          index.attributes,
          index.orders
        );
        console.log(`  ✅ ${index.key}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        if (error.code === 409) {
          console.log(`  ⏭️  ${index.key} (already exists)`);
        } else {
          console.error(`  ❌ Failed to create index ${index.key}:`, error.message);
        }
      }
    }

    console.log('\n✅ Threads collection setup completed!');
    console.log('\n💡 Next steps:');
    console.log('   1. Verify collection in Appwrite Console > Databases');
    console.log('   2. Test thread creation from the application');
    console.log('   3. Check that all attributes and indexes are correct');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
    process.exit(1);
  }
}

setupThreadsCollection();
