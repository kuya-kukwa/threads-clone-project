import { cn } from '@/lib/utils';

/**
 * Skeleton — Authentic Threads-style loading bone
 * Uses a dark shimmer gradient instead of opacity pulse.
 * Matches the official Threads app loading states.
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        'relative overflow-hidden rounded-md bg-[#1e1e1e]',
        'after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/[0.04] after:to-transparent',
        'after:animate-[shimmer_1.8s_ease-in-out_infinite]',
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
