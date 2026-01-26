# Data Model: v1.1.0 Enhancements

**Feature**: 002-v1.1.0-enhancements
**Created**: 2026-01-24

---

## Overview

This document defines the key entities and data structures for v1.1.0 enhancements. These entities extend the existing memory plugin data model without breaking changes.

---

## Entity: HintState

**Description**: Session-scoped tracking of hint display counts for progressive disclosure

**Storage Location**: `.claude/session-state/<sessionId>/hints.json`

**Lifecycle**: Created on first hint display, persists until session cleared

**Fields**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| sessionId | string | Yes | UUID format | Session identifier |
| hints | Record<string, HintEntry> | Yes | - | Map of hint types to display state |

**HintEntry Structure**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| count | number | Yes | >= 0 | Number of times hint has been displayed |
| lastShown | string | Yes | ISO 8601 timestamp | When hint was last displayed |

**Example**:
```json
{
  "sessionId": "abc-def-123",
  "hints": {
    "call-ai-assistance": {
      "count": 2,
      "lastShown": "2026-01-24T22:15:00.000Z"
    },
    "interactive-complex-thought": {
      "count": 1,
      "lastShown": "2026-01-24T22:10:00.000Z"
    }
  }
}
```

**Relationships**:
- **BelongsTo** Session: One HintState per session
- **ResetsWith** Session: Cleared when session cleared

**Operations**:
- `loadHintState(sessionId: string): Promise<HintState>` - Load from disk
- `incrementHintCount(sessionId: string, hintType: string): Promise<void>` - Increment and persist
- `shouldShowHint(sessionId: string, hintType: string, threshold: number): boolean` - Check if hint should display
- `resetHints(sessionId: string): Promise<void>` - Clear all hint counts

**State Transitions**:
```
[Not Shown] → [Shown (count=1)] → [Shown (count=2)] → [Shown (count=3)] → [Suppressed]
```

**Corruption Handling**: If JSON parse fails, rebuild from scratch with empty hints map (fail-open for discoverability)

---

## Entity: AutoSelection

**Description**: AI-recommended agent/style/model combination with reasoning and source attribution

**Storage**: In-memory only (not persisted), returned by auto-selector service

**Lifecycle**: Created during auto-selection process, consumed immediately for invocation

**Fields**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| agent | string | No | Exists in discovery results | Recommended agent name |
| style | string | No | Exists in discovery results | Recommended output style name |
| model | string | No | One of: haiku, sonnet, opus | Recommended Claude model |
| reasoning | string | Yes | Non-empty string | Human-readable explanation |
| source | 'ollama' \| 'heuristics' | Yes | Enum value | Selection method used |

**Validation Rules**:
- At least one of `agent`, `style`, or `model` must be specified
- If `agent` specified, must exist in discovered agents (whitelist validation)
- If `style` specified, must exist in discovered styles (whitelist validation)
- `reasoning` must explain why this selection is appropriate

**Example**:
```typescript
{
  style: 'Security-Auditor',
  model: 'haiku',
  reasoning: 'Security vulnerability keywords detected in thought topic',
  source: 'ollama'
}
```

**Relationships**:
- **References** DiscoveredAgent: Optional agent selection
- **References** DiscoveredStyle: Optional style selection
- **ValidatedAgainst** DiscoveryResults: Whitelist validation

**Operations**:
- `selectViaOllama(topic, thoughtContent, discovered, usedStyles): Promise<AutoSelection>` - AI-powered selection
- `selectViaHeuristics(topic, thoughtContent): AutoSelection` - Keyword-based fallback
- `validateSelection(selection, discovered): boolean` - Whitelist validation

**Source Indicator Format**:
```typescript
const sourceLabel = selection.source === 'ollama'
  ? '(via ollama)'
  : '(via heuristics - ollama unavailable)';

// Display: "Auto-selected (via ollama): --style Security-Auditor. Reasoning: ..."
```

---

## Entity: InjectionConfig

**Description**: User configuration for contextual memory injection by type

**Storage Location**: `.claude/memory.local.md` (YAML frontmatter)

**Lifecycle**: Loaded on hook initialisation, cached per session

**Fields**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| enabled | boolean | No | - | Master switch for all injection (default: true) |
| types | Record<MemoryType, TypeConfig> | No | - | Per-type configuration |
| hook_multipliers | Record<HookType, number> | No | 0.5 - 2.0 | Threshold adjustments by hook type |

**TypeConfig Structure**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| enabled | boolean | No | - | Enable injection for this type |
| threshold | number | No | 0.0 - 1.0 | Minimum relevance score |
| limit | number | No | >= 1 | Maximum memories to inject |

**Default Values**:
```typescript
const DEFAULT_INJECTION_CONFIG: InjectionConfig = {
  enabled: true,
  types: {
    gotcha: {
      enabled: true,
      threshold: 0.2,
      limit: 5
    },
    decision: {
      enabled: false,  // Opt-in
      threshold: 0.35,
      limit: 3
    },
    learning: {
      enabled: false,  // Opt-in
      threshold: 0.4,
      limit: 2
    }
  },
  hook_multipliers: {
    Read: 1.0,
    Edit: 0.8,
    Write: 0.8,
    Bash: 1.2
  }
};
```

**Example YAML** (in memory.local.md):
```yaml
injection:
  enabled: true
  types:
    gotcha:
      enabled: true
      threshold: 0.2
      limit: 5
    decision:
      enabled: true      # Opt-in enabled
      threshold: 0.35
      limit: 3
    learning:
      enabled: false     # Keep disabled
  hook_multipliers:
    Read: 1.0
    Edit: 0.8
    Write: 0.8
    Bash: 1.2
```

**Relationships**:
- **AppliedTo** PostToolUse Hook: Configuration controls hook behaviour
- **MergedWith** Defaults: User values override defaults

**Operations**:
- `loadInjectionConfig(basePath: string): Promise<InjectionConfig>` - Load and merge with defaults
- `getEffectiveThreshold(type: MemoryType, hookType: HookType, config: InjectionConfig): number` - Apply multipliers
- `isTypeEnabled(type: MemoryType, config: InjectionConfig): boolean` - Check if type should be injected

**Effective Threshold Calculation**:
```typescript
const baseThreshold = config.types[memoryType].threshold;
const multiplier = config.hook_multipliers[hookType];
const effectiveThreshold = baseThreshold * multiplier;

// Example: Decision on Bash hook
// 0.35 * 1.2 = 0.42 (stricter)

// Example: Decision on Edit hook
// 0.35 * 0.8 = 0.28 (looser)
```

---

## Entity: ProviderConfig

**Description**: CLI command structure and output parser for each AI provider

**Storage**: Hard-coded in `providers.ts` (not user-configurable in v1.1.0)

**Lifecycle**: Singleton, initialised on module load

**Fields**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| command | string | Yes | Executable name | CLI command to invoke |
| args | string[] | Yes | - | Base arguments for all invocations |
| modelFlag | string | Yes | - | Flag for model selection |
| outputParser | Function | Yes | (raw: string) => string | Output cleaning function |
| supportsAgent | boolean | No | - | Whether provider supports --agent |
| supportsStyle | boolean | No | - | Whether provider supports --style |
| extraFlags | Record<string, string> | No | - | Provider-specific flags (e.g., --oss) |

**Example**:
```typescript
const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  claude: {
    command: 'claude',
    args: ['--print', '--no-session-persistence'],
    modelFlag: '--model',
    outputParser: (raw) => raw,  // Already clean
    supportsAgent: true,
    supportsStyle: true
  },
  codex: {
    command: 'codex',
    args: ['exec'],
    modelFlag: '--model',
    outputParser: stripCodexHeaders,
    extraFlags: { oss: '--oss' }
  },
  gemini: {
    command: 'gemini',
    args: ['-o', 'text'],
    modelFlag: '--model',
    outputParser: filterGeminiNoise
  }
};
```

**Relationships**:
- **UsedBy** AI Invoke Service: Routing provider calls
- **ValidatedBy** Provider Detection: Check CLI installation

**Operations**:
- `buildProviderCommand(provider: string, prompt: string, options: AICallOptions): string[]` - Construct CLI args
- `parseProviderOutput(provider: string, raw: string): string` - Clean output
- `isProviderInstalled(provider: string): boolean` - Check availability

**Output Parser Examples**:
```typescript
// Codex: Strip headers
function stripCodexHeaders(raw: string): string {
  const lines = raw.split('\n');
  const startIndex = lines.findIndex(l => !l.startsWith('[') && l.trim());
  return lines.slice(startIndex).join('\n').trim();
}

// Gemini: Filter extension noise
function filterGeminiNoise(raw: string): string {
  return raw
    .split('\n')
    .filter(l => !l.includes('Loading extension'))
    .filter(l => !l.includes('[Gemini]'))
    .join('\n')
    .trim();
}
```

---

## Entity: MemoryInjectionResult

**Description**: Filtered and prioritised memories for contextual injection

**Storage**: In-memory only (computed per hook invocation)

**Lifecycle**: Created during PostToolUse hook, consumed for display, discarded

**Fields**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| memories | MemoryByType | Yes | - | Memories grouped by type |
| totalCount | number | Yes | >= 0 | Total memories across all types |
| deduplicationHits | number | Yes | >= 0 | Memories skipped due to session cache |

**MemoryByType Structure**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| gotchas | EnrichedMemory[] | Yes | - | Gotcha-type memories |
| decisions | EnrichedMemory[] | Yes | - | Decision-type memories |
| learnings | EnrichedMemory[] | Yes | - | Learning-type memories |

**EnrichedMemory Structure**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| id | string | Yes | - | Memory identifier |
| title | string | Yes | - | Memory title |
| content | string | Yes | - | Memory content |
| type | MemoryType | Yes | Enum value | Memory type |
| score | number | Yes | 0.0 - 1.0 | Relevance score |
| tags | string[] | Yes | - | Memory tags |
| severity | Severity | No | Enum value (gotchas only) | Severity level |

**Example**:
```typescript
{
  memories: {
    gotchas: [
      {
        id: 'gotcha-001',
        title: 'Session cache race condition',
        content: 'Concurrent writes to session cache can corrupt state...',
        type: 'gotcha',
        score: 0.85,
        tags: ['session', 'concurrency'],
        severity: 'high'
      }
    ],
    decisions: [
      {
        id: 'decision-002',
        title: 'Use prompts library for CLI interactions',
        content: 'Decided to use prompts npm package...',
        type: 'decision',
        score: 0.65,
        tags: ['cli', 'dependencies']
      }
    ],
    learnings: []
  },
  totalCount: 2,
  deduplicationHits: 3
}
```

**Priority Sorting**:
```typescript
// Sort order: type priority (gotcha > decision > learning), then score
const typePriority = { gotcha: 0, decision: 1, learning: 2 };

memories.sort((a, b) => {
  const typeDiff = typePriority[a.type] - typePriority[b.type];
  if (typeDiff !== 0) return typeDiff;
  return b.score - a.score;  // Higher score first
});
```

**Hard Limit**: Maximum 10 memories total, regardless of per-type limits

**Formatting**:
```typescript
const TYPE_ICONS = {
  gotcha: '🚨',
  decision: '📋',
  learning: '💡'
};

function formatInjection(result: MemoryInjectionResult): string {
  const lines: string[] = [];

  for (const [type, memories] of Object.entries(result.memories)) {
    for (const memory of memories) {
      const icon = TYPE_ICONS[type];
      lines.push(`${icon} **${memory.title}** (${memory.id})`);
      lines.push(`   Relevance: ${(memory.score * 100).toFixed(0)}%`);
      lines.push('');
    }
  }

  return lines.join('\n');
}
```

---

## Entity: CircuitBreakerState

**Description**: Session-scoped tracking of consecutive Ollama failures for auto-selection

**Storage Location**: In-memory session state (not persisted to disk)

**Lifecycle**: Created on first auto-selection attempt, reset on session clear

**Fields**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| sessionId | string | Yes | UUID format | Session identifier |
| consecutiveFailures | number | Yes | >= 0 | Count of consecutive Ollama failures |
| lastAttempt | string | Yes | ISO 8601 timestamp | When last attempt was made |
| isOpen | boolean | Yes | - | Whether circuit is open (Ollama skipped) |

**Constants**:
```typescript
const CIRCUIT_BREAKER_THRESHOLD = 3;  // Open after 3 failures
```

**Example**:
```typescript
{
  sessionId: 'abc-def-123',
  consecutiveFailures: 2,
  lastAttempt: '2026-01-24T22:20:00.000Z',
  isOpen: false
}
```

**State Transitions**:
```
[Closed (0 failures)] → [Closed (1 failure)] → [Closed (2 failures)]
  → [Open (3 failures)] → [Closed (0 failures, on success)]
```

**Operations**:
- `recordFailure(sessionId: string): void` - Increment failure count
- `recordSuccess(sessionId: string): void` - Reset failure count
- `shouldSkipOllama(sessionId: string): boolean` - Check if circuit is open
- `getCircuitState(sessionId: string): CircuitBreakerState` - Get current state

**Decision Logic**:
```typescript
async function selectWithCircuitBreaker(sessionId: string, ...args): Promise<AutoSelection> {
  const state = getCircuitState(sessionId);

  if (state.isOpen) {
    // Circuit open, skip Ollama
    console.log('[AutoSelector] Circuit breaker open, using heuristics');
    return selectViaHeuristics(...args);
  }

  try {
    const result = await selectViaOllama(...args);
    recordSuccess(sessionId);
    return result;
  } catch (error) {
    recordFailure(sessionId);
    console.log(`[AutoSelector] Ollama failed (${state.consecutiveFailures + 1}/3)`);
    return selectViaHeuristics(...args);
  }
}
```

**Reset Triggers**:
- Session cleared via `/clear`
- Successful Ollama invocation (reset count to 0)
- New session started

---

## Data Flow Diagrams

### Hint Display Flow
```
User invokes command
  → Load HintState from session
  → Check shouldShowHint(type, threshold)
  → If show: Write hint to stderr
  → Increment hint count
  → Persist HintState
  → Write JSON response to stdout
```

### Auto-Selection Flow
```
User invokes `memory think add "..." --auto`
  → Check CircuitBreakerState
  → If open: Use heuristics
  → If closed: Try Ollama (15s timeout)
    → Success: Parse & validate selection
    → Failure: Record failure, use heuristics
  → Display recommendation with source
  → Prompt user for confirmation
  → If approved: Invoke AI with selection
```

### Enhanced Injection Flow
```
PostToolUse hook triggered (Read/Edit/Write/Bash)
  → Load InjectionConfig
  → Determine enabled types
  → Single semantic search for all types
  → Filter by type and threshold (with multiplier)
  → Check session cache for deduplication
  → Sort by priority (type > score)
  → Apply per-type and total limits
  → Format with type-specific icons
  → Return formatted injection
```

### Cross-Provider Calling Flow
```
User invokes `memory think add "..." --call codex --model gpt-5-codex`
  → Parse provider and model
  → Check provider installation
  → Build provider command from ProviderConfig
  → Execute CLI (execFileSync)
  → Parse output with provider-specific parser
  → Format attribution: "model:X provider:Y [session-id]"
  → Return attributed thought
```

---

## Schema Validation

### HintState JSON Schema
```json
{
  "type": "object",
  "required": ["sessionId", "hints"],
  "properties": {
    "sessionId": { "type": "string", "format": "uuid" },
    "hints": {
      "type": "object",
      "patternProperties": {
        "^[a-z-]+$": {
          "type": "object",
          "required": ["count", "lastShown"],
          "properties": {
            "count": { "type": "integer", "minimum": 0 },
            "lastShown": { "type": "string", "format": "date-time" }
          }
        }
      }
    }
  }
}
```

### InjectionConfig YAML Schema
```yaml
type: object
properties:
  injection:
    type: object
    properties:
      enabled:
        type: boolean
      types:
        type: object
        properties:
          gotcha:
            $ref: '#/definitions/TypeConfig'
          decision:
            $ref: '#/definitions/TypeConfig'
          learning:
            $ref: '#/definitions/TypeConfig'
      hook_multipliers:
        type: object
        patternProperties:
          '^(Read|Edit|Write|Bash)$':
            type: number
            minimum: 0.5
            maximum: 2.0

definitions:
  TypeConfig:
    type: object
    properties:
      enabled:
        type: boolean
      threshold:
        type: number
        minimum: 0.0
        maximum: 1.0
      limit:
        type: integer
        minimum: 1
```

---

**Version**: 1.0.0 | **Created**: 2026-01-24
