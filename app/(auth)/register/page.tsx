/**
 * Register Page
 * Server Component - renders the registration form
 *
 * WHY SERVER: No interactivity at page level, just renders RegisterForm
 */

import { RegisterForm } from '@/components/auth/RegisterForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Register | Threads Clone',
  description: 'Create a new account',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
