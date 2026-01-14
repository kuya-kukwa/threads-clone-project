/**
 * Profile Update Schema
 * Zod validation for user profile updates
 */

import { z } from 'zod';
import { SECURITY_CONFIG } from '@/lib/appwriteConfig';

export const profileUpdateSchema = z.object({
  displayName: z
    .string()
    .min(SECURITY_CONFIG.MIN_LENGTHS.DISPLAY_NAME, 'Display name must be at least 1 character')
    .max(SECURITY_CONFIG.MAX_LENGTHS.DISPLAY_NAME, 'Display name must not exceed 50 characters'),
  bio: z
    .string()
    .max(SECURITY_CONFIG.MAX_LENGTHS.BIO, 'Bio must not exceed 160 characters')
    .optional()
    .or(z.literal('')),
  avatarUrl: z
    .string()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal('')),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
