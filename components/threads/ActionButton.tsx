'use client';

/**
 * ActionButton Component
 * Reusable button for thread actions (like, comment, repost, share)
 * Uses scale animation on tap for instant feedback
 */

import React from 'react';

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  count?: number;
  onClick?: (e?: React.MouseEvent) => void;
  isActive?: boolean;
  isLoading?: boolean;
}

export function ActionButton({
  icon,
  label,
  count,
  onClick,
  isActive,
}: ActionButtonProps) {
  return (
    <button
      className={`flex items-center gap-1.5 transition-all duration-150 p-2 rounded-full active:scale-90 ${
        isActive
          ? 'text-red-500 hover:text-red-600'
          : 'text-[#B8B8B8] hover:text-white'
      }`}
      aria-label={label}
      onClick={onClick}
    >
      <span className="w-4 h-4 sm:w-5 sm:h-5 transition-transform">{icon}</span>
      {count !== undefined && count > 0 && (
        <span
          className={`text-[13px] tabular-nums transition-all duration-150 ${isActive ? 'text-red-500' : ''}`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
