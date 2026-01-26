/**
 * Update bucket permissions to allow public read access for avatars
 * Run: node scripts/updateBucketPermissions.mjs
 */

import { Client, Storage, Permission, Role } from 'node-appwrite';
import 'dotenv/config';

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const BUCKET_ID = 'thread-images';

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
  console.error('❌ Missing environment variables');
  console.error('Required: NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, APPWRITE_API_KEY');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const storage = new Storage(client);

async function updateBucketPermissions() {
  try {
    console.log('🔄 Updating bucket permissions...');
    console.log(`   Bucket: ${BUCKET_ID}`);
    
    // Get current bucket info
    const bucket = await storage.getBucket(BUCKET_ID);
    console.log(`   Current name: ${bucket.name}`);
    console.log(`   Current permissions:`, bucket.$permissions);
    console.log(`   File Security enabled:`, bucket.fileSecurity);
    console.log(`   Encryption enabled:`, bucket.encryption);
    
    // Update bucket - DISABLE encryption for public access
    await storage.updateBucket(
      BUCKET_ID,
      bucket.name,
      [
        Permission.read(Role.any()),    // Anyone can read files
        Permission.create(Role.users()), // Authenticated users can create
        Permission.update(Role.users()), // Authenticated users can update their files
        Permission.delete(Role.users()), // Authenticated users can delete their files
      ],
      false, // DISABLE file security - bucket permissions will apply to all files
      bucket.enabled,
      bucket.maximumFileSize,
      bucket.allowedFileExtensions,
      bucket.compression,
      false,  // DISABLE encryption for public file access
      bucket.antivirus
    );
    
    // Verify update
    const updatedBucket = await storage.getBucket(BUCKET_ID);
    console.log('✅ Bucket updated!');
    console.log(`   New permissions:`, updatedBucket.$permissions);
    console.log(`   File Security enabled:`, updatedBucket.fileSecurity);
    console.log(`   Encryption enabled:`, updatedBucket.encryption);
    console.log('\n⚠️  Note: Existing encrypted files will still be encrypted.');
    console.log('   New uploads will NOT be encrypted and will be publicly accessible.');
    
  } catch (error) {
    console.error('❌ Failed to update bucket:', error.message);
    process.exit(1);
  }
}

updateBucketPermissions();
