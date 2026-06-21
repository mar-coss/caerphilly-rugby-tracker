/**
 * Vitest configuration for the Caerphilly RFC tracker.
 *
 * - jsdom environment so React components can be rendered with Testing Library.
 * - vite-tsconfig-paths so @/* path aliases resolve identically to Next.js.
 * - setupFiles loads the jest-dom matchers (toBeInTheDocument, etc.) globally.
 * - Coverage is collected via V8 for performance; thresholds are intentionally
 *   absent here — coverage is a signal, not a gate. Add thresholds only when
 *   the team has agreed on baseline numbers.
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
  ],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/__tests__/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'src/lib/utils/**',
        'src/components/ui/**',
        'src/app/(dashboard)/**/actions.ts',
      ],
      exclude: [
        'src/tests/**',
        '**/__tests__/**',
      ],
    },
  },
});
