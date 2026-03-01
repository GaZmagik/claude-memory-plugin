/**
 * T086: Integration test for backward compatibility
 * Ensures existing commands work unchanged after v1.1.0 enhancements
 */
import { describe, it } from 'vitest';

describe('backward-compatibility-v1.1', () => {
  describe('think commands unchanged', () => {
    it.skip('think create works without new flags', async () => {
      // Basic think create should work as before
      // TODO: implement real test
    });

    it.skip('think add works without --call flag', async () => {
      // Manual thought addition should work as before
      // TODO: implement real test
    });

    it.skip('think add --call claude works as before', async () => {
      // Existing --call claude usage unchanged
      // TODO: implement real test
    });

    it.skip('think conclude works without changes', async () => {
      // Conclude and promote should work as before
      // TODO: implement real test
    });

    it.skip('think list works without changes', async () => {
      // List documents should work as before
      // TODO: implement real test
    });

    it.skip('think show works without changes', async () => {
      // Show document should work as before
      // TODO: implement real test
    });

    it.skip('think delete works without changes', async () => {
      // Delete document should work as before
      // TODO: implement real test
    });
  });

  describe('memory commands unchanged', () => {
    it.skip('memory write works without changes', async () => {
      // Core memory write unchanged
      // TODO: implement real test
    });

    it.skip('memory read works without changes', async () => {
      // Core memory read unchanged
      // TODO: implement real test
    });

    it.skip('memory search works without changes', async () => {
      // Search functionality unchanged
      // TODO: implement real test
    });

    it.skip('memory semantic works without changes', async () => {
      // Semantic search unchanged
      // TODO: implement real test
    });
  });

  describe('default behaviour preserved', () => {
    it.skip('no hints shown when --non-interactive', async () => {
      // Non-interactive mode still suppresses hints
      // TODO: implement real test
    });

    it.skip('default injection still gotchas-only', async () => {
      // Without config changes, only gotchas injected (US3 backward compat)
      // TODO: implement real test
    });

    it.skip('--call without provider defaults to claude', async () => {
      // Backward compat: --call alone means --call claude
      // TODO: implement real test
    });
  });
});
