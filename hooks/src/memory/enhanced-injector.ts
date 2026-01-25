/**
 * Enhanced Memory Injector - Multi-type injection with prioritisation
 */
import type { InjectionConfig, HookMultipliers } from '../settings/injection-settings.js';

export type HookType = 'Read' | 'Edit' | 'Write' | 'Bash';

export interface ScoredMemory {
  id: string;
  type: string;
  title: string;
  score: number;
}

export const MEMORY_TYPE_PRIORITY: Record<string, number> = {
  gotcha: 1,
  decision: 2,
  learning: 3,
};

const TOTAL_LIMIT = 10;

export function calculateEffectiveThreshold(
  baseThreshold: number,
  hookType: HookType,
  multipliers: HookMultipliers
): number {
  const multiplier = multipliers[hookType] ?? 1.0;
  return Math.min(1.0, baseThreshold * multiplier);
}

export function prioritiseMemories(memories: ScoredMemory[]): ScoredMemory[] {
  return [...memories].sort((a, b) => {
    const priorityA = MEMORY_TYPE_PRIORITY[a.type] ?? 99;
    const priorityB = MEMORY_TYPE_PRIORITY[b.type] ?? 99;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return b.score - a.score;
  });
}

export function createDeduplicationKey(memoryId: string, type: string): string {
  return `${memoryId}:${type}`;
}

export class InjectionDeduplicator {
  private seen = new Set<string>();

  shouldInject(memoryId: string, type: string): boolean {
    const key = createDeduplicationKey(memoryId, type);
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    return true;
  }

  clear(): void {
    this.seen.clear();
  }

  size(): number {
    return this.seen.size;
  }
}

export const MEMORY_TYPE_ICONS: Record<string, string> = {
  gotcha: '🚨',
  decision: '📋',
  learning: '💡',
};

export function formatMemoryReminder(memories: ScoredMemory[]): string {
  if (memories.length === 0) return '';

  const grouped: Record<string, ScoredMemory[]> = {};
  for (const m of memories) {
    const arr = grouped[m.type] ?? [];
    arr.push(m);
    grouped[m.type] = arr;
  }

  const lines: string[] = [];
  for (const type of Object.keys(MEMORY_TYPE_PRIORITY)) {
    const items = grouped[type];
    if (!items || items.length === 0) continue;
    const icon = MEMORY_TYPE_ICONS[type] ?? '📝';
    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1) + 's';
    lines.push(`${icon} ${typeLabel}:`);
    for (const m of items) {
      lines.push(`  • ${m.title} (${m.id})`);
    }
  }

  return lines.join('\n');
}

export class EnhancedInjector {
  constructor(private config: InjectionConfig) {}

  filterByConfig(memories: ScoredMemory[]): ScoredMemory[] {
    return memories.filter((m) => {
      const typeConfig = this.config.types[m.type as keyof typeof this.config.types];
      return typeConfig?.enabled ?? false;
    });
  }

  filterByThreshold(memories: ScoredMemory[], hookType: HookType): ScoredMemory[] {
    return memories.filter((m) => {
      const typeConfig = this.config.types[m.type as keyof typeof this.config.types];
      if (!typeConfig) return false;
      const effectiveThreshold = calculateEffectiveThreshold(
        typeConfig.threshold,
        hookType,
        this.config.hook_multipliers
      );
      return m.score >= effectiveThreshold;
    });
  }

  applyLimits(memories: ScoredMemory[]): ScoredMemory[] {
    const prioritised = prioritiseMemories(memories);
    const counts: Record<string, number> = { gotcha: 0, decision: 0, learning: 0 };
    const result: ScoredMemory[] = [];

    for (const m of prioritised) {
      if (result.length >= TOTAL_LIMIT) break;
      const typeConfig = this.config.types[m.type as keyof typeof this.config.types];
      const limit = typeConfig?.limit ?? 0;
      if ((counts[m.type] ?? 0) < limit) {
        result.push(m);
        counts[m.type] = (counts[m.type] ?? 0) + 1;
      }
    }

    return result;
  }
}
