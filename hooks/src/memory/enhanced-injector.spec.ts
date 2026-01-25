/**
 * Co-located tests - main tests in tests/unit/memory/
 */
import { describe, it, expect } from 'vitest';
import { EnhancedInjector, calculateEffectiveThreshold, prioritiseMemories, MEMORY_TYPE_PRIORITY, InjectionDeduplicator, createDeduplicationKey, MEMORY_TYPE_ICONS, formatMemoryReminder } from './enhanced-injector.js';

describe('enhanced-injector exports', () => {
  it('exports EnhancedInjector', () => expect(EnhancedInjector).toBeDefined());
  it('exports calculateEffectiveThreshold', () => expect(calculateEffectiveThreshold).toBeDefined());
  it('exports prioritiseMemories', () => expect(prioritiseMemories).toBeDefined());
  it('exports MEMORY_TYPE_PRIORITY', () => expect(MEMORY_TYPE_PRIORITY).toBeDefined());
  it('exports InjectionDeduplicator', () => expect(InjectionDeduplicator).toBeDefined());
  it('exports createDeduplicationKey', () => expect(createDeduplicationKey).toBeDefined());
  it('exports MEMORY_TYPE_ICONS', () => expect(MEMORY_TYPE_ICONS).toBeDefined());
  it('exports formatMemoryReminder', () => expect(formatMemoryReminder).toBeDefined());
});
