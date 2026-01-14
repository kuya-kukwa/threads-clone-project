/**
 * Authentication Schemas
 * Zod validation schemas for login and registration
 * 
 * WHY: Centralized validation logic, reusable across client and server
 * SOLID: Single Responsibility - schemas only validate, don't process
 */

import { z } from 'zod';
import { SECURITY_CONFIG } from '@/lib/appwriteConfig';

/**
 * Login Schema
 * Validates email and password for authentication
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  
  password: z
    .string()
    .min(1, 'Password is required')
    .min(SECURITY_CONFIG.MIN_LENGTHS.PASSWORD, `Password must be at least ${SECURITY_CONFIG.MIN_LENGTHS.PASSWORD} characters`),
});

/**
 * Registration Schema
 * Validates all fields required for user registration
 */
export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  
  password: z
    .string()
    .min(SECURITY_CONFIG.MIN_LENGTHS.PASSWORD, `Password must be at least ${SECURITY_CONFIG.MIN_LENGTHS.PASSWORD} characters`)
    .max(128, 'Password is too long'),
  
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
  
  username: z
    .string()
    .min(SECURITY_CONFIG.MIN_LENGTHS.USERNAME, `Username must be at least ${SECURITY_CONFIG.MIN_LENGTHS.USERNAME} characters`)
    .max(SECURITY_CONFIG.MAX_LENGTHS.USERNAME, `Username must not exceed ${SECURITY_CONFIG.MAX_LENGTHS.USERNAME} characters`)
    .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores')
    .transform(val => val.toLowerCase()),
  
  displayName: z
    .string()
    .min(SECURITY_CONFIG.MIN_LENGTHS.DISPLAY_NAME, 'Display name is required')
    .max(SECURITY_CONFIG.MAX_LENGTHS.DISPLAY_NAME, `Display name must not exceed ${SECURITY_CONFIG.MAX_LENGTHS.DISPLAY_NAME} characters`)
    .trim(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

/**
 * TypeScript types inferred from schemas
 * WHY: Type-safe forms without duplicating validation logic
 */
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
