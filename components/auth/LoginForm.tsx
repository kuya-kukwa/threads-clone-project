/**
 * Login Form Component
 * Client Component - handles user interaction and form submission
 * Matches official Threads login page exactly
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';

import { loginSchema, type LoginInput } from '@/schemas/auth.schema';
import { useAuth } from '@/hooks';

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const { login, isLoading } = useAuth();
  const searchParams = useSearchParams();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(data: LoginInput) {
    setError(null);
    const redirectParam = searchParams.get('redirect');
    const result = await login(data, redirectParam || undefined);
    if (!result.success) {
      setError(result.error || 'Login failed');
    }
  }

  return (
    <div className="text-center">
      {/* Heading */}
      <h1 className="text-[28px] font-bold text-white mb-3 tracking-tight">
        Say more with Threads
      </h1>
      <p className="text-[15px] text-[#999] leading-relaxed mb-8 max-w-[320px] mx-auto">
        Join Threads to share thoughts, find out what&apos;s going on, follow
        your people and more.
      </p>

      {/* Log in label */}
      <p className="text-[15px] font-semibold text-white mb-4">Log in</p>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
          {/* Email Field */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <input
                    type="email"
                    placeholder="Username, phone or email"
                    autoComplete="email"
                    autoFocus
                    disabled={isLoading}
                    className="w-full h-[54px] bg-[#363636] border-0 rounded-xl px-4 text-[16px] text-white placeholder:text-[#8e8e8e] focus:outline-none focus:ring-1 focus:ring-white/20 transition-all disabled:opacity-50"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs text-red-400 px-1 text-left" />
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
                  <input
                    type="password"
                    placeholder="Password"
                    autoComplete="current-password"
                    disabled={isLoading}
                    className="w-full h-[54px] bg-[#363636] border-0 rounded-xl px-4 text-[16px] text-white placeholder:text-[#8e8e8e] focus:outline-none focus:ring-1 focus:ring-white/20 transition-all disabled:opacity-50"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs text-red-400 px-1 text-left" />
              </FormItem>
            )}
          />

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 text-[14px] text-red-400 bg-red-500/10 rounded-xl border border-red-500/20 text-left">
              <AlertIcon className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full h-[54px] rounded-xl bg-white text-black font-semibold text-[16px] transition-all hover:bg-white/90 active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 !mt-3"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <LoadingSpinner className="w-4 h-4" />
                <span>Logging in...</span>
              </div>
            ) : (
              'Log in'
            )}
          </button>
        </form>
      </Form>

      {/* Forgot password */}
      <div className="mt-5">
        <span className="text-[14px] text-[#999] cursor-pointer hover:text-white transition-colors">
          Forgot password?
        </span>
      </div>

      {/* Divider */}
      <div className="relative py-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/[0.12]" />
        </div>
        <div className="relative flex justify-center text-[13px]">
          <span className="px-4 bg-[#101010] text-[#777]">or</span>
        </div>
      </div>

      {/* Sign Up Link */}
      <Link
        href="/register"
        className="text-[15px] text-[#999] hover:text-white transition-colors"
      >
        Don&apos;t have an account?{' '}
        <span className="text-white font-semibold">Sign up</span>
      </Link>
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
