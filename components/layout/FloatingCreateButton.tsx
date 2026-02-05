'use client';

/**
 * Floating Create Button
 * Fixed position button at bottom right of screen (desktop only)
 * Opens a modal for creating new threads
 * Matches the official Threads app layout
 */

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useCurrentUser } from '@/hooks';
import { CreatePostModal } from '@/components/threads/CreatePostModal';

export function FloatingCreateButton() {
  const { user } = useCurrentUser();
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Don't show on auth pages or create page
  const isAuthPage =
    pathname.startsWith('/login') || pathname.startsWith('/register');
  const isCreatePage = pathname === '/create';

  if (!user || isAuthPage || isCreatePage) return null;

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="hidden lg:flex fixed bottom-6 right-6 w-[68px] h-[68px] items-center justify-center bg-[#181818] border border-[#363636] rounded-2xl shadow-lg hover:bg-[#252525] transition-all duration-200 z-50"
        aria-label="Create new thread"
      >
        <svg
          className="w-7 h-7 text-white"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            d="M12 5v14m-7-7h14"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <CreatePostModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  );
}
