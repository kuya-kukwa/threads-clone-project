/**
 * Login API Route
 * This route is DEPRECATED for actual login - login should happen client-side
 * This endpoint now validates credentials and returns user info
 * Actual session creation happens client-side via Appwrite SDK
 */

import { NextRequest, NextResponse } from 'next/server';
import { Client, Users } from 'node-appwrite';
import { loginSchema } from '@/schemas/auth.schema';
import { rateLimit, RateLimitType } from '@/lib/middleware/rateLimit';
import { getErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger/logger';

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const API_KEY = process.env.APPWRITE_API_KEY!;

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (5 requests per minute for auth)
    const rateLimitResult = await rateLimit(RateLimitType.AUTH)(request);
    if (rateLimitResult) {
      return rateLimitResult;
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
    
    logger.info({ msg: 'Login validation attempt', email });
    
    // Create admin client with API key to verify user exists
    const adminClient = new Client()
      .setEndpoint(ENDPOINT)
      .setProject(PROJECT_ID)
      .setKey(API_KEY);
    
    const users = new Users(adminClient);
    
    // Check if user exists
    try {
      const usersList = await users.list([`equal("email", ["${email}"])`]);
      
      if (usersList.total === 0) {
        logger.warn({ msg: 'User not found', email });
        return NextResponse.json(
          { success: false, error: 'Invalid email or password' },
          { status: 401 }
        );
      }
      
      // User exists - client should proceed with Appwrite SDK login
      // We return success to indicate credentials format is valid
      // Actual authentication happens client-side
      logger.info({ msg: 'User found, proceed with client login', email });
      
      return NextResponse.json({ 
        success: true, 
        message: 'Proceed with client-side authentication',
        shouldLoginClientSide: true,
      });
    } catch (queryError) {
      logger.error({ msg: 'User query failed', error: getErrorMessage(queryError) });
      return NextResponse.json(
        { success: false, error: 'Login failed. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    logger.warn({ msg: 'Login failed', error: getErrorMessage(error) });
    
    return NextResponse.json(
      { success: false, error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}

