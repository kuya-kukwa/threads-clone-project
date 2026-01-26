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
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent mb-4">
            <ThreadsIcon className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">Threads</h1>
        </div>

        {children}
      </div>
    </div>
  );
}

function ThreadsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.5 12.068V12c.015-3.58 1.239-6.477 3.64-8.612C7.254 1.525 10.18.5 13.5.5c2.162 0 4.113.418 5.8 1.244 1.646.806 2.973 1.973 3.945 3.47.97 1.492 1.463 3.232 1.463 5.17 0 2.01-.57 3.736-1.693 5.13-1.11 1.378-2.59 2.138-4.403 2.26l-.062.003c-1.382 0-2.59-.345-3.594-1.027-.59-.4-1.074-.904-1.456-1.503v.03c0 1.13-.314 2.063-.934 2.772-.638.73-1.523 1.1-2.63 1.1-.993 0-1.855-.326-2.562-.97-.713-.65-1.105-1.505-1.168-2.544l-.003-.09c0-1.054.347-1.934 1.032-2.617.665-.663 1.503-1 2.494-1 .422 0 .82.062 1.185.186v1.683a2.07 2.07 0 0 0-.795-.157c-.493 0-.88.15-1.152.445-.265.288-.4.682-.4 1.172 0 .502.153.908.456 1.21.295.292.68.44 1.148.44.52 0 .916-.165 1.176-.49.27-.336.407-.838.407-1.495V7.495h2.063v1.252c.4-.476.88-.85 1.432-1.123.575-.284 1.212-.428 1.897-.428 1.34 0 2.433.434 3.25 1.29.823.862 1.24 2.002 1.24 3.39 0 1.41-.457 2.592-1.36 3.513-.888.905-2.033 1.364-3.404 1.364-.67 0-1.298-.126-1.87-.377-.517-.226-.972-.55-1.36-.97v.038c0 1.073.306 1.896.91 2.448.6.546 1.418.822 2.432.822h.04c1.134-.086 2.042-.58 2.7-1.47.67-.906 1.01-2.085 1.01-3.504 0-1.427-.333-2.63-.99-3.573-.65-.932-1.527-1.633-2.604-2.082-1.07-.447-2.252-.673-3.516-.673-2.615 0-4.773.78-6.415 2.318C3.535 6.69 2.7 8.89 2.688 11.71v.048c0 2.803.67 5.06 1.99 6.708 1.337 1.67 3.398 2.54 6.125 2.585h.12c.993 0 1.914-.106 2.74-.316.798-.202 1.555-.52 2.252-.947l.78 1.554c-.81.503-1.71.873-2.676 1.1-.987.233-2.067.35-3.21.35h-.623zm2.066-8.063c.695 0 1.274-.232 1.722-.69.454-.463.683-1.066.683-1.794 0-.72-.23-1.316-.683-1.772-.447-.462-1.027-.696-1.722-.696-.696 0-1.278.234-1.73.697-.447.456-.673 1.052-.673 1.772 0 .728.226 1.33.672 1.793.453.458 1.035.69 1.73.69z" />
    </svg>
  );
}
