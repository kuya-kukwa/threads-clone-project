/**
 * Utility functions for common operations
 * Following DRY principle
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge Tailwind CSS classes with proper precedence
 * Used by shadcn/ui components
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Generate initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSizeMB = 5;
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, WebP, and GIF images are allowed' };
  }
  
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `Image must be smaller than ${maxSizeMB}MB` };
  }
  
  return { valid: true };
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Check if running on client side
 */
export const isClient = typeof window !== 'undefined';

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Sanitize user input to prevent XSS attacks
 * Removes potentially dangerous characters and enforces length limits
 * 
 * @param input - The string to sanitize
 * @param maxLength - Maximum allowed length (default: 500)
 * @returns Sanitized string
 * 
 * @example
 * sanitizeInput('<script>alert("xss")</script>') // 'scriptalert("xss")/script'
 * sanitizeInput('  hello world  ') // 'hello world'
 */
export function sanitizeInput(input: string, maxLength: number = 500): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets (basic XSS prevention)
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove inline event handlers (onclick=, onload=, etc.)
    .slice(0, maxLength); // Hard limit on input length
}

/**
 * Sanitize HTML content (for rich text editors)
 * More aggressive sanitization for user-generated HTML
 * 
 * @param html - The HTML string to sanitize
 * @param maxLength - Maximum allowed length (default: 2000)
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string, maxLength: number = 2000): string {
  return html
    .trim()
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove inline event handlers
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove data: URIs (can contain base64 encoded scripts)
    .replace(/data:text\/html[^"']*/gi, '')
    .slice(0, maxLength);
}

/**
 * Validate and sanitize URL
 * Ensures URL is safe to use and follows allowed protocols
 * 
 * @param url - The URL to validate
 * @param allowedProtocols - Allowed URL protocols (default: ['http:', 'https:'])
 * @returns Sanitized URL or null if invalid
 */
export function sanitizeUrl(
  url: string,
  allowedProtocols: string[] = ['http:', 'https:']
): string | null {
  try {
    const parsed = new URL(url.trim());
    
    // Check if protocol is allowed
    if (!allowedProtocols.includes(parsed.protocol)) {
      return null;
    }
    
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Generate a random request ID for tracing
 * Format: req_<timestamp>_<random>
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `req_${timestamp}_${random}`;
}

/**
 * Redact sensitive data from objects for logging
 * Replaces values for keys matching sensitive patterns
 * 
 * @param obj - Object to redact
 * @param keysToRedact - Array of key names to redact (default: common sensitive keys)
 * @returns Redacted copy of the object
 */
export function redactSensitiveData<T extends Record<string, any>>(
  obj: T,
  keysToRedact: string[] = ['password', 'token', 'apiKey', 'secret', 'authorization']
): T {
  const redacted = { ...obj };
  
  for (const key in redacted) {
    const lowerKey = key.toLowerCase();
    
    if (keysToRedact.some(sensitive => lowerKey.includes(sensitive))) {
      (redacted as any)[key] = '***REDACTED***';
    } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      redacted[key] = redactSensitiveData(redacted[key], keysToRedact);
    }
  }
  
  return redacted;
}
