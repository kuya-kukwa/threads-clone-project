/**
 * Homepage
 * Server Component - redirects to login or feed based on auth status
 *
 * WHY: Entry point of the application
 */

import { redirect } from 'next/navigation';

export default function HomePage() {
  // For now, redirect to login
  // TODO: Check auth status and redirect accordingly
  redirect('/login');
}
