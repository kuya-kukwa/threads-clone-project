/**
 * Add Multi-Media Attributes to Threads Collection
 * Run this script to add the new media fields for multi-file support
 * 
 * Usage: node scripts/addMediaAttributes.mjs
 */

import { Client, Databases } from 'node-appwrite';
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

console.log('🔧 Adding multi-media attributes to threads collection...\n');
console.log(`📍 Endpoint: ${ENDPOINT}`);
console.log(`📁 Project: ${PROJECT_ID}`);
console.log(`🗄️  Database: ${DATABASE_ID}\n`);

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);

const THREADS_COLLECTION_ID = 'threads';

// New attributes to add for multi-media support
const newAttributes = [
  { key: 'imageId', type: 'string', size: 255, required: false, default: '' },
  { key: 'altText', type: 'string', size: 200, required: false, default: '' },
  { key: 'updatedAt', type: 'string', size: 255, required: false, default: '' },
  { key: 'mediaIds', type: 'string', size: 2000, required: false, default: '' },
  { key: 'mediaUrls', type: 'string', size: 4000, required: false, default: '' },
  { key: 'mediaTypes', type: 'string', size: 500, required: false, default: '' },
  { key: 'mediaAltTexts', type: 'string', size: 2000, required: false, default: '' },
];

async function addAttribute(attr) {
  try {
    if (attr.type === 'string') {
      await databases.createStringAttribute(
        DATABASE_ID,
        THREADS_COLLECTION_ID,
        attr.key,
        attr.size,
        attr.required,
        attr.default,
        false // array
      );
      console.log(`✅ Added attribute: ${attr.key} (string, size: ${attr.size})`);
    } else if (attr.type === 'integer') {
      await databases.createIntegerAttribute(
        DATABASE_ID,
        THREADS_COLLECTION_ID,
        attr.key,
        attr.required,
        attr.default,
        null, // min
        null, // max
        false // array
      );
      console.log(`✅ Added attribute: ${attr.key} (integer)`);
    }
    return true;
  } catch (error) {
    if (error.code === 409 || error.message?.includes('already exists')) {
      console.log(`⏭️  Attribute ${attr.key} already exists, skipping`);
      return true;
    }
    console.error(`❌ Failed to add attribute ${attr.key}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('📝 Adding new attributes...\n');

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const attr of newAttributes) {
    const result = await addAttribute(attr);
    if (result) {
      successCount++;
    } else {
      failCount++;
    }
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);

  if (failCount === 0) {
    console.log('\n🎉 All attributes added successfully!');
    console.log('\n💡 Note: Attributes may take a few seconds to become available.');
    console.log('   You can verify them in Appwrite Console > Database > threads collection.');
  } else {
    console.log('\n⚠️  Some attributes failed to add. Check the errors above.');
  }
}

main().catch(console.error);
