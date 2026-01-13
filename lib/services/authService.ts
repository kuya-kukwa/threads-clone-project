/**
 * Authentication Service
 * Handles user registration, login, logout, and session management
 * Follows SOLID principles: Single Responsibility Pattern
 */

import { ID, Models } from 'appwrite';
import { account } from '../appwriteClient';
import { serverDatabases } from '../appwriteServer';
import { APPWRITE_CONFIG, SECURITY_CONFIG } from '../appwriteConfig';
import { AuthResponse, LoginInput, RegisterInput, UserProfile } from '@/types/appwrite';

/**
 * Input validation helper
 */
function validateInput(input: { [key: string]: string }, rules: { [key: string]: { min?: number; max?: number; pattern?: RegExp } }) {
  const errors: string[] = [];
  
  Object.entries(rules).forEach(([field, rule]) => {
    const value = input[field];
    
    if (!value || value.trim().length === 0) {
      errors.push(`${field} is required`);
      return;
    }
    
    if (rule.min && value.length < rule.min) {
      errors.push(`${field} must be at least ${rule.min} characters`);
    }
    
    if (rule.max && value.length > rule.max) {
      errors.push(`${field} must not exceed ${rule.max} characters`);
    }
    
    if (rule.pattern && !rule.pattern.test(value)) {
      errors.push(`${field} format is invalid`);
    }
  });
  
  return errors;
}

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
      // Validate input
      const errors = validateInput(input, {
        email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        password: { min: SECURITY_CONFIG.MIN_LENGTHS.PASSWORD },
        username: { 
          min: SECURITY_CONFIG.MIN_LENGTHS.USERNAME,
          max: SECURITY_CONFIG.MAX_LENGTHS.USERNAME,
          pattern: /^[a-z0-9_]+$/,
        },
        displayName: {
          min: SECURITY_CONFIG.MIN_LENGTHS.DISPLAY_NAME,
          max: SECURITY_CONFIG.MAX_LENGTHS.DISPLAY_NAME,
        },
      });
      
      if (errors.length > 0) {
        return { success: false, error: errors.join(', ') };
      }
      
      // Sanitize inputs
      const sanitizedUsername = sanitizeInput(input.username.toLowerCase());
      const sanitizedDisplayName = sanitizeInput(input.displayName);
      
      // Create Appwrite Auth user
      const user = await account.create(
        ID.unique(),
        input.email,
        input.password,
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
      
      // Auto-login after registration
      await account.createEmailPasswordSession(input.email, input.password);
      
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
      // Validate input
      const errors = validateInput(input, {
        email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        password: { min: 1 },
      });
      
      if (errors.length > 0) {
        return { success: false, error: errors.join(', ') };
      }
      
      // Create session
      await account.createEmailPasswordSession(input.email, input.password);
      
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
