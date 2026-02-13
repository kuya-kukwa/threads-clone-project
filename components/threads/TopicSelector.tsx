'use client';

/**
 * Topic Selector — Authentic Threads Topic/Tag Picker
 *
 * Matches the real Threads app:
 * - Bottom-sheet on mobile, dropdown on desktop
 * - Users can create custom topics (free text)
 * - Topic label uses plain text in a pill (no # prefix)
 * - "Add a topic" trigger text next to username
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { XIcon, SearchSmallIcon } from '@/components/icons/ThreadsIcons';
import { cn } from '@/lib/utils';

/** Suggested topics — users can also type their own */
const SUGGESTED_TOPICS = [
  'Technology',
  'Science',
  'Sports',
  'Music',
  'Art',
  'Fashion',
  'Food',
  'Travel',
  'Photography',
  'Film',
  'Gaming',
  'Fitness',
  'Health',
  'Books',
  'Education',
  'Business',
  'Finance',
  'Politics',
  'News',
  'Culture',
  'Comedy',
  'Nature',
  'Pets',
  'Design',
  'Programming',
  'AI',
  'Startups',
  'Crypto',
  'Basketball',
  'Football',
  'Soccer',
  'Tennis',
  'F1',
  'Anime',
  'TV Shows',
  'Movies',
  'Cooking',
  'DIY',
  'Parenting',
  'Mental Health',
  'Relationships',
  'Career',
  'Productivity',
  'Sustainability',
  'Space',
  'History',
  'Philosophy',
  'Podcasts',
  'Memes',
];

interface TopicSelectorProps {
  selectedTopic: string | null;
  onSelectTopic: (topic: string | null) => void;
  className?: string;
}

/** Authentic topic icon — a small tag/label icon (not a hashtag) */
function TopicTagIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 6h.008v.008H6V6z"
      />
    </svg>
  );
}

export function TopicSelector({
  selectedTopic,
  onSelectTopic,
  className,
}: TopicSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Filter topics by search
  const filteredTopics = useMemo(() => {
    if (!search.trim()) return [...SUGGESTED_TOPICS];
    const q = search.toLowerCase();
    return SUGGESTED_TOPICS.filter((t) => t.toLowerCase().includes(q));
  }, [search]);

  // Whether the user's typed text is a new custom topic
  const isCustomTopic =
    search.trim().length > 0 &&
    !SUGGESTED_TOPICS.some(
      (t) => t.toLowerCase() === search.trim().toLowerCase(),
    );

  // Close on outside click (desktop only)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setIsOpen(false);
        setSearch('');
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Lock body scroll on mobile when sheet is open
  useEffect(() => {
    if (isOpen) {
      const isMobile = window.innerWidth < 640;
      if (isMobile) {
        document.body.style.overflow = 'hidden';
        return () => {
          document.body.style.overflow = '';
        };
      }
    }
  }, [isOpen]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay for bottom-sheet animation
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Calculate fixed dropdown position (escapes modal overflow-hidden)
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const dropdownW = 280;

      // If inside a modal, clamp horizontally within the dialog bounds
      const modal = triggerRef.current.closest('[role="dialog"]');
      const modalRect = modal?.getBoundingClientRect();

      let left: number;
      if (modalRect) {
        // Keep dropdown within the modal, with 8px padding
        const minLeft = modalRect.left + 8;
        const maxLeft = modalRect.right - dropdownW - 8;
        left = Math.max(minLeft, Math.min(rect.left, maxLeft));
      } else {
        left = Math.max(8, Math.min(rect.left, window.innerWidth - dropdownW - 16));
      }

      // In a modal the trigger is at the bottom, so always open above
      if (modalRect || rect.top > 340) {
        setDropdownStyle({
          top: `${rect.top - 8}px`,
          left: `${left}px`,
          transform: 'translateY(-100%)',
        });
      } else {
        setDropdownStyle({
          top: `${rect.bottom + 8}px`,
          left: `${left}px`,
        });
      }
    }
  }, [isOpen]);

  const handleSelect = useCallback(
    (topic: string) => {
      onSelectTopic(topic);
      setIsOpen(false);
      setSearch('');
    },
    [onSelectTopic],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelectTopic(null);
    },
    [onSelectTopic],
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearch('');
  }, []);

  // If topic is selected, show as a clean pill (no hashtag — authentic Threads style)
  if (selectedTopic) {
    return (
      <div className={cn('flex items-center', className)}>
        <button
          onClick={handleClear}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.08] hover:bg-white/[0.12] text-[13px] text-[#f3f5f7] transition-colors group"
        >
          <TopicTagIcon className="w-3.5 h-3.5 text-[#777]" />
          <span>{selectedTopic}</span>
          <XIcon className="w-3 h-3 text-[#666] group-hover:text-white transition-colors" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger — icon-only button matching toolbar style */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full hover:bg-white/[0.06] transition-colors text-[#777] hover:text-[#999]"
        title="Add a topic"
      >
        <TopicTagIcon className="w-5 h-5" />
      </button>

      {/* Mobile: bottom sheet overlay */}
      {isOpen && (
        <div
          className="sm:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-[#181818] rounded-t-2xl max-h-[70vh] flex flex-col animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-2">
              <button
                type="button"
                onClick={handleClose}
                className="text-[15px] text-[#999] hover:text-white"
              >
                Cancel
              </button>
              <span className="text-[15px] font-semibold text-white">
                Add a topic
              </span>
              <div className="w-12" />
            </div>

            {/* Search input */}
            <div className="px-4 pb-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.06] rounded-xl">
                <SearchSmallIcon className="w-4 h-4 text-[#666] shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search or create a topic"
                  className="flex-1 bg-transparent text-[15px] text-white placeholder:text-[#555] outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && search.trim()) {
                      e.preventDefault();
                      handleSelect(search.trim());
                    }
                  }}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="text-[#666] hover:text-white"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Custom topic creation — prominent when typing something new */}
            {isCustomTopic && (
              <div className="px-4 pb-2">
                <button
                  type="button"
                  onClick={() => handleSelect(search.trim())}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-blue-500/10 hover:bg-blue-500/15 rounded-xl transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <TopicTagIcon className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-[14px] font-medium text-blue-400">
                      Create &ldquo;{search.trim()}&rdquo;
                    </p>
                    <p className="text-[12px] text-[#666]">New topic</p>
                  </div>
                </button>
              </div>
            )}

            {/* Topic list */}
            <div className="flex-1 overflow-y-auto pb-8 overscroll-contain">
              {!search.trim() && (
                <div className="px-4 py-2 text-[12px] text-[#666] font-medium uppercase tracking-wider">
                  Suggested
                </div>
              )}
              {filteredTopics.length === 0 && !isCustomTopic ? (
                <div className="px-4 py-6 text-[14px] text-[#555] text-center">
                  No matching topics
                </div>
              ) : (
                filteredTopics.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => handleSelect(topic)}
                    className="w-full text-left px-4 py-3 text-[15px] text-[#e4e6eb] hover:bg-white/[0.06] active:bg-white/[0.08] transition-colors flex items-center gap-3"
                  >
                    <TopicTagIcon className="w-5 h-5 text-[#666] shrink-0" />
                    {topic}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Desktop: dropdown */}
      {isOpen && (
        <div ref={dropdownRef} data-picker-dropdown className="hidden sm:block fixed w-[280px] bg-[#181818] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden z-[60] animate-in fade-in slide-in-from-bottom-2 duration-150" style={dropdownStyle} onPointerDown={(e) => e.stopPropagation()}>
          {/* Search input */}
          <div className="p-2.5 border-b border-white/[0.08]">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.06] rounded-lg">
              <SearchSmallIcon className="w-4 h-4 text-[#666] shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search or create a topic"
                className="flex-1 bg-transparent text-[13px] text-white placeholder:text-[#555] outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && search.trim()) {
                    e.preventDefault();
                    handleSelect(search.trim());
                  }
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-[#666] hover:text-white"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Custom topic creation */}
          {isCustomTopic && (
            <div className="border-b border-white/[0.08] p-1.5">
              <button
                type="button"
                onClick={() => handleSelect(search.trim())}
                className="w-full text-left px-3 py-2 text-[14px] text-blue-400 hover:bg-white/[0.06] transition-colors flex items-center gap-2.5 rounded-lg"
              >
                <TopicTagIcon className="w-4 h-4 shrink-0 text-blue-400" />
                <span>Create &ldquo;{search.trim()}&rdquo;</span>
              </button>
            </div>
          )}

          {/* Topic list */}
          <div className="max-h-[220px] overflow-y-auto py-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
            {!search.trim() && (
              <div className="px-4 py-1.5 text-[11px] text-[#666] font-medium uppercase tracking-wider">
                Suggested
              </div>
            )}
            {filteredTopics.length === 0 && !isCustomTopic ? (
              <div className="px-4 py-3 text-[13px] text-[#555] text-center">
                No topics found
              </div>
            ) : (
              filteredTopics.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => handleSelect(topic)}
                  className="w-full text-left px-4 py-2 text-[14px] text-[#e4e6eb] hover:bg-white/[0.06] transition-colors flex items-center gap-2.5"
                >
                  <TopicTagIcon className="w-4 h-4 text-[#666] shrink-0" />
                  {topic}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
