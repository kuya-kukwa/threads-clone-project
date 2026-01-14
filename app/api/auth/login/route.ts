/**
 * Login API Route
 * Handles user login from client components
 */

import { NextRequest, NextResponse } from 'next/server';
import { account } from '@/lib/appwriteClient';
import { loginSchema } from '@/schemas/auth.schema';

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = loginSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    
    const { email, password } = validation.data;
    
    // Create session
    await account.createEmailPasswordSession(email, password);
    
    // Get current user
    const user = await account.get();
    
    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error('Login error:', error);
    
    if (error.code === 401) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Login failed' },
      { status: 500 }
    );
  }
}
