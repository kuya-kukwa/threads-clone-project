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


/**
 * Sanitize user input (prevent XSS)
 */
function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .slice(0, 500); // Hard limit on input length
}

export class AuthService {
  /**
   * Register a new user
   * Creates both Appwrite Auth user and profile document
   */
  static async register(input: RegisterInput): Promise<AuthResponse> {
    try {
      // Validate with Zod schema
      const validation = registerSchema.safeParse(input);

      if (!validation.success) {
        // Extract first error message from Zod
        const firstError = validation.error.issues[0].message;
        return { success: false, error: firstError };
      }

      // Use validated data (has transforms applied like .toLowerCase())
      const validatedData = validation.data;

      // Sanitize inputs
      const sanitizedUsername = sanitizeInput(validatedData.username);
      const sanitizedDisplayName = sanitizeInput(validatedData.displayName);
      
      // Create Appwrite Auth user
      const user = await account.create(
        ID.unique(),
        validatedData.email,
        validatedData.password,
        sanitizedDisplayName
      );
      
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
      
      return { success: true, user, profile };
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Parse Appwrite error messages
      if (error.code === 409) {
        return { success: false, error: 'Email or username already exists' };
      }
      
      return { success: false, error: error.message || 'Registration failed' };
    }
  }
  
  /**
   * Login existing user
   */
  static async login(input: LoginInput): Promise<AuthResponse> {
    try {
      // Validate with Zod schema
      const validation = loginSchema.safeParse(input);

      if (!validation.success) {
        const firstError = validation.error.issues[0].message;
        return { success: false, error: firstError };
      }

      // Use validated data
      const validatedData = validation.data;
      
      // Create session
      await account.createEmailPasswordSession(validatedData.email, validatedData.password);
      
      // Get current user
      const user = await account.get();
      
      return { success: true, user };
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.code === 401) {
        return { success: false, error: 'Invalid email or password' };
      }
      
      return { success: false, error: error.message || 'Login failed' };
    }
  }
  
  /**
   * Logout current user
   */
  static async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      await account.deleteSession('current');
      return { success: true };
    } catch (error: any) {
      console.error('Logout error:', error);
      return { success: false, error: error.message || 'Logout failed' };
    }
  }
  
  /**
   * Get current authenticated user
   */
  static async getCurrentUser(): Promise<Models.User<Models.Preferences> | null> {
    try {
      return await account.get();
    } catch (error) {
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
