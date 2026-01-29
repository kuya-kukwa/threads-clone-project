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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Subtle gradient orbs for depth */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm px-6 animate-fade-in">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold gradient-text">Threads</h1>
        </div>

        {children}
      </div>
    </div>
  );
}
