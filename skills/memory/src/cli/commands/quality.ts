/**
 * CLI Commands: Quality Operations
 *
 * Handlers for health, validate, quality, audit, audit-quick commands.
 */

import * as os from 'node:os';
import * as path from 'node:path';
import type { ParsedArgs } from '../parser.js';
import { getFlagString, getFlagBool, getFlagNumber } from '../parser.js';
import type { CliResponse } from '../response.js';
import { error, wrapOperation } from '../response.js';
import { Scope } from '../../types/enums.js';
import { checkHealth, formatHealthReport } from '../../quality/health.js';
import { assessQuality, auditMemories } from '../../quality/assess.js';
import { getScopePath } from '../../scope/resolver.js';

/**
 * Get global memory path
 */
function getGlobalMemoryPath(): string {
  return path.join(os.homedir(), '.claude', 'memory');
}

/**
 * Get resolved scope path
 */
function getResolvedScopePath(scope: Scope): string {
  const cwd = process.cwd();
  const globalPath = getGlobalMemoryPath();
  return getScopePath(scope, cwd, globalPath);
}

/**
 * Parse scope string to Scope enum
 */
function parseScope(scopeStr: string | undefined): Scope {
  switch (scopeStr?.toLowerCase()) {
    case 'user':
    case 'global':
      return Scope.Global;
    case 'project':
      return Scope.Project;
    case 'local':
      return Scope.Local;
    case 'enterprise':
      return Scope.Enterprise;
    default:
      return Scope.Project;
  }
}

/**
 * health - Quick health check with score
 *
 * Usage: memory health [scope]
 */
export async function cmdHealth(args: ParsedArgs): Promise<CliResponse> {
  const scopeArg = args.positional[0];
  const scope = parseScope(scopeArg ?? getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);

  return wrapOperation(
    async () => {
      const report = await checkHealth({ basePath });
      return {
        ...report,
        formatted: formatHealthReport(report),
      };
    },
    'Health check complete'
  );
}

/**
 * validate - Detailed validation with issue detection
 *
 * Usage: memory validate [scope]
 *
 * Note: This is a more comprehensive check than health.
 * Currently delegates to health - full implementation in Phase 3.
 */
export async function cmdValidate(args: ParsedArgs): Promise<CliResponse> {
  const scopeArg = args.positional[0];
  const scope = parseScope(scopeArg ?? getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);

  return wrapOperation(
    async () => {
      // For now, use health check - full validate implementation in Phase 3
      const report = await checkHealth({ basePath });
      return {
        ...report,
        formatted: formatHealthReport(report),
        note: 'Full validation implementation pending',
      };
    },
    'Validation complete'
  );
}

/**
 * quality - Assess quality score for a single memory
 *
 * Usage: memory quality <id> [--deep] [--scope <scope>]
 *
 * Performs quality assessment on a single memory.
 * --deep enables LLM-powered checks (tier 2/3).
 */
export async function cmdQuality(args: ParsedArgs): Promise<CliResponse> {
  const id = args.positional[0];

  if (!id) {
    return error('Missing required argument: id');
  }

  const scope = parseScope(getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);
  const deep = getFlagBool(args.flags, 'deep') ?? false;

  return wrapOperation(
    async () => {
      const result = await assessQuality({ id, basePath, deep });
      return result;
    },
    `Quality assessment for ${id}`
  );
}

/**
 * audit - Bulk quality scan
 *
 * Usage: memory audit [scope] [--threshold <n>] [--deep]
 *
 * Scans all memories and reports those below the threshold score.
 * --deep enables LLM-powered checks (slower).
 */
export async function cmdAudit(args: ParsedArgs): Promise<CliResponse> {
  const scopeArg = args.positional[0];
  const scope = parseScope(scopeArg ?? getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);
  const threshold = getFlagNumber(args.flags, 'threshold') ?? 70;
  const deep = getFlagBool(args.flags, 'deep') ?? false;

  return wrapOperation(
    async () => {
      const result = await auditMemories({ basePath, threshold, deep });
      return result;
    },
    `Audit complete for ${scopeArg ?? 'project'} scope`
  );
}

/**
 * audit-quick - Fast deterministic-only audit
 *
 * Usage: memory audit-quick [scope] [--threshold <n>]
 *
 * Like audit but skips LLM checks for faster execution.
 */
export async function cmdAuditQuick(args: ParsedArgs): Promise<CliResponse> {
  const scopeArg = args.positional[0];
  const scope = parseScope(scopeArg ?? getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);
  const threshold = getFlagNumber(args.flags, 'threshold') ?? 70;

  return wrapOperation(
    async () => {
      // Same as audit but with deep=false (default)
      const result = await auditMemories({ basePath, threshold, deep: false });
      return result;
    },
    `Quick audit complete for ${scopeArg ?? 'project'} scope`
  );
}
