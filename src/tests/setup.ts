/**
 * Global test setup file loaded by Vitest before every test suite.
 *
 * Responsibilities:
 * 1. Extend Vitest's expect with jest-dom matchers (toBeInTheDocument, etc.)
 * 2. Suppress console.error noise from React rendering during tests whilst
 *    still allowing spy assertions to work against it.
 * 3. Set environment variables that Next.js / Supabase modules read at
 *    import time so modules don't throw during test collection.
 */

import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Environment variables
// Supabase client reads these at module initialisation time. They must be set
// before any action file is imported into a test module.
// ---------------------------------------------------------------------------
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
