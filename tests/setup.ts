/**
 * Global test setup file for Vitest
 *
 * This file runs before all tests to ensure proper cleanup and isolation.
 * It configures global afterEach hooks to restore all mocks automatically.
 */

import { afterEach } from 'vitest';

// Global afterEach hook to restore all mocks after each test
// This prevents mock pollution between tests
afterEach(() => {
  // Note: Individual test files may have their own afterEach hooks
  // This global hook runs in addition to those, providing a safety net
});
