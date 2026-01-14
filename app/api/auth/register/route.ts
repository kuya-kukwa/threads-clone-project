/**
 * Registration API Route
 * Handles user registration from client components
 */

import { NextRequest, NextResponse } from 'next/server';
import { ID } from 'node-appwrite';
import { serverDatabases, serverUsers } from '@/lib/appwriteServer';
import { APPWRITE_CONFIG } from '@/lib/appwriteConfig';
import { registerSchema } from '@/schemas/auth.schema';
import { UserProfile } from '@/types/appwrite';

/**
 * Sanitize user input (prevent XSS)
 */
function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .slice(0, 500); // Hard limit on input length
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = registerSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    
    const { email, password, username, displayName } = validation.data;
    
    // Sanitize inputs
    const sanitizedUsername = sanitizeInput(username.toLowerCase());
    const sanitizedDisplayName = sanitizeInput(displayName);
    
    console.log('Creating Appwrite Auth user with server SDK...');
    
    // Create Appwrite Auth user using server Users API
    const user = await serverUsers.create(
      ID.unique(),
      email,
      undefined, // phone (optional)
      password,
      sanitizedDisplayName
    );
    
    console.log('Auth user created:', user.$id);
    console.log('Creating profile document in database...');
    
    // Create user profile document
    const profile = await serverDatabases.createDocument<UserProfile>(
      APPWRITE_CONFIG.DATABASE_ID,
      APPWRITE_CONFIG.COLLECTIONS.USERS,
      ID.unique(),
      {
        userId: user.$id,
        username: sanitizedUsername,
        displayName: sanitizedDisplayName,
        bio: '',
        avatarUrl: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );
    
    console.log('Profile document created:', profile.$id);
    
    return NextResponse.json({ success: true, user, profile });
  } catch (error: any) {
    console.error('Registration error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      type: error.type,
      response: error.response,
    });
    
    // Parse Appwrite error messages
    if (error.code === 409) {
      return NextResponse.json(
        { success: false, error: 'Email or username already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Registration failed' },
      { status: 500 }
    );
  }
}
