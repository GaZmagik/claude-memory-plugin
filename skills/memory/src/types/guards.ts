/**
 * Type Guards for Runtime Type Safety
 *
 * Provides type guards to replace 'as any' casts with proper type checking.
 */

import type { GraphNode } from '../graph/structure.js';
import type { IndexEntry } from './memory.js';
import { MemoryType } from './enums.js';

/**
 * Type guard for GraphNode
 */
export function isGraphNode(obj: unknown): obj is GraphNode {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    typeof (obj as GraphNode).id === 'string' &&
    'type' in obj &&
    typeof (obj as GraphNode).type === 'string'
  );
}

/**
 * Type guard for external nodes (rule/reminder)
 */
export function isExternalNode(node: GraphNode): node is GraphNode & { type: MemoryType.Rule | MemoryType.Reminder } {
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
