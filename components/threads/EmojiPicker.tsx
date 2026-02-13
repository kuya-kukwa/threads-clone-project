'use client';

/**
 * Emoji Picker — Authentic Threads Emoji Selector
 *
 * Categorized emoji grid with search. Matches Threads app's emoji tray.
 * Uses native emoji rendering (no external lib needed).
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  EmojiIcon,
  SearchSmallIcon,
  XIcon,
} from '@/components/icons/ThreadsIcons';
import { cn } from '@/lib/utils';

const EMOJI_CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  {
    label: 'Frequently used',
    icon: '🕐',
    emojis: [
      '😂',
      '❤️',
      '🔥',
      '😍',
      '👏',
      '😭',
      '🙏',
      '💯',
      '🥺',
      '✨',
      '😊',
      '🥰',
      '💪',
      '😅',
      '🤣',
      '💀',
      '😎',
      '🎉',
      '👀',
      '🤔',
    ],
  },
  {
    label: 'Smileys',
    icon: '😊',
    emojis: [
      '😀',
      '😃',
      '😄',
      '😁',
      '😆',
      '😅',
      '🤣',
      '😂',
      '🙂',
      '😉',
      '😊',
      '😇',
      '🥰',
      '😍',
      '🤩',
      '😘',
      '😗',
      '😚',
      '😙',
      '🥲',
      '😋',
      '😛',
      '😜',
      '🤪',
      '😝',
      '🤑',
      '🤗',
      '🤭',
      '🤫',
      '🤔',
      '🫡',
      '🤐',
      '🤨',
      '😐',
      '😑',
      '😶',
      '🫥',
      '😏',
      '😒',
      '🙄',
      '😬',
      '🤥',
      '🫨',
      '😌',
      '😔',
      '😪',
      '🤤',
      '😴',
      '😷',
      '🤒',
      '🤕',
      '🤢',
      '🤮',
      '🤧',
      '🥵',
      '🥶',
      '🥴',
      '😵',
      '🤯',
      '🤠',
      '🥳',
      '🥸',
      '😎',
      '🤓',
      '🧐',
    ],
  },
  {
    label: 'Gestures',
    icon: '👋',
    emojis: [
      '👋',
      '🤚',
      '🖐️',
      '✋',
      '🖖',
      '🫱',
      '🫲',
      '🫳',
      '🫴',
      '👌',
      '🤌',
      '🤏',
      '✌️',
      '🤞',
      '🫰',
      '🤟',
      '🤘',
      '🤙',
      '👈',
      '👉',
      '👆',
      '🖕',
      '👇',
      '☝️',
      '🫵',
      '👍',
      '👎',
      '✊',
      '👊',
      '🤛',
      '🤜',
      '👏',
      '🙌',
      '🫶',
      '👐',
      '🤲',
      '🤝',
      '🙏',
      '✍️',
      '💅',
      '🤳',
      '💪',
    ],
  },
  {
    label: 'Hearts',
    icon: '❤️',
    emojis: [
      '❤️',
      '🧡',
      '💛',
      '💚',
      '💙',
      '💜',
      '🖤',
      '🤍',
      '🤎',
      '💔',
      '❤️‍🔥',
      '❤️‍🩹',
      '❣️',
      '💕',
      '💞',
      '💓',
      '💗',
      '💖',
      '💘',
      '💝',
      '💟',
      '♥️',
      '🩷',
      '🩵',
      '🩶',
    ],
  },
  {
    label: 'Animals',
    icon: '🐶',
    emojis: [
      '🐶',
      '🐱',
      '🐭',
      '🐹',
      '🐰',
      '🦊',
      '🐻',
      '🐼',
      '🐻‍❄️',
      '🐨',
      '🐯',
      '🦁',
      '🐮',
      '🐷',
      '🐸',
      '🐵',
      '🙈',
      '🙉',
      '🙊',
      '🐒',
      '🦍',
      '🦧',
      '🐔',
      '🐧',
      '🐦',
      '🦅',
      '🦆',
      '🦢',
      '🦉',
      '🦩',
      '🐺',
      '🐗',
      '🐴',
      '🦄',
    ],
  },
  {
    label: 'Food',
    icon: '🍔',
    emojis: [
      '🍏',
      '🍎',
      '🍐',
      '🍊',
      '🍋',
      '🍌',
      '🍉',
      '🍇',
      '🍓',
      '🫐',
      '🍈',
      '🍒',
      '🍑',
      '🥭',
      '🍍',
      '🥥',
      '🥝',
      '🍅',
      '🍆',
      '🥑',
      '🥦',
      '🌶️',
      '🫑',
      '🥖',
      '🍔',
      '🍟',
      '🍕',
      '🌭',
      '🥪',
      '🌮',
      '🌯',
      '🍣',
      '🍩',
      '🍪',
      '🎂',
      '🍰',
      '☕',
      '🍵',
    ],
  },
  {
    label: 'Objects',
    icon: '💡',
    emojis: [
      '⌚',
      '📱',
      '💻',
      '⌨️',
      '🖥️',
      '🖨️',
      '🕹️',
      '💾',
      '💿',
      '📸',
      '🎥',
      '🔦',
      '💡',
      '🔧',
      '🔨',
      '⚙️',
      '🧲',
      '💣',
      '🔑',
      '📝',
      '📚',
      '✏️',
      '🖊️',
      '📌',
      '📎',
      '✂️',
      '💰',
      '💳',
      '🎁',
      '🏆',
      '🎯',
      '🎨',
    ],
  },
  {
    label: 'Symbols',
    icon: '✨',
    emojis: [
      '✨',
      '🌟',
      '⭐',
      '🌈',
      '☀️',
      '⛅',
      '🌙',
      '💫',
      '🎵',
      '🎶',
      '🔔',
      '💬',
      '💭',
      '🗯️',
      '♾️',
      '✅',
      '❌',
      '❓',
      '❗',
      '💤',
      '🏳️',
      '🏴',
      '🚩',
      '🏁',
    ],
  },
];

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  className?: string;
}

export function EmojiPicker({ onEmojiSelect, className }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const categorySectionsRef = useRef<(HTMLDivElement | null)[]>([]);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Close on outside click
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

  // Calculate fixed dropdown position (consistent with other pickers)
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const dropdownW = 320;

      // If inside a modal, clamp horizontally within the dialog bounds
      const modal = triggerRef.current.closest('[role="dialog"]');
      const modalRect = modal?.getBoundingClientRect();

      let left: number;
      if (modalRect) {
        const minLeft = modalRect.left + 8;
        const maxLeft = modalRect.right - dropdownW - 8;
        left = Math.max(minLeft, Math.min(rect.left, maxLeft));
      } else {
        left = Math.max(8, Math.min(rect.left, window.innerWidth - dropdownW - 16));
      }

      // In a modal the trigger is at the bottom, so always open above
      if (modalRect || rect.top > 400) {
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

  // Simple search — filter emojis (labels match)
  const displayCategories = useMemo(() => {
    if (!search.trim()) return EMOJI_CATEGORIES;
    const q = search.toLowerCase();
    return EMOJI_CATEGORIES.map((cat) => ({
      ...cat,
      emojis: cat.emojis.filter(() => cat.label.toLowerCase().includes(q)),
    })).filter((cat) => cat.emojis.length > 0);
  }, [search]);

  const handleSelectEmoji = useCallback(
    (emoji: string) => {
      onEmojiSelect(emoji);
    },
    [onEmojiSelect],
  );

  const scrollToCategory = useCallback((index: number) => {
    categorySectionsRef.current[index]?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
    setActiveCategory(index);
  }, []);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full hover:bg-white/[0.06] transition-colors text-[#777] hover:text-[#999]"
        title="Add emoji"
      >
        <EmojiIcon className="w-5 h-5" />
      </button>

      {/* Picker Panel — fixed position, consistent with Location/Topic/Audience pickers */}
      {isOpen && (
        <div
          ref={dropdownRef}
          data-picker-dropdown
          className="fixed w-[320px] bg-[#181818] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden z-[60] animate-in fade-in slide-in-from-bottom-2 duration-150"
          style={dropdownStyle}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Search */}
          <div className="p-2.5 border-b border-white/[0.08]">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.06] rounded-lg">
              <SearchSmallIcon className="w-4 h-4 text-[#666] shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search emoji"
                className="flex-1 bg-transparent text-[13px] text-white placeholder:text-[#555] outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-[#666] hover:text-white"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Category tabs */}
          {!search.trim() && (
            <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-white/[0.08] overflow-x-auto [&::-webkit-scrollbar]:hidden">
              {EMOJI_CATEGORIES.map((cat, i) => (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => scrollToCategory(i)}
                  className={cn(
                    'px-2 py-1 rounded-md text-base transition-colors shrink-0',
                    activeCategory === i
                      ? 'bg-white/[0.1]'
                      : 'hover:bg-white/[0.06]',
                  )}
                  title={cat.label}
                >
                  {cat.icon}
                </button>
              ))}
            </div>
          )}

          {/* Emoji grid */}
          <div className="max-h-[260px] overflow-y-auto p-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
            {displayCategories.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-[#555]">
                No emoji found
              </div>
            ) : (
              displayCategories.map((cat, catIndex) => (
                <div
                  key={cat.label}
                  ref={(el) => {
                    categorySectionsRef.current[catIndex] = el;
                  }}
                >
                  <div className="text-[11px] text-[#666] font-medium uppercase tracking-wider px-1 pt-2 pb-1">
                    {cat.label}
                  </div>
                  <div className="grid grid-cols-8 gap-0.5">
                    {cat.emojis.map((emoji, i) => (
                      <button
                        key={`${cat.label}-${i}`}
                        type="button"
                        onClick={() => handleSelectEmoji(emoji)}
                        className="w-9 h-9 flex items-center justify-center text-xl rounded-lg hover:bg-white/[0.08] active:scale-90 transition-all"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
