/**
 * Login Page
 * Server Component - renders the login form
 *
 * WHY SERVER: No interactivity at page level, just renders LoginForm
 * WHY (auth) FOLDER: Groups all auth routes together with shared layout
 */

import { LoginForm } from '@/components/auth/LoginForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | Threads Clone',
  description: 'Sign in to your account',
};

export default function LoginPage() {
  return <LoginForm />;
}
