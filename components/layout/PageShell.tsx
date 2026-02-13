'use client';

/**
 * PageShell Component
 * Consistent responsive page container used across all pages.
 * Handles the mobile/desktop split layout with proper breakpoints.
 *
 * Mobile: Full-width content with optional sticky header
 * Desktop (lg+): Centered column with bordered scrollable area
 *
 * This ensures loading states, content, and empty states
 * are perfectly aligned across all pages and breakpoints.
 */

interface PageShellProps {
  children: React.ReactNode;
  /** Page title shown in desktop header */
  title: string;
  /** Optional right-side header action (desktop) */
  headerAction?: React.ReactNode;
  /** Optional mobile header content (replaces default) */
  mobileHeader?: React.ReactNode;
  /** Whether to show the desktop bordered container (default: true) */
  desktopBorder?: boolean;
  /** Additional className for the desktop scroll area */
  desktopContentClassName?: string;
  /** Additional className for the mobile content area */
  mobileContentClassName?: string;
}

export function PageShell({
  children,
  title,
  headerAction,
  mobileHeader,
  desktopBorder = true,
  desktopContentClassName = '',
  mobileContentClassName = '',
}: PageShellProps) {
  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      {/* Desktop Content Container */}
      <div className="hidden lg:flex lg:flex-col max-w-[640px] mx-auto lg:pl-6 lg:pr-4 h-screen overflow-hidden">
        {/* Fixed Header */}
        <div className="shrink-0 bg-background pt-6 pb-2">
          <div className="flex items-center justify-center h-12 px-4 relative">
            <span className="text-[15px] font-medium">{title}</span>
            {headerAction && (
              <div className="absolute right-4 -mr-2">{headerAction}</div>
            )}
          </div>
        </div>

        {/* Content wrapper */}
        <div
          className={`${
            desktopBorder
              ? 'border border-border/30 rounded-t-2xl bg-[#181818]'
              : ''
          } flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${desktopContentClassName}`}
        >
          {children}
        </div>
      </div>

      {/* Mobile Content */}
      <div className={`lg:hidden max-w-[640px] mx-auto ${mobileContentClassName}`}>
        {mobileHeader}
        {children}
      </div>
    </div>
  );
}

/**
 * PageLoadingState
 * Consistent loading skeleton wrapper for any page.
 * Uses the same PageShell structure so loading states
 * are perfectly aligned with real content.
 */
interface PageLoadingStateProps {
  title: string;
  children: React.ReactNode;
}

export function PageLoadingState({ title, children }: PageLoadingStateProps) {
  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      {/* Desktop Loading */}
      <div className="hidden lg:flex lg:flex-col max-w-[640px] mx-auto lg:pl-6 lg:pr-4 h-screen overflow-hidden">
        <div className="shrink-0 bg-background pt-6 pb-2">
          <div className="flex items-center justify-center h-12 px-4">
            <span className="text-[15px] font-medium">{title}</span>
          </div>
        </div>
        <div className="border border-border/30 rounded-t-2xl flex-1 min-h-0 overflow-y-auto bg-[#181818] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="px-4 py-4">{children}</div>
        </div>
      </div>

      {/* Mobile Loading */}
      <div className="lg:hidden max-w-[640px] mx-auto px-4 py-4">
        {children}
      </div>
    </div>
  );
}
