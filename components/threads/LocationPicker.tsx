'use client';

/**
 * Location Picker — Authentic Threads Location Selector
 *
 * Responsive: bottom-sheet on mobile, dropdown on desktop.
 * Free-text fallback for custom locations.
 * Real-time geolocation with reverse geocoding.
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  LocationIcon,
  XIcon,
  SearchSmallIcon,
} from '@/components/icons/ThreadsIcons';
import { cn } from '@/lib/utils';

const POPULAR_LOCATIONS = [
  'New York, NY',
  'Los Angeles, CA',
  'San Francisco, CA',
  'Chicago, IL',
  'London, UK',
  'Paris, France',
  'Tokyo, Japan',
  'Berlin, Germany',
  'Sydney, Australia',
  'Toronto, Canada',
  'Dubai, UAE',
  'Seoul, South Korea',
  'Mumbai, India',
  'São Paulo, Brazil',
  'Mexico City, Mexico',
  'Singapore',
  'Amsterdam, Netherlands',
  'Stockholm, Sweden',
  'Barcelona, Spain',
  'Milan, Italy',
];

interface LocationPickerProps {
  selectedLocation: string | null;
  onSelectLocation: (location: string | null) => void;
  className?: string;
}

/**
 * Reverse-geocode coordinates to a human-readable place name
 * using the free OpenStreetMap Nominatim API.
 */
async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&zoom=14`,
      {
        headers: { 'Accept-Language': 'en' },
      },
    );
    if (!res.ok) throw new Error('Geocoding failed');
    const data = await res.json();
    const addr = data.address;
    if (!addr) return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

    // Build a nice location string: "City, State" or "City, Country"
    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.county ||
      '';
    const state = addr.state || '';
    const country = addr.country || '';

    if (city && state) return `${city}, ${state}`;
    if (city && country) return `${city}, ${country}`;
    if (state && country) return `${state}, ${country}`;
    return (
      data.display_name?.split(',').slice(0, 2).join(',').trim() ||
      `${lat.toFixed(4)}, ${lon.toFixed(4)}`
    );
  } catch {
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }
}

/**
 * Get nearby location suggestions from a single reverse geocode call.
 * Extracts multiple levels of location hierarchy (neighborhood, city, state).
 */
async function getNearbyLocations(lat: number, lon: number): Promise<string[]> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&zoom=16`,
      { headers: { 'Accept-Language': 'en' } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const addr = data.address;
    if (!addr) return [];

    const suburb = addr.suburb || addr.neighbourhood || addr.quarter || '';
    const city =
      addr.city || addr.town || addr.village || addr.municipality || '';
    const state = addr.state || '';
    const country = addr.country || '';

    const locations: string[] = [];
    if (suburb && city) locations.push(`${suburb}, ${city}`);
    if (city && state) locations.push(`${city}, ${state}`);
    if (city && country && !state) locations.push(`${city}, ${country}`);

    return [...new Set(locations)].slice(0, 3);
  } catch {
    return [];
  }
}

/**
 * IP-based geolocation fallback — no browser permissions needed.
 * Uses free ip-api.com for city-level accuracy.
 */
async function getLocationByIP(): Promise<string | null> {
  try {
    const res = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error('IP geolocation failed');
    const data = await res.json();
    const city = data.city || '';
    const region = data.region || '';
    const country = data.country_name || '';
    if (city && region) return `${city}, ${region}`;
    if (city && country) return `${city}, ${country}`;
    if (region && country) return `${region}, ${country}`;
    return null;
  } catch {
    return null;
  }
}

/**
 * IP-based nearby locations — returns city-level suggestions without permissions.
 */
async function getNearbyLocationsByIP(): Promise<string[]> {
  try {
    const res = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const city = data.city || '';
    const region = data.region || '';
    const country = data.country_name || '';
    const locations: string[] = [];
    if (city && region) locations.push(`${city}, ${region}`);
    if (city && country && country !== region)
      locations.push(`${city}, ${country}`);
    if (region && country) locations.push(`${region}, ${country}`);
    return [...new Set(locations)].slice(0, 3);
  } catch {
    return [];
  }
}

// ── Persistent location memory (localStorage) ──────────────────
const HOME_LOCATION_KEY = 'threads_home_location';
const RECENT_LOCATIONS_KEY = 'threads_recent_locations';
const MAX_RECENT = 5;

/** Save a location as the user's home/primary location (persists forever). */
function setHomeLocation(name: string) {
  try {
    localStorage.setItem(HOME_LOCATION_KEY, name);
  } catch {
    /* ignore */
  }
}

/** Get user's saved home location. */
function getHomeLocation(): string | null {
  try {
    return localStorage.getItem(HOME_LOCATION_KEY);
  } catch {
    return null;
  }
}

/** Clear saved home location. */
function clearHomeLocation() {
  try {
    localStorage.removeItem(HOME_LOCATION_KEY);
  } catch {
    /* ignore */
  }
}

/** Save a location to recent history. */
function addRecentLocation(name: string) {
  try {
    const raw = localStorage.getItem(RECENT_LOCATIONS_KEY);
    let recents: string[] = raw ? JSON.parse(raw) : [];
    // Remove if already exists, then prepend
    recents = recents.filter((r) => r.toLowerCase() !== name.toLowerCase());
    recents.unshift(name);
    recents = recents.slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(recents));
  } catch {
    /* ignore */
  }
}

/** Remove a single location from recent history. */
function removeRecentLocation(name: string) {
  try {
    const raw = localStorage.getItem(RECENT_LOCATIONS_KEY);
    let recents: string[] = raw ? JSON.parse(raw) : [];
    recents = recents.filter((r) => r.toLowerCase() !== name.toLowerCase());
    localStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(recents));
  } catch {
    /* ignore */
  }
}

/** Get recent locations. */
function getRecentLocations(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_LOCATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function LocationPicker({
  selectedLocation,
  onSelectLocation,
  className,
}: LocationPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [nearbyLocations, setNearbyLocations] = useState<string[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbySource, setNearbySource] = useState<'gps' | 'ip' | null>(null);
  const [homeLocation, setHomeLocationState] = useState<string | null>(null);
  const [recentLocations, setRecentLocations] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const retried = useRef(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Load home & recent locations from localStorage on mount
  useEffect(() => {
    setHomeLocationState(getHomeLocation());
    setRecentLocations(getRecentLocations());
  }, []);

  // Refresh home/recent when picker opens
  useEffect(() => {
    if (isOpen) {
      setHomeLocationState(getHomeLocation());
      setRecentLocations(getRecentLocations());
    }
  }, [isOpen]);

  const filteredLocations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return POPULAR_LOCATIONS;

    // When searching, match against ALL sources: home, recent, nearby, popular
    const all = [
      ...(homeLocation ? [homeLocation] : []),
      ...recentLocations,
      ...nearbyLocations,
      ...POPULAR_LOCATIONS,
    ];
    // Deduplicate (case-insensitive)
    const seen = new Set<string>();
    const unique = all.filter((l) => {
      const key = l.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return unique.filter((l) => l.toLowerCase().includes(q));
  }, [search, homeLocation, recentLocations, nearbyLocations]);

  const isCustomLocation =
    search.trim().length > 0 &&
    !filteredLocations.some(
      (l) => l.toLowerCase() === search.trim().toLowerCase(),
    );

  // Remove a single recent location
  const handleRemoveRecent = useCallback(
    (name: string, e: React.MouseEvent) => {
      e.stopPropagation();
      removeRecentLocation(name);
      setRecentLocations(getRecentLocations());
    },
    [],
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

  useEffect(() => {
    if (isOpen && inputRef.current) {
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
        left = Math.max(
          8,
          Math.min(rect.left, window.innerWidth - dropdownW - 16),
        );
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

  // Auto-detect nearby locations when picker opens
  useEffect(() => {
    if (!isOpen || nearbyLocations.length > 0) return;

    const fetchNearby = async () => {
      setNearbyLoading(true);

      // Try browser geolocation first (only if already granted)
      let locations: string[] = [];
      let source: 'gps' | 'ip' = 'ip';

      if (navigator.geolocation && navigator.permissions?.query) {
        try {
          const perm = await navigator.permissions.query({
            name: 'geolocation' as PermissionName,
          });
          if (perm.state === 'granted') {
            locations = await new Promise((resolve) => {
              navigator.geolocation.getCurrentPosition(
                async (pos) => {
                  const nearby = await getNearbyLocations(
                    pos.coords.latitude,
                    pos.coords.longitude,
                  );
                  resolve(nearby);
                },
                () => resolve([]),
                {
                  enableHighAccuracy: false,
                  timeout: 5000,
                  maximumAge: 300000,
                },
              );
            });
            if (locations.length > 0) source = 'gps';
          }
        } catch {
          /* ignore */
        }
      }

      // Fall back to IP-based nearby locations
      if (locations.length === 0) {
        locations = await getNearbyLocationsByIP();
        source = 'ip';
      }

      setNearbyLocations(locations);
      setNearbySource(source);
      setNearbyLoading(false);
    };

    fetchNearby();
  }, [isOpen, nearbyLocations.length]);

  const handleSelect = useCallback(
    (location: string) => {
      addRecentLocation(location);
      // First manually-chosen location becomes home location
      if (!getHomeLocation()) {
        setHomeLocation(location);
        setHomeLocationState(location);
      }
      onSelectLocation(location);
      setIsOpen(false);
      setSearch('');
    },
    [onSelectLocation],
  );

  /** Explicitly set a location as home (long-press or right-click could trigger this). */
  const handleSetAsHome = useCallback(
    (location: string) => {
      setHomeLocation(location);
      setHomeLocationState(location);
      addRecentLocation(location);
      onSelectLocation(location);
      setIsOpen(false);
      setSearch('');
    },
    [onSelectLocation],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelectLocation(null);
    },
    [onSelectLocation],
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearch('');
    setGeoError(null);
  }, []);

  const handleUseCurrentLocation = useCallback(async () => {
    setGeoLoading(true);
    setGeoError(null);

    // Try browser geolocation first, then fall back to IP-based
    const tryBrowserGeo = (): Promise<string | null> =>
      new Promise((resolve) => {
        if (
          !navigator.geolocation ||
          (typeof window !== 'undefined' && window.isSecureContext === false)
        ) {
          resolve(null);
          return;
        }

        const onSuccess = async (position: GeolocationPosition) => {
          try {
            const name = await reverseGeocode(
              position.coords.latitude,
              position.coords.longitude,
            );
            resolve(name);
          } catch {
            resolve(null);
          }
        };

        const onError = (error: GeolocationPositionError) => {
          // Retry once with low accuracy
          if (
            (error.code === error.POSITION_UNAVAILABLE ||
              error.code === error.TIMEOUT) &&
            !retried.current
          ) {
            retried.current = true;
            navigator.geolocation.getCurrentPosition(
              onSuccess,
              () => resolve(null),
              {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 300000,
              },
            );
            return;
          }
          resolve(null);
        };

        navigator.geolocation.getCurrentPosition(onSuccess, onError, {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 60000,
        });
      });

    try {
      // Try browser geolocation
      const browserResult = await tryBrowserGeo();
      retried.current = false;

      if (browserResult) {
        addRecentLocation(browserResult);
        setHomeLocation(browserResult);
        setHomeLocationState(browserResult);
        onSelectLocation(browserResult);
        setIsOpen(false);
        setSearch('');
        setGeoLoading(false);
        return;
      }

      // Try saved home location before IP fallback
      const home = getHomeLocation();
      if (home) {
        onSelectLocation(home);
        setIsOpen(false);
        setSearch('');
        setGeoLoading(false);
        return;
      }

      // Fall back to IP-based geolocation — less accurate, so pre-fill
      // the search instead of auto-selecting (user can confirm or edit)
      const ipResult = await getLocationByIP();
      if (ipResult) {
        setSearch(ipResult);
        setGeoError(
          'Approximate location via IP — edit if needed, then tap to use or press Enter',
        );
        setGeoLoading(false);
        return;
      }

      setGeoError('Could not detect location — type your location manually');
      setGeoLoading(false);
    } catch {
      setGeoError('Could not detect location — type your location manually');
      setGeoLoading(false);
    }
  }, [onSelectLocation]);

  // Selected state — show as pill
  if (selectedLocation) {
    return (
      <div className={cn('flex items-center', className)}>
        <button
          onClick={handleClear}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.08] hover:bg-white/[0.12] text-[13px] text-[#f3f5f7] transition-colors group"
        >
          <LocationIcon className="w-3.5 h-3.5 text-[#777]" />
          <span>{selectedLocation}</span>
          <XIcon className="w-3 h-3 text-[#666] group-hover:text-white transition-colors" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full hover:bg-white/[0.06] transition-colors text-[#777] hover:text-[#999]"
        title="Add location"
      >
        <LocationIcon className="w-5 h-5" />
      </button>

      {/* Mobile: bottom sheet overlay */}
      {isOpen && (
        <div
          className="sm:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-[#181818] rounded-t-2xl max-h-[75vh] flex flex-col animate-in slide-in-from-bottom duration-200"
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
                className="text-[15px] text-[#999]"
              >
                Cancel
              </button>
              <span className="text-[15px] font-semibold text-white">
                Location
              </span>
              <div className="w-12" />
            </div>

            {/* Search */}
            <div className="px-4 pb-2">
              <div className="flex items-center gap-2 px-3 py-2.5 bg-white/[0.06] rounded-xl">
                <SearchSmallIcon className="w-4 h-4 text-[#666] shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search or type a location"
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

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto pb-8 overscroll-contain">
              {/* Custom location — shown when search doesn't match */}
              {isCustomLocation && (
                <div className="border-b border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => handleSelect(search.trim())}
                    className="w-full text-left px-4 py-3 text-[15px] text-blue-400 hover:bg-white/[0.06] active:bg-white/[0.08] transition-colors flex items-center gap-3"
                  >
                    <LocationIcon className="w-5 h-5 text-blue-400 shrink-0" />
                    Use &ldquo;{search.trim()}&rdquo;
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAsHome(search.trim())}
                    className="w-full text-left px-4 py-2 text-[13px] text-green-400 hover:bg-green-500/[0.06] active:bg-green-500/[0.08] transition-colors flex items-center gap-3"
                  >
                    <HomeIcon className="w-5 h-5 text-green-400 shrink-0" />
                    Save &ldquo;{search.trim()}&rdquo; as your location
                  </button>
                </div>
              )}

              {/* No search — show structured sections */}
              {!search.trim() && (
                <>
                  {/* Use current location */}
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={geoLoading}
                    className="w-full text-left px-4 py-3 hover:bg-white/[0.06] active:bg-white/[0.08] transition-colors flex items-center gap-3 disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center shrink-0">
                      {geoLoading ? (
                        <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                      ) : (
                        <NavigationIcon className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                    <span className="text-[15px] font-medium text-blue-400">
                      {geoLoading ? 'Detecting...' : 'Use current location'}
                    </span>
                  </button>
                  {geoError && (
                    <button
                      type="button"
                      onClick={() => setGeoError(null)}
                      className={`mx-4 mb-2 flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[12px] ${
                        geoError.includes('Approximate')
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      <span>{geoError}</span>
                      <XIcon className="w-3 h-3 shrink-0 opacity-60" />
                    </button>
                  )}

                  {/* Your saved location */}
                  {homeLocation && (
                    <div className="flex items-center px-4 py-3 hover:bg-white/[0.06] active:bg-white/[0.08] transition-colors">
                      <button
                        type="button"
                        onClick={() => handleSelect(homeLocation)}
                        className="flex-1 flex items-center gap-3 text-left min-w-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
                          <HomeIcon className="w-4 h-4 text-green-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[15px] font-medium text-white truncate">
                            {homeLocation}
                          </p>
                          <p className="text-[11px] text-[#555]">
                            Your location
                          </p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearHomeLocation();
                          setHomeLocationState(null);
                        }}
                        className="ml-2 px-2.5 py-1 text-[11px] text-[#777] hover:text-white bg-white/[0.06] hover:bg-white/[0.1] rounded-full transition-colors shrink-0"
                      >
                        Change
                      </button>
                    </div>
                  )}

                  {/* Divider after pinned items */}
                  {(homeLocation || !geoError) && (
                    <div className="mx-4 border-b border-white/[0.06] my-1" />
                  )}

                  {/* Recent */}
                  {recentLocations.filter((r) => r !== homeLocation).length >
                    0 && (
                    <>
                      <div className="px-4 pt-2 pb-1 text-[12px] text-[#555] font-medium">
                        Recent
                      </div>
                      {recentLocations
                        .filter((r) => r !== homeLocation)
                        .slice(0, 3)
                        .map((loc) => (
                          <div
                            key={loc}
                            className="flex items-center px-4 py-2.5 hover:bg-white/[0.06] active:bg-white/[0.08] transition-colors group"
                          >
                            <button
                              type="button"
                              onClick={() => handleSelect(loc)}
                              className="flex-1 flex items-center gap-3 text-left text-[15px] text-[#e4e6eb] min-w-0"
                            >
                              <ClockIcon className="w-5 h-5 text-[#555] shrink-0" />
                              <span className="truncate">{loc}</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleRemoveRecent(loc, e)}
                              className="ml-2 p-1 rounded-full text-[#555] hover:text-white hover:bg-white/[0.1] transition-colors shrink-0 opacity-0 group-hover:opacity-100 sm:opacity-100"
                              title="Remove"
                            >
                              <XIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                    </>
                  )}

                  {/* Nearby */}
                  {nearbyLoading && (
                    <div className="px-4 py-3 flex items-center gap-2 text-[13px] text-[#555]">
                      <div className="w-3.5 h-3.5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                      Finding nearby...
                    </div>
                  )}
                  {nearbyLocations.length > 0 && (
                    <>
                      <div className="px-4 pt-2 pb-1 text-[12px] text-[#555] font-medium">
                        {nearbySource === 'gps' ? 'Nearby' : 'Suggested'}
                      </div>
                      {nearbyLocations.map((loc) => (
                        <button
                          key={`nearby-${loc}`}
                          type="button"
                          onClick={() => handleSelect(loc)}
                          className="w-full text-left px-4 py-2.5 text-[15px] text-[#e4e6eb] hover:bg-white/[0.06] active:bg-white/[0.08] transition-colors flex items-center gap-3"
                        >
                          <NavigationIcon className="w-5 h-5 text-[#555] shrink-0" />
                          {loc}
                        </button>
                      ))}
                    </>
                  )}

                  {/* Popular */}
                  <div className="px-4 pt-2 pb-1 text-[12px] text-[#555] font-medium">
                    Popular
                  </div>
                </>
              )}

              {/* Location results (filtered when searching, popular when not) */}
              {search.trim() ? (
                filteredLocations.length === 0 && !isCustomLocation ? (
                  <div className="px-4 py-6 text-[14px] text-[#555] text-center">
                    No locations found
                  </div>
                ) : (
                  filteredLocations.map((location) => (
                    <button
                      key={location}
                      type="button"
                      onClick={() => handleSelect(location)}
                      className="w-full text-left px-4 py-2.5 text-[15px] text-[#e4e6eb] hover:bg-white/[0.06] active:bg-white/[0.08] transition-colors flex items-center gap-3"
                    >
                      <LocationIcon className="w-5 h-5 text-[#555] shrink-0" />
                      {location}
                    </button>
                  ))
                )
              ) : (
                POPULAR_LOCATIONS.map((location) => (
                  <button
                    key={location}
                    type="button"
                    onClick={() => handleSelect(location)}
                    className="w-full text-left px-4 py-2.5 text-[15px] text-[#e4e6eb] hover:bg-white/[0.06] active:bg-white/[0.08] transition-colors flex items-center gap-3"
                  >
                    <LocationIcon className="w-5 h-5 text-[#555] shrink-0" />
                    {location}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Desktop: dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          data-picker-dropdown
          className="hidden sm:block fixed w-[280px] bg-[#181818] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden z-[60] animate-in fade-in slide-in-from-bottom-2 duration-150"
          style={dropdownStyle}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Search */}
          <div className="p-2.5 border-b border-white/[0.06]">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.06] rounded-lg">
              <SearchSmallIcon className="w-4 h-4 text-[#666] shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search locations"
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

          {/* Scrollable list */}
          <div className="max-h-[320px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
            {/* Custom location */}
            {isCustomLocation && (
              <div className="border-b border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => handleSelect(search.trim())}
                  className="w-full text-left px-4 py-2 text-[13px] text-blue-400 hover:bg-white/[0.06] transition-colors flex items-center gap-2.5"
                >
                  <LocationIcon className="w-4 h-4 shrink-0 text-blue-400" />
                  Use &ldquo;{search.trim()}&rdquo;
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAsHome(search.trim())}
                  className="w-full text-left px-4 py-1.5 text-[12px] text-green-400 hover:bg-green-500/[0.06] transition-colors flex items-center gap-2.5"
                >
                  <HomeIcon className="w-3.5 h-3.5 shrink-0 text-green-400" />
                  Save as your location
                </button>
              </div>
            )}

            {/* No search — structured sections */}
            {!search.trim() && (
              <>
                {/* Use current location */}
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={geoLoading}
                  className="w-full text-left px-4 py-2 text-[13px] text-blue-400 hover:bg-white/[0.06] transition-colors flex items-center gap-2.5 disabled:opacity-50"
                >
                  {geoLoading ? (
                    <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin shrink-0" />
                  ) : (
                    <NavigationIcon className="w-4 h-4 shrink-0 text-blue-400" />
                  )}
                  <span>
                    {geoLoading ? 'Detecting...' : 'Current location'}
                  </span>
                </button>
                {geoError && (
                  <button
                    type="button"
                    onClick={() => setGeoError(null)}
                    className={`mx-3 mb-1 flex items-center justify-between gap-2 px-2 py-1 rounded text-[11px] ${
                      geoError.includes('Approximate')
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    <span>{geoError}</span>
                    <XIcon className="w-2.5 h-2.5 shrink-0 opacity-50" />
                  </button>
                )}

                {/* Saved home location */}
                {homeLocation && (
                  <div className="flex items-center px-4 py-2 hover:bg-white/[0.06] transition-colors">
                    <button
                      type="button"
                      onClick={() => handleSelect(homeLocation)}
                      className="flex-1 flex items-center gap-2.5 text-left min-w-0"
                    >
                      <HomeIcon className="w-4 h-4 shrink-0 text-green-400" />
                      <span className="text-[13px] font-medium text-white truncate">
                        {homeLocation}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearHomeLocation();
                        setHomeLocationState(null);
                      }}
                      className="ml-1.5 px-2 py-0.5 text-[10px] text-[#777] hover:text-white bg-white/[0.06] hover:bg-white/[0.1] rounded-full transition-colors shrink-0"
                    >
                      Change
                    </button>
                  </div>
                )}

                {/* Divider */}
                <div className="mx-3 border-b border-white/[0.06] my-0.5" />

                {/* Recent */}
                {recentLocations.filter((r) => r !== homeLocation).length >
                  0 && (
                  <>
                    <div className="px-4 pt-1.5 pb-0.5 text-[10px] text-[#555] font-medium uppercase tracking-wider">
                      Recent
                    </div>
                    {recentLocations
                      .filter((r) => r !== homeLocation)
                      .slice(0, 3)
                      .map((loc) => (
                        <div
                          key={loc}
                          className="flex items-center px-4 py-1.5 hover:bg-white/[0.06] transition-colors group"
                        >
                          <button
                            type="button"
                            onClick={() => handleSelect(loc)}
                            className="flex-1 flex items-center gap-2.5 text-left text-[13px] text-[#ccc] min-w-0"
                          >
                            <ClockIcon className="w-3.5 h-3.5 text-[#555] shrink-0" />
                            <span className="truncate">{loc}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleRemoveRecent(loc, e)}
                            className="ml-1.5 p-0.5 rounded-full text-[#555] hover:text-white hover:bg-white/[0.1] transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                            title="Remove"
                          >
                            <XIcon className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                  </>
                )}

                {/* Nearby */}
                {nearbyLoading && (
                  <div className="px-4 py-2 flex items-center gap-2 text-[11px] text-[#555]">
                    <div className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                    Finding nearby...
                  </div>
                )}
                {nearbyLocations.length > 0 && (
                  <>
                    <div className="px-4 pt-1.5 pb-0.5 text-[10px] text-[#555] font-medium uppercase tracking-wider">
                      {nearbySource === 'gps' ? 'Nearby' : 'Suggested'}
                    </div>
                    {nearbyLocations.map((loc) => (
                      <button
                        key={`nearby-${loc}`}
                        type="button"
                        onClick={() => handleSelect(loc)}
                        className="w-full text-left px-4 py-1.5 text-[13px] text-[#ccc] hover:bg-white/[0.06] transition-colors flex items-center gap-2.5"
                      >
                        <NavigationIcon className="w-3.5 h-3.5 text-[#555] shrink-0" />
                        {loc}
                      </button>
                    ))}
                  </>
                )}

                {/* Popular */}
                <div className="px-4 pt-1.5 pb-0.5 text-[10px] text-[#555] font-medium uppercase tracking-wider">
                  Popular
                </div>
              </>
            )}

            {/* Results */}
            {search.trim() ? (
              filteredLocations.length === 0 && !isCustomLocation ? (
                <div className="px-4 py-4 text-[13px] text-[#555] text-center">
                  No locations found
                </div>
              ) : (
                filteredLocations.map((location) => (
                  <button
                    key={location}
                    type="button"
                    onClick={() => handleSelect(location)}
                    className="w-full text-left px-4 py-1.5 text-[13px] text-[#ccc] hover:bg-white/[0.06] transition-colors flex items-center gap-2.5"
                  >
                    <LocationIcon className="w-3.5 h-3.5 text-[#555] shrink-0" />
                    {location}
                  </button>
                ))
              )
            ) : (
              POPULAR_LOCATIONS.map((location) => (
                <button
                  key={location}
                  type="button"
                  onClick={() => handleSelect(location)}
                  className="w-full text-left px-4 py-1.5 text-[13px] text-[#ccc] hover:bg-white/[0.06] transition-colors flex items-center gap-2.5"
                >
                  <LocationIcon className="w-3.5 h-3.5 text-[#555] shrink-0" />
                  {location}
                </button>
              ))
            )}

            {/* Bottom padding */}
            <div className="h-1" />
          </div>
        </div>
      )}
    </div>
  );
}

/** Navigation/compass arrow icon for "Use current location" */
function NavigationIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
    >
      <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z" />
    </svg>
  );
}

/** Home/pin icon for saved "Your location" */
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

/** Clock icon for recent locations */
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
