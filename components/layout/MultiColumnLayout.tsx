'use client';

/**
 * Multi-Column Desktop Layout
 * For very wide screens (2xl+, 1536px+), shows multiple columns
 * Users can swipe/scroll horizontally between columns
 *
 * Layout:
 * - Feed column (left)
 * - Profile/Content column (center)
 * - Activity column (right)
 */

import { useRef, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useCurrentUser } from '@/hooks';

interface Column {
  id: string;
  title: string;
  path: string;
  hasDropdown?: boolean;
}

const columns: Column[] = [
  { id: 'feed', title: 'For you', path: '/feed', hasDropdown: true },
  { id: 'profile', title: 'Profile', path: '/profile' },
  { id: 'activity', title: 'Activity', path: '/activity', hasDropdown: true },
];

export function MultiColumnLayout({ children }: { children: React.ReactNode }) {
  const { user } = useCurrentUser();
  const pathname = usePathname();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeColumn, setActiveColumn] = useState(0);
  const [isWideScreen, setIsWideScreen] = useState(false);

  // Check if screen is wide enough for multi-column
  useEffect(() => {
    const checkWidth = () => {
      setIsWideScreen(window.innerWidth >= 1536); // 2xl breakpoint
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // Don't show on auth pages
  const isAuthPage =
    pathname.startsWith('/login') || pathname.startsWith('/register');

  if (!user || isAuthPage || !isWideScreen) {
    return <>{children}</>;
  }

  // Scroll to column
  const scrollToColumn = (index: number) => {
    if (scrollContainerRef.current) {
      const columnWidth = scrollContainerRef.current.offsetWidth / 3;
      scrollContainerRef.current.scrollTo({
        left: columnWidth * index,
        behavior: 'smooth',
      });
      setActiveColumn(index);
    }
  };

  return (
    <div className="hidden 2xl:block h-screen overflow-hidden">
      {/* Horizontal scrollable container */}
      <div
        ref={scrollContainerRef}
        className="flex h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {columns.map((column, index) => (
          <div
            key={column.id}
            className="flex-shrink-0 w-1/3 h-full border-r border-border/30 snap-center overflow-y-auto"
          >
            {/* Column Header */}
            <div className="sticky top-0 z-40 bg-background border-b border-border/30">
              <div className="flex items-center justify-center h-14 px-4">
                <button
                  onClick={() => scrollToColumn(index)}
                  className="flex items-center gap-1.5 text-[15px] font-medium"
                >
                  {column.title}
                  {column.hasDropdown && (
                    <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                {index === columns.length - 1 && (
                  <button className="absolute right-4 p-2 rounded-full hover:bg-secondary/50">
                    <MoreHorizontalIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Column Content */}
            <div className="h-[calc(100vh-56px)] overflow-y-auto">
              {index === 0 && pathname === '/feed' ? (
                children
              ) : index === 1 && pathname.startsWith('/profile') ? (
                children
              ) : index === 2 && pathname === '/activity' ? (
                children
              ) : (
                <ColumnPlaceholder column={column} />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Column indicators */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {columns.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToColumn(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              activeColumn === index
                ? 'bg-foreground w-4'
                : 'bg-muted-foreground/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function ColumnPlaceholder({ column }: { column: Column }) {
  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      <p>Navigate to {column.title}</p>
    </div>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
      />
    </svg>
  );
}

function MoreHorizontalIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
      />
    </svg>
  );
}
