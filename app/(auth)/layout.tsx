/**
 * Authentication Layout
 * Server Component - provides layout for login/register pages
 *
 * WHY: Centralized layout for auth pages (centered, clean)
 * SERVER COMPONENT: No interactivity needed, pure layout
 */

import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md animate-slide-up">{children}</div>
    </div>
  );
}
