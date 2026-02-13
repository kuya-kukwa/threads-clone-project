'use client';

/**
 * useColumns — Page-scoped state management for the desktop multi-column layout.
 *
 * Each root page (feed, activity, search, profile, etc.) has its own
 * independent set of columns — just like official Threads.
 *
 * Navigating away from a page preserves its columns in localStorage.
 * Returning to that page restores them exactly as the user left them.
 *
 * Rules:
 * - Minimum 1 column (the primary/main content — cannot be removed)
 * - Maximum 5 columns per page
 * - Each column has a unique ID, type, and title
 * - The first column is always "main" and renders the current route children
 * - Columns are stored per-page under `threads-columns-{pageKey}`
 */

import { useState, useCallback, useEffect, useRef } from 'react';

export type ColumnType =
  | 'main'
  | 'feed'
  | 'following'
  | 'search'
  | 'activity'
  | 'profile'
  | 'insights'
  | 'feeds';

export interface Column {
  id: string;
  type: ColumnType;
  title: string;
}

/** Root page keys used for scoping column state */
export type PageKey = 'feed' | 'activity' | 'search' | 'profile' | 'create' | 'thread' | 'messages' | 'default';

const STORAGE_PREFIX = 'threads-columns-';
const MAX_COLUMNS = 5;

function generateId(): string {
  return `col-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Column type metadata for the "Add Column" picker — matches official Threads order */
export const COLUMN_OPTIONS: { type: ColumnType; title: string; hasArrow?: boolean }[] = [
  { type: 'search', title: 'Search' },
  { type: 'activity', title: 'Activity' },
  { type: 'profile', title: 'Profile' },
  { type: 'insights', title: 'Insights' },
  { type: 'feeds', title: 'Feeds', hasArrow: true },
];

/** Derive the page key from a pathname */
export function getPageKey(pathname: string): PageKey {
  if (pathname === '/feed' || pathname === '/') return 'feed';
  if (pathname === '/activity') return 'activity';
  if (pathname === '/search') return 'search';
  if (pathname.startsWith('/profile')) return 'profile';
  if (pathname === '/create') return 'create';
  if (pathname.startsWith('/thread')) return 'thread';
  if (pathname === '/messages') return 'messages';
  return 'default';
}

function defaultColumns(): Column[] {
  return [{ id: 'main', type: 'main', title: 'Home' }];
}

function loadColumns(pageKey: PageKey): Column[] {
  if (typeof window === 'undefined') return defaultColumns();
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + pageKey);
    if (raw) {
      const parsed = JSON.parse(raw) as Column[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return defaultColumns();
}

function saveColumns(pageKey: PageKey, columns: Column[]) {
  try {
    localStorage.setItem(STORAGE_PREFIX + pageKey, JSON.stringify(columns));
  } catch { /* ignore */ }
}

export function useColumns(pageKey: PageKey) {
  const [columns, setColumns] = useState<Column[]>(() => loadColumns(pageKey));
  const currentPageKey = useRef(pageKey);

  // When the pageKey changes (navigation), swap to that page's stored columns
  useEffect(() => {
    currentPageKey.current = pageKey;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setColumns(loadColumns(pageKey));
  }, [pageKey]);

  // Persist whenever columns change
  useEffect(() => {
    saveColumns(currentPageKey.current, columns);
  }, [columns]);

  const addColumn = useCallback((type: ColumnType, title: string) => {
    setColumns((prev) => {
      if (prev.length >= MAX_COLUMNS) return prev;
      return [...prev, { id: generateId(), type, title }];
    });
  }, []);

  const removeColumn = useCallback((id: string) => {
    setColumns((prev) => {
      // Never remove the main column
      if (prev.length <= 1) return prev;
      if (id === 'main') return prev;
      return prev.filter((c) => c.id !== id);
    });
  }, []);

  const changeColumnType = useCallback((id: string, type: ColumnType, title: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, type, title } : c)),
    );
  }, []);

  const canAddColumn = columns.length < MAX_COLUMNS;
  const canRemoveColumn = (id: string) => id !== 'main' && columns.length > 1;

  return {
    columns,
    addColumn,
    removeColumn,
    changeColumnType,
    canAddColumn,
    canRemoveColumn,
    maxColumns: MAX_COLUMNS,
  };
}
