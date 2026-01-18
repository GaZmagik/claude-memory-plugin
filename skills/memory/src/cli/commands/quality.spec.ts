/**
 * Tests for CLI Quality Commands
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { cmdHealth, cmdValidate, cmdQuality, cmdAudit, cmdAuditQuick } from './quality.js';
import * as healthModule from '../../quality/health.js';
import * as assessModule from '../../quality/assess.js';
import type { ParsedArgs } from '../parser.js';

describe('cmdHealth', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls checkHealth and returns report', async () => {
    vi.spyOn(healthModule, 'checkHealth').mockResolvedValue({
      status: 'healthy',
      score: 85,
      issues: [],
    } as any);
    vi.spyOn(healthModule, 'formatHealthReport').mockReturnValue('Health: OK');

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdHealth(args);

    expect(result.status).toBe('success');
    expect(healthModule.checkHealth).toHaveBeenCalled();
    expect(result.data).toHaveProperty('formatted');
  });

  it('respects scope positional arg', async () => {
    vi.spyOn(healthModule, 'checkHealth').mockResolvedValue({} as any);
    vi.spyOn(healthModule, 'formatHealthReport').mockReturnValue('');

    const args: ParsedArgs = { positional: ['local'], flags: {} };
    await cmdHealth(args);

    expect(healthModule.checkHealth).toHaveBeenCalledWith(
      expect.objectContaining({
        basePath: expect.stringContaining('.claude/memory'),
      })
    );
  });
});

describe('cmdValidate', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('performs validation (currently delegates to health)', async () => {
    vi.spyOn(healthModule, 'checkHealth').mockResolvedValue({
      status: 'healthy',
      score: 100,
      issues: [],
    } as any);
    vi.spyOn(healthModule, 'formatHealthReport').mockReturnValue('Valid');

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdValidate(args);

    expect(result.status).toBe('success');
    expect(result.data).toHaveProperty('note');
  });
});

describe('cmdQuality', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when id is missing', async () => {
    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdQuality(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Missing required argument: id');
  });

  it('calls assessQuality with id', async () => {
    vi.spyOn(assessModule, 'assessQuality').mockResolvedValue({
      score: 75,
      tier: 1,
      issues: [],
    } as any);

    const args: ParsedArgs = { positional: ['my-memory'], flags: {} };
    const result = await cmdQuality(args);

    expect(result.status).toBe('success');
    expect(assessModule.assessQuality).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'my-memory' })
    );
  });

  it('passes deep flag', async () => {
    vi.spyOn(assessModule, 'assessQuality').mockResolvedValue({
      score: 90,
      tier: 2,
      issues: [],
    } as any);

    const args: ParsedArgs = { positional: ['test-id'], flags: { deep: true } };
    await cmdQuality(args);

    expect(assessModule.assessQuality).toHaveBeenCalledWith(
      expect.objectContaining({ deep: true })
    );
  });
});

describe('cmdAudit', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls auditMemories', async () => {
    vi.spyOn(assessModule, 'auditMemories').mockResolvedValue({
      total: 10,
      passed: 8,
      failed: 2,
      results: [],
    } as any);

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdAudit(args);

    expect(result.status).toBe('success');
    expect(assessModule.auditMemories).toHaveBeenCalled();
  });

  it('passes threshold flag', async () => {
    vi.spyOn(assessModule, 'auditMemories').mockResolvedValue({
      total: 5,
      passed: 5,
      failed: 0,
      results: [],
    } as any);

    const args: ParsedArgs = { positional: [], flags: { threshold: '80' } };
    await cmdAudit(args);

    expect(assessModule.auditMemories).toHaveBeenCalledWith(
      expect.objectContaining({ threshold: 80 })
    );
  });
});

describe('cmdAuditQuick', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls auditMemories with deep=false', async () => {
    vi.spyOn(assessModule, 'auditMemories').mockResolvedValue({
      total: 20,
      passed: 18,
      failed: 2,
      results: [],
    } as any);

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdAuditQuick(args);

    expect(result.status).toBe('success');
    expect(assessModule.auditMemories).toHaveBeenCalledWith(
      expect.objectContaining({ deep: false })
    );
  });
});
