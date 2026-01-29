'use client';

/**
 * ActionButton Component
 * Reusable button for thread actions (like, comment, repost, share)
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
  isLoading,
}: ActionButtonProps) {
  return (
    <button
      className={`flex items-center gap-1.5 transition-colors p-2 rounded-full ${
        isActive
          ? 'text-red-500 hover:text-red-600'
          : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      aria-label={label}
      onClick={onClick}
      disabled={isLoading}
    >
      <span className={`w-5 h-5 ${isLoading ? 'animate-pulse' : ''}`}>
        {icon}
      </span>
      {count !== undefined && count > 0 && (
        <span className={`text-xs ${isActive ? 'text-red-500' : ''}`}>
          {count}
        </span>
      )}
    </button>
  );
}
