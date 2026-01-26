/**
 * Register Form Component
 * Client Component - handles user registration
 *
 * Modern minimalistic design with clean aesthetics
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import { registerSchema, type RegisterInput } from '@/schemas/auth.schema';
import { useAuth } from '@/hooks';

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const { register, isLoading } = useAuth();

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      username: '',
      displayName: '',
    },
  });

  async function onSubmit(data: RegisterInput) {
    setError(null);
    const result = await register(data);
    if (!result.success) {
      setError(result.error || 'Registration failed');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-foreground">
          Create account
        </h2>
        <p className="text-sm text-muted-foreground">
          Join Threads and start sharing
        </p>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          {/* Email Field */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Email"
                    autoComplete="email"
                    disabled={isLoading}
                    className="h-12 bg-secondary/50 border-0 rounded-xl px-4 text-sm placeholder:text-muted-foreground/60 focus:bg-secondary focus:ring-1 focus:ring-primary/50 transition-all"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs px-1" />
              </FormItem>
            )}
          />

          {/* Username Field */}
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="Username"
                    autoComplete="username"
                    disabled={isLoading}
                    className="h-12 bg-secondary/50 border-0 rounded-xl px-4 text-sm placeholder:text-muted-foreground/60 focus:bg-secondary focus:ring-1 focus:ring-primary/50 transition-all"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs px-1" />
              </FormItem>
            )}
          />

          {/* Display Name Field */}
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="Display name"
                    autoComplete="name"
                    disabled={isLoading}
                    className="h-12 bg-secondary/50 border-0 rounded-xl px-4 text-sm placeholder:text-muted-foreground/60 focus:bg-secondary focus:ring-1 focus:ring-primary/50 transition-all"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs px-1" />
              </FormItem>
            )}
          />

          {/* Password Field */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Password"
                    autoComplete="new-password"
                    disabled={isLoading}
                    className="h-12 bg-secondary/50 border-0 rounded-xl px-4 text-sm placeholder:text-muted-foreground/60 focus:bg-secondary focus:ring-1 focus:ring-primary/50 transition-all"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs px-1" />
              </FormItem>
            )}
          />

          {/* Confirm Password Field */}
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Confirm password"
                    autoComplete="new-password"
                    disabled={isLoading}
                    className="h-12 bg-secondary/50 border-0 rounded-xl px-4 text-sm placeholder:text-muted-foreground/60 focus:bg-secondary focus:ring-1 focus:ring-primary/50 transition-all"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs px-1" />
              </FormItem>
            )}
          />

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-xl">
              <AlertIcon className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-12 rounded-xl btn-gradient text-white font-medium text-sm transition-all hover:opacity-90 disabled:opacity-50 mt-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <LoadingSpinner className="w-4 h-4" />
                <span>Creating account...</span>
              </div>
            ) : (
              'Create account'
            )}
          </Button>
        </form>
      </Form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/50" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3 bg-background text-muted-foreground">or</span>
        </div>
      </div>

      {/* Sign In Link */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={`${className} animate-spin`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
