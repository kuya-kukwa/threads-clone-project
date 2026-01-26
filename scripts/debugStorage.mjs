/**
 * Debug file access in the storage bucket
 */

import { Client, Storage } from 'node-appwrite';
import 'dotenv/config';

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const BUCKET_ID = 'thread-images';

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const storage = new Storage(client);

async function debugStorage() {
  try {
    // Test the newest file
    const testFileId = '697755f4002242a36085';
    console.log(`\n🔍 Looking for newest file: ${testFileId}`);
    
    const file = await storage.getFile(BUCKET_ID, testFileId);
    console.log('File details:');
    console.log(JSON.stringify(file, null, 2));
    
    // Generate URLs
    const viewUrl = `${ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${file.$id}/view?project=${PROJECT_ID}`;
    const previewUrl = `${ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${file.$id}/preview?project=${PROJECT_ID}&width=400&height=400`;
    
    console.log('\n📎 URLs:');
    console.log('View URL:', viewUrl);
    console.log('Preview URL:', previewUrl);
    
    // Test file download via SDK
    console.log('\n🧪 Testing file access via SDK...');
    try {
      const fileData = await storage.getFileView(BUCKET_ID, testFileId);
      console.log('✅ File accessible via SDK! Size:', fileData.byteLength, 'bytes');
    } catch (e) {
      console.log('❌ SDK access failed:', e.message);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugStorage();
