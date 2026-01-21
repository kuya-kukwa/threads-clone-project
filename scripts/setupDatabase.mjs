/**
 * Appwrite Database Setup Script
 * Run this script to automatically create all required collections
 * 
 * Usage: node scripts/setupDatabase.mjs
 */

import { Client, Databases, Permission, Role } from 'node-appwrite';
import { config } from 'dotenv';

// Load environment variables
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

const COLLECTIONS = {
  users: {
    id: 'users',
    name: 'Users',
    permissions: [
      Permission.read(Role.any()),
      Permission.create(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users()),
    ],
    documentSecurity: true,
    attributes: [
      { key: 'userId', type: 'string', size: 255, required: true },
      { key: 'username', type: 'string', size: 30, required: true },
      { key: 'displayName', type: 'string', size: 50, required: true },
      { key: 'bio', type: 'string', size: 160, required: false, default: '' },
      { key: 'avatarUrl', type: 'string', size: 500, required: false, default: '' },
      { key: 'createdAt', type: 'string', size: 255, required: true },
      { key: 'updatedAt', type: 'string', size: 255, required: true },
    ],
    indexes: [
      { key: 'userId_index', type: 'key', attributes: ['userId'], orders: ['ASC'] },
      { key: 'username_index', type: 'unique', attributes: ['username'], orders: ['ASC'] },
    ],
  },
  threads: {
    id: 'threads',
    name: 'Threads',
    permissions: [
      Permission.read(Role.any()),
      Permission.create(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users()),
    ],
    documentSecurity: true,
    attributes: [
      { key: 'authorId', type: 'string', size: 255, required: true },
      { key: 'content', type: 'string', size: 500, required: true },
      { key: 'imageUrl', type: 'string', size: 500, required: false, default: '' },
      { key: 'parentThreadId', type: 'string', size: 255, required: false, default: '' },
      { key: 'replyCount', type: 'integer', required: false, default: 0 },
      { key: 'likeCount', type: 'integer', required: false, default: 0 },

      { key: 'createdAt', type: 'string', size: 255, required: true },
    ],
    indexes: [
      { key: 'authorId_index', type: 'key', attributes: ['authorId'], orders: ['DESC'] },
      { key: 'createdAt_index', type: 'key', attributes: ['createdAt'], orders: ['DESC'] },
      { key: 'parentThreadId_index', type: 'key', attributes: ['parentThreadId'], orders: ['ASC'] },
    ],
  },
  likes: {
    id: 'likes',
    name: 'Likes',
    permissions: [
      Permission.read(Role.any()),
      Permission.create(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users()),
    ],
    documentSecurity: true,
    attributes: [
      { key: 'userId', type: 'string', size: 255, required: true },
      { key: 'threadId', type: 'string', size: 255, required: true },
      { key: 'createdAt', type: 'string', size: 255, required: true },
    ],
    indexes: [
      { key: 'userId_threadId_index', type: 'unique', attributes: ['userId', 'threadId'], orders: ['ASC', 'ASC'] },
      { key: 'threadId_index', type: 'key', attributes: ['threadId'], orders: ['ASC'] },
    ],
  },
  follows: {
    id: 'follows',
    name: 'Follows',
    permissions: [
      Permission.read(Role.any()),
      Permission.create(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users()),
    ],
    documentSecurity: true,
    attributes: [
      { key: 'followerId', type: 'string', size: 255, required: true },
      { key: 'followingId', type: 'string', size: 255, required: true },
      { key: 'createdAt', type: 'string', size: 255, required: true },
    ],
    indexes: [
      { key: 'follower_following_index', type: 'unique', attributes: ['followerId', 'followingId'], orders: ['ASC', 'ASC'] },
      { key: 'followerId_index', type: 'key', attributes: ['followerId'], orders: ['ASC'] },
      { key: 'followingId_index', type: 'key', attributes: ['followingId'], orders: ['ASC'] },
    ],
  },
};

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createCollection(collectionConfig) {
  const { id, name, permissions, documentSecurity, attributes, indexes } = collectionConfig;
  
  try {
    console.log(`\n📦 Creating collection: ${name} (${id})`);
    
    await databases.createCollection(DATABASE_ID, id, name, permissions, documentSecurity);
    console.log(`   ✓ Collection created`);
    
    for (const attr of attributes) {
      try {
        if (attr.type === 'string') {
          await databases.createStringAttribute(
            DATABASE_ID,
            id,
            attr.key,
            attr.size,
            attr.required,
            attr.default
          );
        } else if (attr.type === 'integer') {
          await databases.createIntegerAttribute(
            DATABASE_ID,
            id,
            attr.key,
            attr.required,
            undefined,
            undefined,
            attr.default
          );
        }
        console.log(`   ✓ Created attribute: ${attr.key}`);
        await wait(500);
      } catch (error) {
        if (error.code === 409) {
          console.log(`   ⚠ Attribute ${attr.key} already exists`);
        } else {
          throw error;
        }
      }
    }
    
    console.log(`   ⏳ Waiting for attributes to be ready...`);
    await wait(3000);
    
    for (const index of indexes) {
      try {
        await databases.createIndex(
          DATABASE_ID,
          id,
          index.key,
          index.type,
          index.attributes,
          index.orders
        );
        console.log(`   ✓ Created index: ${index.key}`);
        await wait(500);
      } catch (error) {
        if (error.code === 409) {
          console.log(`   ⚠ Index ${index.key} already exists`);
        } else {
          throw error;
        }
      }
    }
    
    console.log(`✅ Collection ${name} setup complete!`);
    
  } catch (error) {
    if (error.code === 409) {
      console.log(`⚠ Collection ${name} already exists`);
    } else {
      console.error(`❌ Error creating collection ${name}:`, error.message);
      throw error;
    }
  }
}

async function setupDatabase() {
  console.log('🚀 Starting Appwrite Database Setup...\n');
  console.log(`📊 Database ID: ${DATABASE_ID}`);
  console.log(`🌐 Endpoint: ${ENDPOINT}\n`);
  
  try {
    for (const [, config] of Object.entries(COLLECTIONS)) {
      await createCollection(config);
    }
    
    console.log('\n🎉 Database setup complete!');
    console.log('\n✅ Collections created:');
    console.log('   • users (profiles)');
    console.log('   • threads (posts & replies)');
    console.log('   • likes');
    console.log('   • follows');
    console.log('\n👉 Next: npm run dev');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setupDatabase();
