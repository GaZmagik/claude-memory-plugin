/**
 * Type Guards for Runtime Type Safety
 *
 * Provides type guards to replace 'as any' casts with proper type checking.
 */

import type { GraphNode } from '../graph/structure.js';
import type { IndexEntry } from './memory.js';
import { MemoryType, type Scope } from './enums.js';

/**
 * Type guard for GraphNode.
 *
 * MemoryType enum values are strings at runtime, so we validate that `type`
 * is a string and that it matches a known MemoryType value.
 */
export function isGraphNode(obj: unknown): obj is GraphNode {
  if (typeof obj !== 'object' || obj === null) return false;
  const node = obj as Record<string, unknown>;
  return (
    typeof node.id === 'string' &&
    typeof node.type === 'string' &&
    (Object.values(MemoryType) as string[]).includes(node.type)
  );
}

/**
 * External graph nodes have guaranteed non-optional fields
 */
export interface ExternalGraphNode extends GraphNode {
  title: string;
  scope: Scope;
  agent?: string;
  type: MemoryType.Rule | MemoryType.Reminder;
}

/**
 * Type guard for external nodes (rule/reminder)
 */
export function isExternalNode(node: GraphNode): node is ExternalGraphNode {
  return node.type === MemoryType.Rule || node.type === MemoryType.Reminder;
}

/**
 * Type guard for IndexEntry
 */
export function isIndexEntry(obj: unknown): obj is IndexEntry {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'type' in obj &&
    'title' in obj &&
    'tags' in obj &&
    Array.isArray((obj as IndexEntry).tags)
  );
}
