'use client';

/**
 * ServiceWorkerRegistration
 *
 * Registers the service worker at /service-worker.js on mount.
 * This must be a client component because service worker registration
 * is a browser-only API — it cannot run in SSR.
 *
 * The component renders nothing — it is a pure side-effect island.
 * It is imported once in the root layout so it runs on every page.
 */

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/service-worker.js', { scope: '/' })
      .catch((error) => {
        // Non-fatal — the app works perfectly without a service worker.
        // Log to console in development only to avoid noise in production.
        if (process.env.NODE_ENV === 'development') {
          console.warn('[SW] Registration failed:', error);
        }
      });
  }, []);

  return null;
}
