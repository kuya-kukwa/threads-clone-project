import type { Metadata, Viewport } from 'next';
import './globals.css';
import { BottomNav } from '@/components/layout/BottomNav';
import { DesktopSidebar } from '@/components/layout/DesktopSidebar';
import { FloatingCreateButton } from '@/components/layout/FloatingCreateButton';
import { MobileTopNav } from '@/components/layout/MobileTopNav';
import { MultiColumnLayout } from '@/components/layout/MultiColumnLayout';

export const metadata: Metadata = {
  title: 'Threads',
  description: 'A modern social media platform built with Next.js and Appwrite',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Threads',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0a0a',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {/* Desktop Left Sidebar - visible on lg+ */}
        <DesktopSidebar />

        {/* Global Mobile Header - logo + menu, visible on mobile only */}
        <MobileTopNav />

        {/* Main Content Area - responsive padding for sidebar offsets */}
        <main className="pb-20 lg:pb-0 lg:pl-[76px] lg:h-screen lg:overflow-hidden">
          <MultiColumnLayout>{children}</MultiColumnLayout>
        </main>

        {/* Floating Create Button - visible on lg+ */}
        <FloatingCreateButton />

        {/* Desktop Bottom Bar — authentic Threads line at viewport bottom */}
        <div className="hidden lg:block fixed bottom-0 left-[76px] right-0 z-40 pointer-events-none">
          <div className="h-px bg-white/[0.06]" />
        </div>

        {/* Mobile Bottom Navigation - hidden on lg+ */}
        <BottomNav />
      </body>
    </html>
  );
}
