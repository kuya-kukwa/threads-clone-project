/**
 * Feature Flags Configuration
 * Enables/disables features without code changes
 * 
 * Usage:
 * import { featureFlags } from '@/lib/config/features';
 * if (featureFlags.enableNewEditor) { ... }
 */

/**
 * Environment-based feature flags
 */
export const featureFlags = {
  /**
   * Enable new thread editor with rich text
   */
  enableNewEditor: process.env.NEXT_PUBLIC_FEATURE_NEW_EDITOR === 'true',
  
  /**
   * Enable image uploads in threads
   */
  enableImageUploads: process.env.NEXT_PUBLIC_FEATURE_IMAGE_UPLOADS === 'true',
  
  /**
   * Enable real-time notifications
   */
  enableRealTimeNotifications: process.env.NEXT_PUBLIC_FEATURE_REALTIME_NOTIFICATIONS === 'true',
  
  /**
   * Enable analytics tracking
   */
  enableAnalytics: process.env.NEXT_PUBLIC_FEATURE_ANALYTICS === 'true',
  
  /**
   * Enable rate limiting
   */
  enableRateLimiting: process.env.NEXT_PUBLIC_FEATURE_RATE_LIMITING !== 'false', // Enabled by default
  
  /**
   * Enable debug mode
   */
  enableDebugMode: process.env.NODE_ENV === 'development',
} as const;

/**
 * Type for feature flag keys
 */
export type FeatureFlag = keyof typeof featureFlags;

/**
 * Check if feature is enabled
 */
export function isFeatureEnabled(feature: FeatureFlag): boolean {
  return featureFlags[feature];
}

/**
 * Environment configuration
 */
export const environmentConfig = {
  /**
   * Current environment
   */
  env: process.env.NODE_ENV || 'development',
  
  /**
   * Is production environment
   */
  isProduction: process.env.NODE_ENV === 'production',
  
  /**
   * Is development environment
   */
  isDevelopment: process.env.NODE_ENV === 'development',
  
  /**
   * Is test environment
   */
  isTest: process.env.NODE_ENV === 'test',
  
  /**
   * Log level
   */
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  
  /**
   * Enable verbose logging
   */
  verboseLogging: process.env.VERBOSE_LOGGING === 'true',
} as const;
