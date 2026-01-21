/**
 * Appwrite Storage Setup Script
 * Creates storage buckets for thread images
 * 
 * Run: node scripts/setupStorage.mjs
 */

import { Client, Storage, Permission, Role } from 'node-appwrite';
import 'dotenv/config';

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
  console.error('❌ Missing environment variables!');
  console.error('Required: NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, APPWRITE_API_KEY');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const storage = new Storage(client);

const BUCKET_ID = 'thread-images';

async function setupStorage() {
  console.log('🚀 Starting Appwrite Storage setup...\n');

  try {
    // Check if bucket already exists
    let bucketExists = false;
    try {
      await storage.getBucket(BUCKET_ID);
      bucketExists = true;
      console.log(`✅ Bucket "${BUCKET_ID}" already exists`);
    } catch (error) {
      if (error.code !== 404) {
        throw error;
      }
    }

    // Create bucket if it doesn't exist
    if (!bucketExists) {
      console.log(`📦 Creating bucket: ${BUCKET_ID}...`);
      
      await storage.createBucket(
        BUCKET_ID,
        BUCKET_ID,
        [
          // Allow authenticated users to create files
          Permission.create(Role.users()),
          // Allow anyone to read files (public feed)
          Permission.read(Role.any()),
          // Only file owner can update/delete
          Permission.update(Role.users()),
          Permission.delete(Role.users()),
        ],
        false, // fileSecurity - false means bucket-level permissions
        true,  // enabled
        5 * 1024 * 1024, // 5MB max file size
        ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], // allowed file types
        'none', // compression - none for now, can enable if needed
        true,   // encryption
        false   // antivirus - enable in production if available
      );

      console.log(`✅ Bucket "${BUCKET_ID}" created successfully!`);
    }

    // Print bucket configuration
    console.log('\n📋 Bucket Configuration:');
    const bucket = await storage.getBucket(BUCKET_ID);
    console.log(`   ID: ${bucket.$id}`);
    console.log(`   Name: ${bucket.name}`);
    console.log(`   Max File Size: ${bucket.maximumFileSize / (1024 * 1024)}MB`);
    console.log(`   Allowed Types: ${bucket.allowedFileExtensions.join(', ')}`);
    console.log(`   Enabled: ${bucket.enabled}`);
    console.log(`   Encryption: ${bucket.encryption}`);

    console.log('\n✅ Storage setup completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Verify bucket in Appwrite Console > Storage');
    console.log('   2. Test image upload from the application');
    console.log('   3. Check file permissions are working correctly');

  } catch (error) {
    console.error('\n❌ Storage setup failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
    process.exit(1);
  }
}

setupStorage();
