/**
 * Tests for confirmation.ts - Interactive confirmation utility
 */

import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { mock } from 'bun:test';
import { confirmDeletion, shouldConfirm } from './confirmation.js';

// Mock prompts library
vi.mock('prompts', () => ({
  default: vi.fn(),
}));

afterAll(() => {
  mock.restore(); // Unmock vi.mock module replacements to prevent cross-test pollution
});

describe('confirmDeletion', () => {
  let mockPrompts: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const promptsModule = await import('prompts');
    mockPrompts = promptsModule.default as unknown as ReturnType<typeof vi.fn>;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('prompts user with agent name and memory count', async () => {
    mockPrompts.mockResolvedValue({ confirmed: true });

    await confirmDeletion('test-agent', 5);

    expect(mockPrompts).toHaveBeenCalledWith({
      type: 'confirm',
      name: 'confirmed',
      message: expect.stringContaining('test-agent'),
      initial: false,
    });

    expect(mockPrompts).toHaveBeenCalledWith({
      type: 'confirm',
      name: 'confirmed',
      message: expect.stringContaining('5'),
      initial: false,
    });
  });

  it('returns true when user confirms', async () => {
    mockPrompts.mockResolvedValue({ confirmed: true });

    const result = await confirmDeletion('agent-name', 10);

    expect(result).toBe(true);
  });

  it('returns false when user declines', async () => {
    mockPrompts.mockResolvedValue({ confirmed: false });

    const result = await confirmDeletion('agent-name', 10);

    expect(result).toBe(false);
  });

  it('returns false when prompt is cancelled (undefined response)', async () => {
    mockPrompts.mockResolvedValue({ confirmed: undefined });

    const result = await confirmDeletion('agent-name', 10);

    expect(result).toBe(false);
  });

  it('defaults to false (initial: false)', async () => {
    mockPrompts.mockResolvedValue({ confirmed: true });

    await confirmDeletion('agent-name', 0);

    expect(mockPrompts).toHaveBeenCalledWith(
      expect.objectContaining({ initial: false })
    );
  });

  it('warns about irreversibility', async () => {
    mockPrompts.mockResolvedValue({ confirmed: true });

    await confirmDeletion('agent-name', 3);

    expect(mockPrompts).toHaveBeenCalledWith({
      type: 'confirm',
      name: 'confirmed',
      message: expect.stringMatching(/cannot be undone|irreversible/i),
      initial: false,
    });
  });

  it('handles zero memories correctly', async () => {
    mockPrompts.mockResolvedValue({ confirmed: true });

    await confirmDeletion('empty-agent', 0);

    expect(mockPrompts).toHaveBeenCalledWith({
      type: 'confirm',
      name: 'confirmed',
      message: expect.stringContaining('0'),
      initial: false,
    });
  });

  it('handles large memory counts correctly', async () => {
    mockPrompts.mockResolvedValue({ confirmed: true });

    await confirmDeletion('large-agent', 1000);

    expect(mockPrompts).toHaveBeenCalledWith({
      type: 'confirm',
      name: 'confirmed',
      message: expect.stringContaining('1000'),
      initial: false,
    });
  });

  it('uses singular form for one memory', async () => {
    mockPrompts.mockResolvedValue({ confirmed: true });

    await confirmDeletion('single-memory-agent', 1);

    expect(mockPrompts).toHaveBeenCalledWith({
      type: 'confirm',
      name: 'confirmed',
      message: expect.stringMatching(/1 memor(y|ies)/i),
      initial: false,
    });
  });
});

describe('shouldConfirm', () => {
  it('returns true when neither force nor dry-run', () => {
    const result = shouldConfirm(false, false);
    expect(result).toBe(true);
  });

  it('returns false when force flag is true', () => {
    const result = shouldConfirm(true, false);
    expect(result).toBe(false);
  });

  it('returns false when dry-run flag is true', () => {
    const result = shouldConfirm(false, true);
    expect(result).toBe(false);
  });

  it('returns false when both force and dry-run are true', () => {
    const result = shouldConfirm(true, true);
    expect(result).toBe(false);
  });
});
