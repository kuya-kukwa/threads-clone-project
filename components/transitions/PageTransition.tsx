'use client';

/**
 * Page Transition Component
 *
 * Creates smooth SPA-like transitions between pages.
 * Pattern: Header/footer never unmount, only content swaps.
 *
 * Features:
 * - No white flash between pages
 * - Content fades in/out smoothly
 * - Navigation feels instant
 * - Works with Next.js App Router
 */

import { ReactNode, useEffect, useState, startTransition, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Page transition wrapper
 * Wraps page content and animates on route changes
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionState, setTransitionState] = useState<
    'idle' | 'exiting' | 'entering'
  >('idle');
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip animation on initial mount
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Skip if same children
    if (displayChildren === children) return;

    // Start exit animation via setTimeout (not synchronous)
    const startExit = setTimeout(() => {
      startTransition(() => {
        setTransitionState('exiting');
      });
    }, 0);

    // After exit, update content and enter
    const exitTimer = setTimeout(() => {
      startTransition(() => {
        setDisplayChildren(children);
        setTransitionState('entering');
      });

      // Reset to idle after enter
      const enterTimer = setTimeout(() => {
        startTransition(() => {
          setTransitionState('idle');
        });
      }, 150);

      return () => clearTimeout(enterTimer);
    }, 100);

    return () => {
      clearTimeout(startExit);
      clearTimeout(exitTimer);
    };
  }, [children, displayChildren, pathname]);

  return (
    <div
      className={cn(
        'transition-all duration-150 ease-out',
        transitionState === 'exiting' && 'opacity-0 translate-y-1',
        transitionState === 'entering' && 'opacity-100 translate-y-0',
        transitionState === 'idle' && 'opacity-100 translate-y-0',
        className,
      )}
    >
      {displayChildren}
    </div>
  );
}

/**
 * Fade transition - simpler version
 */
export function FadeTransition({ children, className }: PageTransitionProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger fade in after mount
    const timer = requestAnimationFrame(() => {
      startTransition(() => {
        setMounted(true);
      });
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  return (
    <div
      className={cn(
        'transition-opacity duration-200 ease-out',
        mounted ? 'opacity-100' : 'opacity-0',
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Slide up transition - for content appearing from bottom
 */
export function SlideUpTransition({
  children,
  className,
}: PageTransitionProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      startTransition(() => {
        setMounted(true);
      });
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  return (
    <div
      className={cn(
        'transition-all duration-200 ease-out',
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Stagger children animation
 * Each child appears with a slight delay
 */
interface StaggerChildrenProps {
  children: ReactNode[];
  className?: string;
  /** Delay between each child in ms */
  staggerDelay?: number;
  /** Initial delay before first child */
  initialDelay?: number;
}

export function StaggerChildren({
  children,
  className,
  staggerDelay = 50,
  initialDelay = 0,
}: StaggerChildrenProps) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];

    children.forEach((_, index) => {
      const timeout = setTimeout(
        () => {
          startTransition(() => {
            setVisibleCount(index + 1);
          });
        },
        initialDelay + index * staggerDelay,
      );
      timeouts.push(timeout);
    });

    return () => timeouts.forEach(clearTimeout);
  }, [children.length, staggerDelay, initialDelay]);

  return (
    <div className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          className={cn(
            'transition-all duration-200 ease-out',
            index < visibleCount
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2',
          )}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

/**
 * Content swap without unmount
 * Keeps both old and new content mounted during transition
 */
interface ContentSwapProps {
  /** Unique key for current content */
  contentKey: string;
  children: ReactNode;
  className?: string;
}

export function ContentSwap({
  contentKey,
  children,
  className,
}: ContentSwapProps) {
  const [items, setItems] = useState<
    Array<{ key: string; content: ReactNode }>
  >([{ key: contentKey, content: children }]);
  const [activeKey, setActiveKey] = useState(contentKey);
  const prevContentKeyRef = useRef(contentKey);

  useEffect(() => {
    if (contentKey === prevContentKeyRef.current) return;
    prevContentKeyRef.current = contentKey;

    // Add new content via setTimeout (not synchronous)
    const addTimer = setTimeout(() => {
      startTransition(() => {
        setItems((prev) => {
          const exists = prev.some((item) => item.key === contentKey);
          if (exists) return prev;
          return [...prev, { key: contentKey, content: children }];
        });
      });
    }, 0);

    // Animate swap
    const swapTimer = setTimeout(() => {
      startTransition(() => {
        setActiveKey(contentKey);
      });

      // Clean up old content after animation
      const cleanupTimer = setTimeout(() => {
        startTransition(() => {
          setItems((prev) => prev.filter((item) => item.key === contentKey));
        });
      }, 300);

      return () => clearTimeout(cleanupTimer);
    }, 50);

    return () => {
      clearTimeout(addTimer);
      clearTimeout(swapTimer);
    };
  }, [contentKey, children]);

  return (
    <div className={cn('relative', className)}>
      {items.map((item) => (
        <div
          key={item.key}
          className={cn(
            'transition-all duration-200 ease-out',
            item.key === activeKey
              ? 'opacity-100 relative'
              : 'opacity-0 absolute inset-0 pointer-events-none',
          )}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}

/**
 * Animate presence - similar to framer-motion's AnimatePresence
 * Keeps content mounted during exit animation
 */
interface AnimatePresenceProps {
  children: ReactNode;
  /** Whether content should be visible */
  show: boolean;
  /** Class name for container */
  className?: string;
  /** Duration in ms */
  duration?: number;
}

export function AnimatePresence({
  children,
  show,
  className,
  duration = 200,
}: AnimatePresenceProps) {
  const [shouldRender, setShouldRender] = useState(show);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevShowRef = useRef(show);

  useEffect(() => {
    if (show === prevShowRef.current) return;
    prevShowRef.current = show;

    if (show) {
      // Use setTimeout to avoid synchronous setState in effect
      const renderTimer = setTimeout(() => {
        startTransition(() => {
          setShouldRender(true);
        });
      }, 0);

      const animateTimer = setTimeout(() => {
        startTransition(() => {
          setIsAnimating(true);
        });
      }, 16); // One frame delay

      return () => {
        clearTimeout(renderTimer);
        clearTimeout(animateTimer);
      };
    } else {
      startTransition(() => {
        setIsAnimating(false);
      });
      const timer = setTimeout(() => {
        startTransition(() => {
          setShouldRender(false);
        });
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration]);

  if (!shouldRender) return null;

  return (
    <div
      className={cn(
        'transition-all ease-out',
        isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
        className,
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}
