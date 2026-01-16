/**
 * Login API Route
 * Handles user login from client components
 * Protected by rate limiting (5 attempts per minute)
 */

import { NextRequest, NextResponse } from 'next/server';
import { account } from '@/lib/appwriteClient';
import { loginSchema } from '@/schemas/auth.schema';
import { rateLimit, RateLimitType } from '@/lib/middleware/rateLimit';
import { getErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger/logger';

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (5 requests per minute for auth)
    const rateLimitResult = await rateLimit(RateLimitType.AUTH)(request);
    if (rateLimitResult) {
      return rateLimitResult; // Return rate limit error response
    }

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
    
    logger.info({ msg: 'Login attempt', email });
    
    // Create session
    await account.createEmailPasswordSession(email, password);
    
    // Get current user
    const user = await account.get();
    
    logger.info({ msg: 'Login successful', userId: user.$id });
    return NextResponse.json({ success: true, user });
  } catch (error: unknown) {
    logger.warn({ msg: 'Login failed', error: getErrorMessage(error) });
    
    const errorMessage = getErrorMessage(error);
    
    if (errorMessage.includes('401') || errorMessage.toLowerCase().includes('invalid')) {
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
