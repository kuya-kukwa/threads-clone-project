/**
 * Add replyToUsername attribute to threads collection
 * 
 * Run: node scripts/addReplyToUsernameAttribute.mjs
 */

import { Client, Databases } from 'node-appwrite';
import 'dotenv/config';

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID;

if (!ENDPOINT || !PROJECT_ID || !API_KEY || !DATABASE_ID) {
  console.error('❌ Missing environment variables!');
  console.error('Required: NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, APPWRITE_API_KEY, DATABASE_ID');
  process.exit(1);
}

console.log('📋 Configuration:');
console.log(`   Endpoint: ${ENDPOINT}`);
console.log(`   Project ID: ${PROJECT_ID}`);
console.log(`   Database ID: ${DATABASE_ID}`);
console.log('');

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);

const COLLECTION_ID = 'threads';
const ATTRIBUTE_KEY = 'replyToUsername';

async function addAttribute() {
  console.log('🚀 Adding replyToUsername attribute to threads collection...\n');

  try {
    // Check if attribute already exists
    console.log('🔍 Checking if attribute already exists...');
    
    const collection = await databases.getCollection(DATABASE_ID, COLLECTION_ID);
    const existingAttribute = collection.attributes.find(
      (attr) => attr.key === ATTRIBUTE_KEY
    );

    if (existingAttribute) {
      console.log(`✅ Attribute "${ATTRIBUTE_KEY}" already exists!`);
      console.log(`   Type: ${existingAttribute.type}`);
      console.log(`   Size: ${existingAttribute.size || 'N/A'}`);
      console.log(`   Required: ${existingAttribute.required}`);
      return;
    }

    // Create the attribute
    console.log(`📝 Creating attribute "${ATTRIBUTE_KEY}"...`);
    
    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      ATTRIBUTE_KEY,
      50,      // size
      false,   // required
      '',      // default value (empty string)
      false    // array
    );

    console.log(`✅ Attribute "${ATTRIBUTE_KEY}" created successfully!`);
    console.log('');
    console.log('⏳ Note: Appwrite may take a few seconds to fully index the new attribute.');
    console.log('   You can check the status in the Appwrite Console.');

  } catch (error) {
    if (error.code === 409) {
      console.log(`✅ Attribute "${ATTRIBUTE_KEY}" already exists (conflict detected).`);
    } else {
      console.error('❌ Error adding attribute:', error.message);
      console.error('   Code:', error.code);
      process.exit(1);
    }
  }
}

addAttribute();
