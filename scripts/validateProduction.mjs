#!/usr/bin/env node

/**
 * Production Environment Validation Script
 * Validates Appwrite configuration and connectivity
 * Run this before deploying to production
 */

import { Client, Account } from 'appwrite';

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_APPWRITE_ENDPOINT',
  'NEXT_PUBLIC_APPWRITE_PROJECT_ID',
  'APPWRITE_API_KEY',
  'APPWRITE_DATABASE_ID',
];

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} success
 * @property {string[]} errors
 * @property {string[]} warnings
 * @property {Record<string, unknown>} info
 */

/**
 * @returns {Promise<ValidationResult>}
 */
async function validateEnvironment() {
  const result = {
    success: true,
    errors: [],
    warnings: [],
    info: {},
  };

  console.log('🔍 Validating production environment...\n');

  // Check required environment variables
  console.log('1. Checking environment variables...');
  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar];
    if (!value) {
      result.errors.push(`Missing required environment variable: ${envVar}`);
      result.success = false;
    } else {
      result.info[envVar] = envVar.includes('KEY') ? '***HIDDEN***' : value;
      console.log(`   ✓ ${envVar}: ${envVar.includes('KEY') ? '***HIDDEN***' : value}`);
    }
  }

  if (result.errors.length > 0) {
    return result;
  }

  // Validate Appwrite endpoint format
  console.log('\n2. Validating Appwrite endpoint...');
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  try {
    const url = new URL(endpoint);
    if (!url.protocol.startsWith('http')) {
      result.errors.push('Appwrite endpoint must use HTTP or HTTPS protocol');
      result.success = false;
    } else {
      console.log(`   ✓ Endpoint format valid: ${endpoint}`);
    }
  } catch {
    result.errors.push(`Invalid Appwrite endpoint URL: ${endpoint}`);
    result.success = false;
  }

  // Test Appwrite connectivity
  console.log('\n3. Testing Appwrite connectivity...');
  try {
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const account = new Account(client);
    
    // Test connection by trying to get current session (will fail but shows connectivity)
    try {
      await account.get();
    } catch (error) {
      // Expected to fail without session, but if it's a 401, connectivity is working
      if (error.code === 401) {
        console.log('   ✓ Appwrite connectivity confirmed (401 expected without session)');
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.log(`   ✗ Appwrite connectivity failed: ${error.message}`);
    result.errors.push(`Cannot connect to Appwrite: ${error.message}`);
    result.success = false;
  }

  // Check project ID format
  console.log('\n4. Validating project configuration...');
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  if (projectId.length < 20) {
    result.warnings.push('Project ID seems short - make sure it\'s correct');
  } else {
    console.log('   ✓ Project ID format looks correct');
  }

  // Check database ID
  const databaseId = process.env.APPWRITE_DATABASE_ID;
  if (databaseId.length < 20) {
    result.warnings.push('Database ID seems short - make sure it\'s correct');
  } else {
    console.log('   ✓ Database ID format looks correct');
  }

  return result;
}

// Main execution
async function main() {
  const result = await validateEnvironment();

  console.log('\n📊 Validation Results:');
  console.log('========================');

  if (result.success) {
    console.log('✅ All validations passed!');
    
    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(warning => console.log(`   • ${warning}`));
    }
    
    console.log('\n✅ Environment is ready for production deployment.');
    process.exit(0);
  } else {
    console.log('❌ Validation failed!');
    
    console.log('\n🚨 Errors:');
    result.errors.forEach(error => console.log(`   • ${error}`));
    
    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(warning => console.log(`   • ${warning}`));
    }
    
    console.log('\n❌ Please fix the errors above before deploying to production.');
    process.exit(1);
  }
}

// Only run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Validation script failed:', error);
    process.exit(1);
  });
}

export { validateEnvironment };