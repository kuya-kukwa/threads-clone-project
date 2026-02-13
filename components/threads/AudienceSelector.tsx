'use client';

/**
 * Audience Selector — Authentic Threads Reply Permission Control
 *
 * Controls who can reply to a thread. Matches the official Threads
 * "Anyone can reply" / "Profiles you follow" / "Mentioned only" selector.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { GlobeIcon, ChevronDownIcon } from '@/components/icons/ThreadsIcons';
import { cn } from '@/lib/utils';

export type AudienceType = 'anyone' | 'followers' | 'mentioned';

const AUDIENCE_OPTIONS: {
  value: AudienceType;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'anyone',
    label: 'Anyone',
    description: 'Anyone can reply & quote',
    icon: (
      <svg
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
        />
      </svg>
    ),
  },
  {
    value: 'followers',
    label: 'Profiles you follow',
    description: 'Only profiles you follow can reply',
    icon: (
      <svg
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
        />
      </svg>
    ),
  },
  {
    value: 'mentioned',
    label: 'Mentioned only',
    description: 'Only people you mention can reply',
    icon: (
      <svg
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <path
          strokeLinecap="round"
          d="M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 10-2.636 6.364M16.5 12V8.25"
        />
      </svg>
    ),
  },
];

interface AudienceSelectorProps {
  audience: AudienceType;
  onAudienceChange: (audience: AudienceType) => void;
  className?: string;
}

export function AudienceSelector({
  audience,
  onAudienceChange,
  className,
}: AudienceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const currentOption =
    AUDIENCE_OPTIONS.find((o) => o.value === audience) || AUDIENCE_OPTIONS[0];

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
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Calculate fixed dropdown position (prevents scroll issues in modal)
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const dropdownW = 260;

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

      // Always open above the trigger
      setDropdownStyle({
        top: `${rect.top - 8}px`,
        left: `${left}px`,
        transform: 'translateY(-100%)',
      });
    }
  }, [isOpen]);

  const handleSelect = useCallback(
    (value: AudienceType) => {
      onAudienceChange(value);
      setIsOpen(false);
    },
    [onAudienceChange],
  );

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-[13px] text-[#777] hover:text-[#999] transition-colors"
      >
        <GlobeIcon className="w-3.5 h-3.5" />
        <span>{currentOption.label}</span>
        <ChevronDownIcon className="w-3 h-3" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          data-picker-dropdown
          className="fixed w-[260px] bg-[#181818] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden z-[60] animate-in fade-in slide-in-from-bottom-2 duration-150"
          style={dropdownStyle}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-2.5 border-b border-white/[0.08]">
            <p className="text-[13px] font-semibold text-[#f3f5f7]">
              Who can reply?
            </p>
          </div>
          <div className="py-1">
            {AUDIENCE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={cn(
                  'w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors',
                  audience === option.value
                    ? 'bg-white/[0.06]'
                    : 'hover:bg-white/[0.04]',
                )}
              >
                <span
                  className={cn(
                    'shrink-0',
                    audience === option.value ? 'text-white' : 'text-[#777]',
                  )}
                >
                  {option.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-[14px]',
                      audience === option.value
                        ? 'text-white font-medium'
                        : 'text-[#e4e6eb]',
                    )}
                  >
                    {option.label}
                  </p>
                  <p className="text-[12px] text-[#666]">
                    {option.description}
                  </p>
                </div>
                {audience === option.value && (
                  <svg
                    className="w-4 h-4 text-blue-400 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
