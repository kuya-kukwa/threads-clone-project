/**
 * Authentication Service
 * Handles user registration, login, logout, and session management
 * Follows SOLID principles: Single Responsibility Pattern
 */
import { registerSchema, loginSchema } from '@/schemas/auth.schema';
import { ID, Models } from 'appwrite';
import { account } from '../appwriteClient';
import { serverDatabases } from '../appwriteServer';
import { APPWRITE_CONFIG } from '../appwriteConfig';
import { AuthResponse, LoginInput, RegisterInput, UserProfile } from '@/types/appwrite';
import { sanitizeInput } from '../utils';
import { ValidationError } from '../errors/ValidationError';
import { parseAppwriteError } from '../errors/errorHandler';
import { createLogger } from '../logger/logger';

export class AuthService {
  private static logger = createLogger({ service: 'AuthService' });

  /**
   * Register a new user
   * Creates both Appwrite Auth user and profile document
   */
  static async register(input: RegisterInput): Promise<AuthResponse> {
    const logger = this.logger.child({ operation: 'register' });
    
    try {
      // Validate with Zod schema
      const validation = registerSchema.safeParse(input);

      if (!validation.success) {
        const validationError = ValidationError.fromZod(validation.error);
        logger.warn('Registration validation failed', { errors: validationError.errors });
        return { success: false, error: validationError.getFirstErrorMessage() };
      }

      // Use validated data (has transforms applied like .toLowerCase())
      const validatedData = validation.data;

      // Sanitize inputs
      const sanitizedUsername = sanitizeInput(validatedData.username, 30);
      const sanitizedDisplayName = sanitizeInput(validatedData.displayName, 50);
      
      logger.debug('Creating new user', { email: validatedData.email, username: sanitizedUsername });
      
      // Create Appwrite Auth user
      const user = await account.create(
        ID.unique(),
        validatedData.email,
        validatedData.password,
        sanitizedDisplayName
      );
      
      logger.info('Auth user created', { userId: user.$id });
      
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
      
      logger.info('User registered successfully', { userId: user.$id, profileId: profile.$id });
      return { success: true, user, profile };
    } catch (error: unknown) {
      const appError = parseAppwriteError(error);
      logger.error('Registration failed', error, { email: input.email });
      
      return { success: false, error: appError.message };
    }
  }
  
  /**
   * Login existing user
   */
  static async login(input: LoginInput): Promise<AuthResponse> {
    const logger = this.logger.child({ operation: 'login' });
    
    try {
      // Validate with Zod schema
      const validation = loginSchema.safeParse(input);

      if (!validation.success) {
        const validationError = ValidationError.fromZod(validation.error);
        logger.warn('Login validation failed', { errors: validationError.errors });
        return { success: false, error: validationError.getFirstErrorMessage() };
      }

      // Use validated data
      const validatedData = validation.data;
      
      logger.debug('Attempting login', { email: validatedData.email });
      
      // Check if there's an existing session and delete it
      try {
        const existingUser = await account.get();
        if (existingUser) {
          logger.debug('Existing session found, deleting before creating new session');
          await account.deleteSession('current');
        }
      } catch (error) {
        // No existing session, this is fine
        logger.debug('No existing session found');
      }
      
      // Create session
      await account.createEmailPasswordSession(validatedData.email, validatedData.password);
      
      // Get current user
      const user = await account.get();
      
      logger.info('User logged in successfully', { userId: user.$id });
      return { success: true, user };
    } catch (error: unknown) {
      const appError = parseAppwriteError(error);
      logger.error('Login failed', error, { email: input.email });
      
      return { success: false, error: appError.message };
    }
  }
  
  /**
   * Logout current user
   */
  static async logout(): Promise<{ success: boolean; error?: string }> {
    const logger = this.logger.child({ operation: 'logout' });
    
    try {
      await account.deleteSession('current');
      logger.info('User logged out successfully');
      return { success: true };
    } catch (error: unknown) {
      const appError = parseAppwriteError(error);
      logger.error('Logout failed', error);
      return { success: false, error: appError.message };
    }
  }
  
  /**
   * Get current authenticated user
   */
  static async getCurrentUser(): Promise<Models.User<Models.Preferences> | null> {
    try {
      const user = await account.get();
      return user;
    } catch (error) {
      // Don't log this as error - unauthenticated state is normal
      return null;
    }
  }
  
  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  }
}
