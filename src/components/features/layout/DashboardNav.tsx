'use client';

/**
 * Dashboard navigation.
 *
 * Desktop (md+): fixed sidebar on the left.
 * Mobile (<md): top header bar with a hamburger button that opens a full-height
 *               slide-in drawer. The drawer has a backdrop overlay — clicking
 *               the overlay or pressing Escape closes it.
 *
 * Marked 'use client' because it uses:
 * - usePathname for active link detection
 * - useState for mobile drawer open/close state
 * - useRouter for programmatic navigation after sign-out
 * - useEffect to close the drawer on route change
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Nav items
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  href: string;
  /** Inline SVG path data for the icon. */
  iconPath: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    iconPath:
      'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    label: 'Players',
    href: '/players',
    iconPath:
      'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  },
  {
    label: 'Coaches',
    href: '/coaches',
    iconPath:
      'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  },
  {
    label: 'Events',
    href: '/events',
    iconPath:
      'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    label: 'Attendance',
    href: '/attendance',
    iconPath:
      'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    label: 'Insights',
    href: '/analytics',
    iconPath:
      'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DashboardNavProps {
  userEmail: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function NavIcon({ path, className }: { path: string; className?: string }) {
  return (
    <svg
      className={cn('h-5 w-5 shrink-0', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg
      className="h-5 w-5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// NavLinks — shared between sidebar and mobile drawer
// ---------------------------------------------------------------------------

interface NavLinksProps {
  pathname: string;
  onLinkClick?: () => void;
}

function NavLinks({ pathname, onLinkClick }: NavLinksProps) {
  return (
    <ul className="flex-1 px-3 py-4 space-y-1" role="list">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onLinkClick}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-100',
                'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-green-800',
                isActive
                  ? 'bg-green-700 text-white'
                  : 'text-green-100 hover:bg-green-700/60 hover:text-white',
              )}
            >
              <NavIcon path={item.iconPath} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// BrandHeader — RFC logo mark + name
// ---------------------------------------------------------------------------

function BrandHeader() {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/caerphilly-logo.png"
        alt="Caerphilly RFC"
        className="h-10 w-10 object-contain shrink-0"
      />
      <div className="min-w-0">
        <p className="font-semibold text-sm leading-tight">Caerphilly RFC</p>
        <p className="text-green-300 text-xs">Admin Portal</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DashboardNav({ userEmail }: DashboardNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Close the drawer when Escape is pressed.
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') setIsMobileOpen(false);
  }, []);

  useEffect(() => {
    if (isMobileOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll while drawer is open.
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isMobileOpen, handleKeyDown]);

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  function closeMobile() {
    setIsMobileOpen(false);
  }

  // --------------------------------------------------------------------------
  // Desktop sidebar (hidden on mobile via md:flex)
  // --------------------------------------------------------------------------

  const userFooter = (
    <div className="px-3 py-4 border-t border-green-700">
      <p
        className="text-green-300 text-xs px-3 mb-2 truncate"
        title={userEmail}
      >
        {userEmail}
      </p>
      <button
        onClick={handleSignOut}
        className="
          w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium
          text-green-100 hover:bg-green-700/60 hover:text-white
          transition-colors duration-100
          focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-green-800
        "
      >
        <SignOutIcon />
        Sign out
      </button>
    </div>
  );

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Desktop sidebar — hidden on small screens                           */}
      {/* ------------------------------------------------------------------ */}
      <nav
        className="hidden md:flex w-56 shrink-0 bg-green-800 text-white flex-col min-h-screen"
        aria-label="Main navigation"
      >
        <div className="px-5 py-6 border-b border-green-700">
          <BrandHeader />
        </div>
        <NavLinks pathname={pathname} />
        {userFooter}
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Mobile top bar — visible only on small screens                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="md:hidden">
        <header className="fixed top-0 left-0 right-0 z-30 bg-green-800 text-white h-14 flex items-center justify-between px-4 shadow-sm">
          <BrandHeader />
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={isMobileOpen}
            aria-controls="mobile-nav-drawer"
            className="
              p-2 rounded-md text-green-100
              hover:bg-green-700 hover:text-white
              focus:outline-none focus:ring-2 focus:ring-white
              transition-colors duration-100
            "
          >
            {/* Hamburger icon */}
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        {/* Spacer so page content clears the fixed header */}
        <div className="h-14" aria-hidden="true" />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Mobile drawer + backdrop                                             */}
      {/* ------------------------------------------------------------------ */}
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={closeMobile}
        className={cn(
          'md:hidden fixed inset-0 z-40 bg-black/40 transition-opacity duration-200',
          isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Drawer */}
      <nav
        id="mobile-nav-drawer"
        aria-label="Mobile navigation"
        aria-hidden={!isMobileOpen}
        className={cn(
          'md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[85vw]',
          'bg-green-800 text-white flex flex-col',
          'shadow-xl transition-transform duration-200 ease-in-out',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Drawer header with close button */}
        <div className="px-5 py-5 border-b border-green-700 flex items-center justify-between">
          <BrandHeader />
          <button
            type="button"
            onClick={closeMobile}
            aria-label="Close navigation menu"
            className="
              p-1.5 rounded-md text-green-200
              hover:bg-green-700 hover:text-white
              focus:outline-none focus:ring-2 focus:ring-white
              transition-colors duration-100
            "
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <NavLinks pathname={pathname} onLinkClick={closeMobile} />
        {userFooter}
      </nav>
    </>
  );
}
