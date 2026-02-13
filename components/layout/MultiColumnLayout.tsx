'use client';

/**
 * Multi-Column Desktop Layout — Dynamic Column System
 *
 * Desktop-only (xl+ / 1280px+). On mobile, renders children as-is.
 *
 * The "Add Column" icon sits at the top-right of the page content area
 * (matching official Threads) and is always visible on desktop — even
 * in single-column mode. Clicking it shows a dropdown with column types.
 *
 * Features:
 * ─ Fixed top-right column icon (official Threads style)
 * ─ Dynamic column addition/removal (state-driven via useColumns)
 * ─ Horizontal scrollable container with independent vertical scroll per column
 * ─ Three-dot menu per column header for removal
 * ─ Columns persist across page loads via localStorage
 * ─ Smooth animations on add/remove
 */

import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useCurrentUser } from '@/hooks';
import { ThreadsSpinner } from '@/components/skeletons';
import {
  useColumns,
  COLUMN_OPTIONS,
  getPageKey,
  type Column,
  type ColumnType,
} from '@/hooks/useColumns';
import {
  ColumnsIcon,
  MoreHorizontalIcon,
  RemoveIcon,
  ChevronRightIcon,
  InsightsIcon,
} from '@/components/icons/ThreadsIcons';

/** Check icon for dropdown selected state */
function CheckIcon({ className }: { className?: string }) {
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
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  );
}

/** Map the current pathname to a human-readable page title */
function getPageTitle(pathname: string): string {
  if (pathname === '/feed' || pathname === '/') return 'For you';
  if (pathname === '/activity') return 'Activity';
  if (pathname === '/search') return 'Search';
  if (pathname.startsWith('/profile')) return 'Profile';
  if (pathname === '/create') return 'Create';
  if (pathname.startsWith('/thread')) return 'Thread';
  if (pathname === '/messages') return 'Messages';
  return 'Home';
}

/** Map the current page to a column type so we can filter it from the add-column picker */
function pageToColumnType(pathname: string): ColumnType | null {
  if (pathname === '/feed' || pathname === '/') return 'feed';
  if (pathname === '/activity') return 'activity';
  if (pathname === '/search') return 'search';
  if (pathname.startsWith('/profile')) return 'profile';
  return null;
}

/* ====================================================================== */
/*  Main Wrapper                                                           */
/* ====================================================================== */

export function MultiColumnLayout({ children }: { children: React.ReactNode }) {
  const { user } = useCurrentUser();
  const pathname = usePathname();
  const [isDesktop, setIsDesktop] = useState(false);
  const [ready, setReady] = useState(false);
  const pageKey = getPageKey(pathname);

  const {
    columns,
    addColumn,
    removeColumn,
    changeColumnType,
    canAddColumn,
    canRemoveColumn,
  } = useColumns(pageKey);

  // Desktop detection (xl breakpoint = 1280px)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)');
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Delay showing AddColumnIcon until page content has had time to render
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(false);
    const t = setTimeout(() => setReady(true), 600);
    return () => clearTimeout(t);
  }, [pathname]);

  const isAuthPage =
    pathname.startsWith('/login') || pathname.startsWith('/register');

  // Mobile / auth / not logged in → pass-through (no icon)
  if (!user || isAuthPage || !isDesktop) {
    return <>{children}</>;
  }

  const currentPageType = pageToColumnType(pathname);
  const mainTitle = getPageTitle(pathname);

  // Single column → render children + the floating add-column icon next to content
  if (columns.length <= 1) {
    return (
      <div className="flex h-screen justify-center">
        <div className="w-full max-w-[640px] min-w-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {children}
        </div>
        {ready && (
          <AddColumnIcon
            canAdd={canAddColumn}
            onAdd={addColumn}
            excludeType={currentPageType}
          />
        )}
      </div>
    );
  }

  // Multi-column mode
  return (
    <DesktopColumns
      columns={columns}
      addColumn={addColumn}
      removeColumn={removeColumn}
      changeColumnType={changeColumnType}
      canAddColumn={canAddColumn}
      canRemoveColumn={canRemoveColumn}
      excludeType={currentPageType}
      mainTitle={mainTitle}
      ready={ready}
    >
      {children}
    </DesktopColumns>
  );
}

/* ====================================================================== */
/*  Add Column Icon — sits to the right of the last column / main content  */
/*  Vertically centered, acts as a flex sibling (not fixed).               */
/* ====================================================================== */

function AddColumnIcon({
  canAdd,
  onAdd,
  excludeType,
}: {
  canAdd: boolean;
  onAdd: (type: ColumnType, title: string) => void;
  excludeType?: ColumnType | null;
}) {
  const filteredOptions = useMemo(
    () => COLUMN_OPTIONS.filter((opt) => opt.type !== excludeType),
    [excludeType],
  );
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const t = setTimeout(
      () => document.addEventListener('mousedown', handler),
      0,
    );
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', handler);
    };
  }, [open]);

  const handleSelect = useCallback(
    (type: ColumnType, title: string) => {
      onAdd(type, title);
      setOpen(false);
    },
    [onAdd],
  );

  if (!canAdd) return null;

  return (
    <div
      className="hidden xl:flex shrink-0 items-center justify-center px-4 animate-in fade-in duration-300"
      ref={ref}
    >
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className={`
            p-2.5 rounded-xl transition-all duration-150
            ${
              open
                ? 'bg-[#252525] text-white'
                : 'text-[#555] hover:text-[#999] hover:bg-[#1a1a1a]'
            }
          `}
          aria-label="Add column"
          title="Add column"
        >
          <ColumnsIcon className="w-6 h-6" />
        </button>

        {/* Dropdown — official Threads style */}
        {open && (
          <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 w-[220px] bg-[#181818] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-right-2 duration-150 z-50">
            <div className="py-1.5">
              {filteredOptions.map((opt, i) => (
                <button
                  key={opt.type}
                  onClick={() => handleSelect(opt.type, opt.title)}
                  className={`
                    w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.06] transition-colors text-left
                    ${i === 0 ? 'bg-white/[0.08]' : ''}
                  `}
                >
                  <span className="text-[15px] text-white font-normal">
                    {opt.title}
                  </span>
                  {opt.hasArrow && (
                    <ChevronRightIcon className="w-4 h-4 text-[#777]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ====================================================================== */
/*  Desktop Columns Container                                              */
/* ====================================================================== */

interface DesktopColumnsProps {
  columns: Column[];
  addColumn: (type: ColumnType, title: string) => void;
  removeColumn: (id: string) => void;
  changeColumnType: (id: string, type: ColumnType, title: string) => void;
  canAddColumn: boolean;
  canRemoveColumn: (id: string) => boolean;
  excludeType?: ColumnType | null;
  mainTitle: string;
  ready: boolean;
  children: React.ReactNode;
}

function DesktopColumns({
  columns,
  addColumn,
  removeColumn,
  changeColumnType,
  canAddColumn,
  canRemoveColumn,
  excludeType,
  mainTitle,
  ready,
  children,
}: DesktopColumnsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Animated removal — collapse then delete
  const handleAnimatedRemove = useCallback(
    (id: string) => {
      setRemovingId(id);
      setTimeout(() => {
        removeColumn(id);
        setRemovingId(null);
      }, 400); // matches CSS transition duration
    },
    [removeColumn],
  );

  // Auto-scroll right when a new column is added
  const prevCount = useRef(columns.length);
  useEffect(() => {
    if (columns.length > prevCount.current && scrollRef.current) {
      // Small delay to let the expanding animation start first
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          left: scrollRef.current.scrollWidth,
          behavior: 'smooth',
        });
      }, 100);
    }
    prevCount.current = columns.length;
  }, [columns.length]);

  return (
    <div className="h-screen overflow-hidden flex relative">
      {/* Horizontal scroll container — icon is INSIDE so it sticks right after the last column */}
      <div
        ref={scrollRef}
        className="flex-1 flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory"
      >
        {columns.map((col, index) => (
          <ColumnContainer
            key={col.id}
            column={col}
            index={index}
            isLast={index === columns.length - 1}
            canRemove={canRemoveColumn(col.id)}
            onRemove={() => handleAnimatedRemove(col.id)}
            onChangeType={(type, title) =>
              changeColumnType(col.id, type, title)
            }
            displayTitle={col.type === 'main' ? mainTitle : col.title}
            isRemoving={removingId === col.id}
          >
            {col.type === 'main' ? (
              children
            ) : (
              <EmbeddedColumnContent type={col.type} />
            )}
          </ColumnContainer>
        ))}

        {/* Add-column icon — inside scroll container, right after last column */}
        {ready && (
          <AddColumnIcon
            canAdd={canAddColumn}
            onAdd={addColumn}
            excludeType={excludeType}
          />
        )}
      </div>
    </div>
  );
}

/* ====================================================================== */
/*  Column Container                                                       */
/* ====================================================================== */

const ColumnContainer = memo(function ColumnContainer({
  column,
  index,
  canRemove,
  onRemove,
  onChangeType,
  displayTitle,
  isRemoving = false,
  children,
}: {
  column: Column;
  index: number;
  isLast: boolean;
  canRemove: boolean;
  onRemove: () => void;
  onChangeType: (type: ColumnType, title: string) => void;
  displayTitle: string;
  isRemoving?: boolean;
  children: React.ReactNode;
}) {
  const isMain = column.type === 'main';
  const containerRef = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(isMain); // main column starts entered

  // Animate side columns in on mount
  useEffect(() => {
    if (isMain) return;
    // Start collapsed, then expand
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setEntered(true);
      });
    });
  }, [isMain]);

  // Determine if column should be visually collapsed
  const collapsed = (!isMain && !entered) || isRemoving;

  return (
    <div
      ref={containerRef}
      className={`
        shrink-0 flex flex-col h-full snap-center overflow-hidden
        ${index === 0 ? (isMain ? 'w-[min(640px,50vw)]' : 'w-[min(600px,45vw)]') : 'w-[min(600px,45vw)]'}
        transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
        ${collapsed ? 'max-w-0 opacity-0 !gap-0' : 'opacity-100'}
      `}
      style={{
        maxWidth: collapsed ? '0px' : undefined,
        contain: 'layout',
      }}
    >
      {/* Column Header — only for side columns (main page has its own header) */}
      {!isMain && (
        <ColumnHeader
          title={displayTitle}
          currentType={column.type}
          canRemove={canRemove}
          onRemove={onRemove}
          onChangeType={onChangeType}
        />
      )}

      {/* Main column: render children directly (page has its own border/card) */}
      {/* Side columns: bordered card with independent vertical scroll */}
      {isMain ? (
        <div className="flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {children}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto border border-white/[0.08] rounded-t-2xl bg-[#181818] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {children}
        </div>
      )}
    </div>
  );
});

/* ====================================================================== */
/*  Column Header — simple title + 3-dot menu                             */
/*  The embedded components handle their own tab dropdowns internally.     */
/* ====================================================================== */

function ColumnHeader({
  title,
  currentType,
  canRemove,
  onRemove,
  onChangeType,
}: {
  title: string;
  currentType: ColumnType;
  canRemove: boolean;
  onRemove: () => void;
  onChangeType: (type: ColumnType, title: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  return (
    <div className="shrink-0 bg-black pt-6 pb-2">
      <div className="flex items-center justify-center h-12 px-4 relative">
        {/* Column title — plain text, no dropdown */}
        <span className="text-[15px] font-medium text-white">{title}</span>

        {/* 3-dot menu — opens column type picker + remove */}
        <div className="absolute right-2" ref={menuRef}>
          <button
            onClick={() => setShowMenu((v) => !v)}
            className={`p-2 rounded-full transition-colors ${
              showMenu ? 'bg-white/[0.08]' : 'hover:bg-white/[0.06]'
            }`}
            aria-label="Column options"
            title="Column options"
          >
            <MoreHorizontalIcon className="w-5 h-5 text-[#777]" />
          </button>

          {/* Dropdown menu — column type switcher + remove */}
          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-[#181818] border border-white/[0.12] rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 z-50">
              <div className="py-1.5">
                <div className="px-4 py-2 text-xs font-medium text-[#555] uppercase tracking-wider">
                  Switch to
                </div>
                {COLUMN_OPTIONS.map((opt) => (
                  <button
                    key={opt.type}
                    onClick={() => {
                      if (opt.type !== currentType) {
                        onChangeType(opt.type, opt.title);
                      }
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.06] transition-colors"
                  >
                    <span
                      className={`text-[15px] ${currentType === opt.type ? 'text-white font-medium' : 'text-[#ccc]'}`}
                    >
                      {opt.title}
                    </span>
                    {currentType === opt.type && (
                      <CheckIcon className="w-4 h-4 text-white" />
                    )}
                  </button>
                ))}
              </div>

              {/* Remove option */}
              {canRemove && (
                <>
                  <div className="mx-3 border-t border-white/[0.08]" />
                  <div className="py-1.5">
                    <button
                      onClick={() => {
                        onRemove();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-white/[0.06] transition-colors text-left text-[14px]"
                    >
                      <RemoveIcon className="w-4 h-4" />
                      Remove column
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ====================================================================== */
/*  Embedded Column Content                                                */
/* ====================================================================== */

function EmbeddedColumnContent({ type }: { type: ColumnType }) {
  switch (type) {
    case 'feed':
    case 'feeds':
      return <LazyEmbeddedFeed mode="for-you" />;
    case 'following':
      return <LazyEmbeddedFeed mode="following" />;
    case 'activity':
      return (
        <LazyEmbeddedComponent
          loader={() =>
            import('@/components/columns/EmbeddedActivity').then(
              (m) => m.EmbeddedActivity,
            )
          }
          label="Activity"
        />
      );
    case 'search':
      return (
        <LazyEmbeddedComponent
          loader={() =>
            import('@/components/columns/EmbeddedSearch').then(
              (m) => m.EmbeddedSearch,
            )
          }
          label="Search"
        />
      );
    case 'profile':
      return (
        <LazyEmbeddedComponent
          loader={() =>
            import('@/components/columns/EmbeddedProfile').then(
              (m) => m.EmbeddedProfile,
            )
          }
          label="Profile"
        />
      );
    case 'insights':
      return <EmbeddedInsights />;
    default:
      return null;
  }
}

/** Generic lazy loader for embedded column components */
function LazyEmbeddedComponent({
  loader,
  label,
}: {
  loader: () => Promise<React.ComponentType>;
  label: string;
}) {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    loader().then((C) => setComponent(() => C));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!Component) return <ColumnPlaceholder label={label} />;
  return <Component />;
}

function LazyEmbeddedFeed({ mode }: { mode: 'for-you' | 'following' }) {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    if (mode === 'for-you') {
      import('@/components/threads/PublicFeed').then((m) =>
        setComponent(() => m.PublicFeed),
      );
    } else {
      import('@/components/threads/FollowingFeed').then((m) =>
        setComponent(() => m.FollowingFeed),
      );
    }
  }, [mode]);

  if (!Component)
    return (
      <ColumnPlaceholder label={mode === 'for-you' ? 'For You' : 'Following'} />
    );
  return <Component />;
}

function EmbeddedInsights() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="w-14 h-14 rounded-full bg-[#1e1e1e] flex items-center justify-center mb-4">
        <InsightsIcon className="w-7 h-7 text-[#777]" />
      </div>
      <h3 className="text-[15px] font-semibold mb-1.5 text-white">Insights</h3>
      <p className="text-[14px] text-[#777] leading-relaxed">
        Analytics and insights for your account will appear here.
      </p>
    </div>
  );
}

function ColumnPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-[#777]">
      <div className="flex items-center gap-2">
        <ThreadsSpinner size="sm" className="text-[#555]" />
        <span className="text-sm">Loading {label}…</span>
      </div>
    </div>
  );
}
