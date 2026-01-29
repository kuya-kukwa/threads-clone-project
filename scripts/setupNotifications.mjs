/**
 * Setup Notifications Collection Script
 * 
 * Creates the notifications collection with all required attributes and indexes.
 * Safe to run multiple times - will skip existing items.
 * 
 * Usage: node scripts/setupNotifications.mjs
 */

import { Client, Databases, Permission, Role } from 'node-appwrite';
import 'dotenv/config';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setup() {
  console.log('\n🔔 Setting up Notifications Collection...\n');
  console.log(`📊 Database ID: ${DATABASE_ID}`);
  console.log(`🌐 Endpoint: ${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}\n`);

  if (!DATABASE_ID) {
    console.error('❌ APPWRITE_DATABASE_ID is not set in .env');
    process.exit(1);
  }

  // Step 1: Create collection
  try {
    await databases.createCollection(
      DATABASE_ID,
      'notifications',
      'Notifications',
      [
        Permission.read(Role.users()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ],
      true // documentSecurity enabled
    );
    console.log('✓ Collection created');
  } catch (error) {
    if (error.code === 409) {
      console.log('⚠ Collection already exists');
    } else {
      console.error('❌ Failed to create collection:', error.message);
      throw error;
    }
  }

  // Step 2: Create attributes
  const attributes = [
    { key: 'recipientId', type: 'string', size: 255, required: true },
    { key: 'actorId', type: 'string', size: 255, required: true },
    { key: 'type', type: 'string', size: 50, required: true },
    { key: 'threadId', type: 'string', size: 255, required: false, default: '' },
    { key: 'message', type: 'string', size: 500, required: false, default: '' },
    { key: 'read', type: 'boolean', required: false, default: false },
    { key: 'createdAt', type: 'string', size: 255, required: true },
  ];

  console.log('\n📝 Creating attributes...');
  
  for (const attr of attributes) {
    try {
      if (attr.type === 'string') {
        await databases.createStringAttribute(
          DATABASE_ID,
          'notifications',
          attr.key,
          attr.size,
          attr.required,
          attr.default
        );
      } else if (attr.type === 'boolean') {
        await databases.createBooleanAttribute(
          DATABASE_ID,
          'notifications',
          attr.key,
          attr.required,
          attr.default
        );
      }
      console.log(`   ✓ Created: ${attr.key}`);
      await wait(500);
    } catch (error) {
      if (error.code === 409) {
        console.log(`   ⚠ Exists: ${attr.key}`);
      } else {
        console.log(`   ✗ Error creating ${attr.key}:`, error.message);
      }
    }
  }

  // Step 3: Wait for attributes to be available
  console.log('\n⏳ Waiting for attributes to be ready...');
  await wait(5000);

  // Step 4: Create indexes
  const indexes = [
    { 
      key: 'recipientId_createdAt_index', 
      attributes: ['recipientId', 'createdAt'], 
      orders: ['ASC', 'DESC'] 
    },
    { 
      key: 'recipientId_read_index', 
      attributes: ['recipientId', 'read'], 
      orders: ['ASC', 'ASC'] 
    },
  ];

  console.log('\n📇 Creating indexes...');
  
  for (const index of indexes) {
    try {
      await databases.createIndex(
        DATABASE_ID,
        'notifications',
        index.key,
        'key',
        index.attributes,
        index.orders
      );
      console.log(`   ✓ Created: ${index.key}`);
      await wait(500);
    } catch (error) {
      if (error.code === 409) {
        console.log(`   ⚠ Exists: ${index.key}`);
      } else {
        console.log(`   ✗ Error creating ${index.key}:`, error.message);
      }
    }
  }

  console.log('\n🎉 Notifications collection setup complete!\n');
}

setup().catch(error => {
  console.error('\n❌ Setup failed:', error.message);
  process.exit(1);
});
