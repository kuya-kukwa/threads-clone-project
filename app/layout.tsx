import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { BottomNav } from '@/components/layout/BottomNav';
import { DesktopSidebar } from '@/components/layout/DesktopSidebar';
import { FloatingCreateButton } from '@/components/layout/FloatingCreateButton';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

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
      <body className={`${inter.variable} antialiased`}>
        {/* Desktop Left Sidebar - visible on lg+ */}
        <DesktopSidebar />

        {/* Main Content Area */}
        <main className="pb-20 lg:pb-0 lg:pl-[76px]">{children}</main>

        {/* Floating Create Button - visible on lg+ */}
        <FloatingCreateButton />

        {/* Mobile Bottom Navigation - hidden on lg+ */}
        <BottomNav />
      </body>
    </html>
  );
}
