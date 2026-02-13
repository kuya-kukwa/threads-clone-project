/**
 * Authentication Layout
 * Server Component - provides layout for login/register pages
 * Matches official Threads login page design
 */

import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#101010] overflow-hidden">
      {/* Radial gradient background like official Threads */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a1a1a_0%,_#101010_60%,_#000_100%)]" />

      {/* Main content — centered */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full px-6">
        <div className="w-full max-w-[396px]">{children}</div>
      </div>

      {/* Bottom bar */}
      <div className="relative z-10 px-6 py-6">
        <p className="text-[12px] text-[#555] text-center">
          © 2026 Threads Clone
        </p>
      </div>
    </div>
  );
}
