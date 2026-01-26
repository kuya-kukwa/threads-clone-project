/**
 * Setup Avatars Storage Bucket
 * Creates the avatars bucket in Appwrite Storage
 * 
 * Run: node scripts/setupAvatarsBucket.mjs
 */

import { Client, Storage, Permission, Role } from 'node-appwrite';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const storage = new Storage(client);

const BUCKET_ID = 'avatars';
const BUCKET_NAME = 'User Avatars';

// Avatar-specific limits (2MB, common image types)
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

async function setupAvatarsBucket() {
  console.log('🚀 Setting up avatars bucket...\n');

  try {
    // Check if bucket exists
    try {
      const existingBucket = await storage.getBucket(BUCKET_ID);
      console.log(`✅ Bucket already exists: ${existingBucket.name} (${existingBucket.$id})`);
      console.log(`   Max file size: ${existingBucket.maximumFileSize / 1024 / 1024}MB`);
      console.log(`   Allowed extensions: ${existingBucket.allowedFileExtensions.join(', ')}`);
      return;
    } catch {
      // Bucket doesn't exist, create it
      console.log('📦 Creating avatars bucket...');
    }

    // Create the bucket with proper permissions
    const bucket = await storage.createBucket(
      BUCKET_ID,
      BUCKET_NAME,
      [
        // Authenticated users can read any avatar (for viewing profiles)
        Permission.read(Role.users()),
        // Users can only manage their own avatars (handled in API)
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ],
      false, // fileSecurity - false means bucket-level permissions apply
      true, // enabled
      MAX_FILE_SIZE,
      ALLOWED_EXTENSIONS
    );

    console.log(`✅ Bucket created successfully!`);
    console.log(`   ID: ${bucket.$id}`);
    console.log(`   Name: ${bucket.name}`);
    console.log(`   Max file size: ${bucket.maximumFileSize / 1024 / 1024}MB`);
    console.log(`   Allowed extensions: ${bucket.allowedFileExtensions.join(', ')}`);
    console.log('\n🎉 Avatars bucket setup complete!');

  } catch (error) {
    console.error('❌ Failed to setup avatars bucket:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    process.exit(1);
  }
}

setupAvatarsBucket();
