# Mobile-First Architecture Notes

> Reference notes based on the **threads-clone** project — a Next.js + Appwrite social media app that ships a mobile-first UI and progressively enhances for tablets and desktops.

---

## 1. Core Principle

**Design for the smallest screen first, then layer on enhancements at wider breakpoints.**

Everything in this codebase defaults to a phone-sized viewport. Desktop features are opt-in additions gated behind Tailwind breakpoints (`md`, `lg`, `xl`, `2xl`).

---

## 2. Breakpoint Strategy (Tailwind)

| Token           | Min-width | What appears                                                                                                         |
| --------------- | --------- | -------------------------------------------------------------------------------------------------------------------- |
| _default_       | 0 px      | Full mobile UI (bottom nav, top nav, full-width content)                                                             |
| `md` (768 px)   | 768 px    | Top `NavBar` becomes visible (`hidden md:block`)                                                                     |
| `lg` (1024 px)  | 1024 px   | `DesktopSidebar` appears, `BottomNav` hides, `FloatingCreateButton` shows, main content gets `lg:pl-19` left padding |
| `xl` (1280 px)  | 1280 px   | `RightSidebar` (suggested users, search) appears                                                                     |
| `2xl` (1536 px) | 1536 px   | `MultiColumnLayout` activates (3-column swipe layout)                                                                |

**Key takeaway:** Each breakpoint **adds** a component — it never rebuilds the mobile layout from scratch.

---

## 3. Navigation Architecture

### Mobile (default)

| Component      | Location | Behaviour                                                                                                                                                  |
| -------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MobileTopNav` | Top      | Hamburger menu + search icon; feed tab switcher (For You / Following / Likes / Ghost Posts)                                                                |
| `BottomNav`    | Bottom   | 5-tab bar (Home, Messages, Create, Activity, Profile); glass morphism; hides on scroll-down, reappears on scroll-up; safe-area padding for notched devices |

### Desktop (`lg`+)

| Component              | Location                        | Behaviour                                                                                                                       |
| ---------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `DesktopSidebar`       | Fixed left, 88 px wide (`w-22`) | Icon-only vertical nav (Home, Search, Create modal, Activity w/ badge, Profile); "More" dropdown at bottom with settings/logout |
| `FloatingCreateButton` | Fixed bottom-right              | Opens `CreatePostModal`, only shown on `lg`+ (`hidden lg:flex`)                                                                 |
| `NavBar`               | Sticky top                      | Centered logo; desktop-only icon row on the right; hidden on mobile (`hidden md:block`)                                         |

### Ultra-wide (`xl`+ / `2xl`+)

| Component           | Location      | Behaviour                                                                                              |
| ------------------- | ------------- | ------------------------------------------------------------------------------------------------------ |
| `RightSidebar`      | Right column  | Suggested users, follow button, footer links                                                           |
| `MultiColumnLayout` | Full viewport | 3-column horizontal scroll with snap (`Feed · Profile · Activity`); only activates at `2xl` (1536 px+) |

**Pattern to remember:**

```
Mobile:   MobileTopNav + Content + BottomNav
Desktop:  DesktopSidebar + (NavBar) + Content + (RightSidebar) + FloatingCreateButton
Wide:     DesktopSidebar + MultiColumnLayout(3 cols) + FloatingCreateButton
```

---

## 4. Root Layout Composition (`app/layout.tsx`)

```tsx
<body>
  {/* Desktop sidebar — hidden < lg via `hidden lg:flex` */}
  <DesktopSidebar />

  {/* Main content shifts right on desktop with lg:pl-19 */}
  <main className="pb-20 lg:pb-0 lg:pl-19">{children}</main>

  {/* Desktop floating create — hidden < lg */}
  <FloatingCreateButton />

  {/* Mobile bottom nav — hidden >= lg via internal logic */}
  <BottomNav />
</body>
```

**Notes for extension:**

- `pb-20` reserves space for `BottomNav` on mobile; `lg:pb-0` removes it when the sidebar takes over.
- `lg:pl-19` offsets main content so it doesn't sit behind the fixed sidebar.
- All navigation components self-gate with `hidden {breakpoint}:flex` or early-return guards (`if (!user || isAuthPage) return null`).

---

## 5. CSS Patterns Worth Keeping

### a. Safe-area support (notched phones)

```css
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .pb-safe {
    padding-bottom: calc(4.5rem + env(safe-area-inset-bottom));
  }
}
```

### b. Glass morphism (nav bars, modals)

```css
.glass {
  background: rgba(18, 18, 18, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px); /* Safari */
}
```

### c. Touch-friendly scroll snap (media galleries)

```css
.swipe-container {
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch; /* iOS momentum */
}
.swipe-item {
  scroll-snap-align: center;
  scroll-snap-stop: always;
}
```

### d. Hidden scrollbars

```css
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

### e. CSS containment for rendering performance

```css
.contain-layout {
  contain: layout;
}
.contain-paint {
  contain: paint;
}
.contain-strict {
  contain: strict;
}
```

### f. Viewport meta (PWA-ready)

```tsx
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // prevents pinch-zoom (intentional for app-like feel)
  userScalable: false,
  themeColor: '#0a0a0a',
  colorScheme: 'dark',
};
```

---

## 6. Touch & Interaction Patterns

| Pattern                     | Mobile                                                                                                    | Desktop extension                                   |
| --------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **Scroll-hide bottom nav**  | `BottomNav` tracks scroll direction via `requestAnimationFrame`; hides on scroll-down, shows on scroll-up | Not needed — sidebar is always visible              |
| **Swipeable media gallery** | `MediaGallery` uses CSS snap scroll for horizontal swipe between images                                   | Same component works with mouse drag / scroll wheel |
| **Debounced search**        | `MobileTopNav` uses a custom `useDebounce(300ms)` hook to throttle keystrokes                             | Reused in desktop search                            |
| **Pull-to-refresh**         | Standard mobile scroll behavior                                                                           | N/A on desktop                                      |
| **Modal-aware nav**         | `BottomNav` watches `document.body.classList` for `.modal-open` and hides itself                          | Desktop sidebar stays visible                       |

---

## 7. Component Design Rules

1. **One component, two display modes** — Components like `ThreadCard`, `MediaGallery`, and `ReplyComposer` work at all screen sizes by using relative units and `max-w-*` constraints. They are _not_ duplicated for desktop.

2. **Progressive disclosure via `hidden {bp}:block`** — Desktop-only features like `DesktopSidebar`, `RightSidebar`, `FloatingCreateButton` are hidden by default and revealed at breakpoints. This keeps the mobile bundle lean because CSS hides them, not JS conditionals (no extra rendering).

3. **Auth-page guards** — Every nav component checks `pathname.startsWith('/login') || pathname.startsWith('/register')` and returns `null` to avoid rendering navigation chrome on auth screens.

4. **Optimistic updates** — `LikeButton` and follow actions update UI instantly before the server responds. This is essential on mobile where network latency is higher.

5. **Prefetching on intent** — `usePrefetchThread` pre-loads thread detail data on hover/pointer-down so navigation feels instant.

---

## 8. Extending to Desktop — Checklist

When adding a new feature, follow this order:

- [ ] **Build the mobile version first** as the default layout (no breakpoint classes).
- [ ] **Test on 375px viewport** (iPhone SE) — everything must be usable.
- [ ] **Add `md:` / `lg:` overrides** for wider spacing, multi-column grids, or side panels.
- [ ] **Use `hidden lg:flex`** (not JS `window.innerWidth`) to toggle desktop-only elements.
- [ ] **Keep touch targets ≥ 44px** on mobile; you can relax this at `lg`+ for mouse users.
- [ ] **Avoid hover-only interactions** — always have a tap/click fallback.
- [ ] **Test the bottom-nav offset** — mobile content needs `pb-20` so the last item isn't hidden behind the nav bar.
- [ ] **Test the sidebar offset** — desktop content needs `lg:pl-19` so nothing hides behind the fixed sidebar.
- [ ] **Respect safe-area insets** for iOS notch/home indicator.

---

## 9. Folder Conventions

```
components/
  layout/          ← Shell & navigation (sidebar, navs, multi-column)
  threads/         ← Feed content (cards, composers, galleries, like button)
  profile/         ← User profile editing, avatar upload
  auth/            ← Login/register forms, auth guard
  ui/              ← Shadcn primitives (button, avatar, dialog, …)
  transitions/     ← Route-transition wrappers
  skeletons/       ← Loading placeholders
  streaming/       ← Suspense streaming components

hooks/             ← Custom React hooks (useAuth, useFeed, usePrefetch, …)
lib/               ← API clients, utils, config, services, logger, middleware
app/               ← Next.js App Router pages & API routes
types/             ← TypeScript type definitions
schemas/           ← Zod validation schemas
```

**Rule:** Layout components live together in `components/layout/`. Feature components (threads, profile) are grouped by domain, not by screen size. A `ThreadCard` is the same component on mobile and desktop.

---

## 10. Performance Notes

| Technique                | Where used                               | Why it matters on mobile                                                      |
| ------------------------ | ---------------------------------------- | ----------------------------------------------------------------------------- |
| `startTransition`        | Notification count updates, tab switches | Keeps UI responsive during state updates by deprioritizing non-urgent renders |
| `requestAnimationFrame`  | Scroll-hide nav                          | Prevents layout thrashing from high-frequency scroll events                   |
| `AbortController`        | Search API calls                         | Cancels in-flight requests when the user types a new character                |
| CSS `contain`            | Feed items                               | Tells the browser a subtree won't affect siblings — speeds up paint & layout  |
| `useCallback` + `useRef` | Scroll handlers, fetch functions         | Prevents unnecessary re-renders and stale closures                            |
| Font `display: 'swap'`   | Inter font loading                       | Shows fallback font instantly, swaps when the webfont loads                   |

---

## 11. Quick Reference — Visibility by Breakpoint

| Component              | `< md` | `md` | `lg` | `xl` | `2xl` |
| ---------------------- | ------ | ---- | ---- | ---- | ----- |
| `MobileTopNav`         | ✅     | ✅   | ❌   | ❌   | ❌    |
| `BottomNav`            | ✅     | ✅   | ❌   | ❌   | ❌    |
| `NavBar`               | ❌     | ✅   | ✅   | ✅   | ✅    |
| `DesktopSidebar`       | ❌     | ❌   | ✅   | ✅   | ✅    |
| `FloatingCreateButton` | ❌     | ❌   | ✅   | ✅   | ✅    |
| `RightSidebar`         | ❌     | ❌   | ❌   | ✅   | ✅    |
| `MultiColumnLayout`    | ❌     | ❌   | ❌   | ❌   | ✅    |

---

## 12. Common Pitfalls

1. **Adding desktop-first CSS and then overriding for mobile** — Always go `default → md: → lg:`. Never the reverse.
2. **Using `onClick` for navigation without `<Link>`** — Breaks prefetching and accessibility. Use Next.js `<Link>` with `onClick` handlers when needed.
3. **Forgetting `pb-20` on new pages** — Content will be obscured by `BottomNav` on mobile.
4. **Hard-coding widths instead of using `max-w-2xl mx-auto`** — Feed content should be fluid up to a max width, centered on desktop.
5. **JS-based responsive checks (`window.innerWidth`)** — Use CSS classes/Tailwind breakpoints. Only use JS (`useEffect` + resize listener) for logic that truly needs it (like `MultiColumnLayout` column math).
6. **Notification polling without cleanup** — Always clear intervals in `useEffect` return. This project polls every 30 s with proper cleanup.

---

_Last updated: 2026-02-06_
