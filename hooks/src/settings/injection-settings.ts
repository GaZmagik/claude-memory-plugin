/**
 * Injection Settings Parser - Parses InjectionConfig from memory.local.md
 */
import * as fs from 'node:fs';
import * as yaml from 'js-yaml';

export interface TypeConfig {
  enabled: boolean;
  threshold: number;
  limit: number;
}

export interface HookMultipliers {
  Read: number;
  Edit: number;
  Write: number;
  Bash: number;
}

export interface InjectionConfig {
  enabled: boolean;
  types: { gotcha: TypeConfig; decision: TypeConfig; learning: TypeConfig };
  hook_multipliers: HookMultipliers;
}

export const DEFAULT_INJECTION_CONFIG: InjectionConfig = {
  enabled: true,
  types: {
    gotcha: { enabled: true, threshold: 0.2, limit: 5 },
    decision: { enabled: false, threshold: 0.35, limit: 3 },
    learning: { enabled: false, threshold: 0.4, limit: 2 },
  },
  hook_multipliers: { Read: 1.0, Edit: 0.8, Write: 0.8, Bash: 1.2 },
};

function extractFrontmatter(content: string): string | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  return match?.[1] ?? null;
}

function validateThreshold(v: unknown, d: number): number {
  if (typeof v !== 'number' || isNaN(v)) return d;
  return Math.max(0, Math.min(1, v));
}

function validateLimit(v: unknown, d: number): number {
  if (typeof v !== 'number' || isNaN(v)) return d;
  return Math.max(1, Math.floor(v));
}

function validateBoolean(v: unknown, d: boolean): boolean {
  return typeof v === 'boolean' ? v : d;
}

function validateMultiplier(v: unknown, d: number): number {
  return typeof v === 'number' && !isNaN(v) ? v : d;
}

function mergeTypeConfig(input: Partial<TypeConfig> | undefined, defaults: TypeConfig): TypeConfig {
  return {
    enabled: validateBoolean(input?.enabled, defaults.enabled),
    threshold: validateThreshold(input?.threshold, defaults.threshold),
    limit: validateLimit(input?.limit, defaults.limit),
  };
}

/**
 * Load injection config from YAML file.
 * Uses sync fs operations but returns Promise for API consistency with callers.
 * This enables future migration to async operations without API changes.
 * Note: Explicitly returns Promise.resolve() rather than using async keyword
 * to clarify that operations are synchronous (per code review recommendation).
 */
export function parseInjectionConfig(configPath: string): Promise<InjectionConfig> {
  if (!fs.existsSync(configPath)) return Promise.resolve({ ...DEFAULT_INJECTION_CONFIG });
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const fm = extractFrontmatter(content);
    if (!fm) return { ...DEFAULT_INJECTION_CONFIG };
    const parsed = yaml.load(fm) as Record<string, unknown> | null;
    if (!parsed) return { ...DEFAULT_INJECTION_CONFIG };
    const inj = parsed.injection as Record<string, unknown> | undefined;
    if (!inj) return { ...DEFAULT_INJECTION_CONFIG };
    const types = inj.types as Record<string, Partial<TypeConfig>> | undefined;
    const hm = inj.hook_multipliers as Partial<HookMultipliers> | undefined;
    return {
      enabled: validateBoolean(inj.enabled, DEFAULT_INJECTION_CONFIG.enabled),
      types: {
        gotcha: mergeTypeConfig(types?.gotcha, DEFAULT_INJECTION_CONFIG.types.gotcha),
        decision: mergeTypeConfig(types?.decision, DEFAULT_INJECTION_CONFIG.types.decision),
        learning: mergeTypeConfig(types?.learning, DEFAULT_INJECTION_CONFIG.types.learning),
      },
      hook_multipliers: {
        Read: validateMultiplier(hm?.Read, DEFAULT_INJECTION_CONFIG.hook_multipliers.Read),
        Edit: validateMultiplier(hm?.Edit, DEFAULT_INJECTION_CONFIG.hook_multipliers.Edit),
        Write: validateMultiplier(hm?.Write, DEFAULT_INJECTION_CONFIG.hook_multipliers.Write),
        Bash: validateMultiplier(hm?.Bash, DEFAULT_INJECTION_CONFIG.hook_multipliers.Bash),
      },
    };
  } catch {
    return { ...DEFAULT_INJECTION_CONFIG };
  }
}
