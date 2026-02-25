/**
 * Bun test runner preload — polyfills vitest features missing from Bun's compat shim.
 *
 * vi.hoisted() is vitest-only; Bun doesn't hoist vi.mock() calls so the
 * function just needs to execute its callback and return the result.
 */
import { vi } from 'vitest';

if (typeof vi.hoisted !== 'function') {
  (vi as unknown as Record<string, unknown>).hoisted = <T>(fn: () => T): T => fn();
}
