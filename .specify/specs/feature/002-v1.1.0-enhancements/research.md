# Research: v1.1.0 Enhancements

**Purpose**: Document technology evaluation and architectural decisions for v1.1.0 features

**Created**: 2026-01-24
**Research Sources**: Codebase analysis, web research, Ollama benchmarking, exploration document

---

## Decision 1: Interactive CLI Prompts Library

**Chosen**: prompts npm package (v2.4.2)

**Rationale**:
- **Type-safe**: First-class TypeScript support with comprehensive type definitions
- **Well-established**: 1M+ weekly downloads, actively maintained since 2018
- **Lightweight**: 20KB vs 500KB for inquirer, minimal dependency tree
- **Non-interactive mode**: Native support via `onCancel` handler and stdin detection
- **Separate streams**: Explicit control over stdout/stderr for hint visibility
- **Documentation**: Excellent examples and API reference

**Alternatives Considered**:

### Option A: inquirer
- **Pros**: More features (autocomplete, password masking), larger ecosystem
- **Cons**:
  - Heavier footprint (500KB vs 20KB)
  - Less TypeScript-friendly (requires @types/inquirer)
  - More complex API for simple use cases
  - Overhead not justified for binary yes/no prompts
- **Why not chosen**: Over-engineered for our needs, adds unnecessary complexity

### Option B: Custom implementation using readline
- **Pros**: No external dependency, full control
- **Cons**:
  - Reinvents wheel (stdin/stdout/stderr handling is complex)
  - Edge cases: EOF handling, signal interrupts, terminal detection
  - Testing complexity (mocking TTY behaviour)
  - Maintenance burden
- **Why not chosen**: Violates library-first principle, prompts is battle-tested

### Option C: cli-confirm or similar micro-libraries
- **Pros**: Even lighter than prompts
- **Cons**:
  - Less comprehensive (only confirm, no text input)
  - Smaller community, less maintained
  - Missing features we may need in future (list selection, validation)
- **Why not chosen**: Prompts provides better long-term flexibility

**Implementation Notes**:
```typescript
import prompts from 'prompts';

// Interactive confirmation
const response = await prompts({
  type: 'confirm',
  name: 'proceed',
  message: 'This thought seems complex. Invoke AI for assistance?',
  initial: false
}, {
  onCancel: () => { throw new Error('User cancelled'); }
});

// Non-interactive mode: skip prompts entirely
if (options.nonInteractive) {
  // Use defaults, no prompts
}
```

**Testing Strategy**: Mock stdin/stdout for unit tests, manual TTY testing for integration

---

## Decision 2: Ollama Model for Auto-Selection

**Chosen**: gemma3:1b as default (configurable via memory.local.md)

**Rationale**: (Based on exploration benchmarking from 2026-01-24)

**Benchmark Results**:

| Model | Response Time | Quality | Notes |
|-------|--------------|---------|-------|
| gemma3:270m | ~1.4s | ❌ Echoes placeholders | Too small for task |
| **gemma3:1b** | **~0.6s** | ✅ Clean JSON, correct | **Recommended** |
| gemma3:4b | ~1.1s | ✅ Clean JSON, correct | Slightly slower, same quality |

**Key Insights**:
1. **Prompt engineering matters more than model size**: Explicit "Respond ONLY with valid JSON" constraint yields reliable results from 1b
2. **Tested selections work correctly**: Security-Auditor for SQL injection ✅, Architect for module structure ✅
3. **Hardware compatibility**: Works on 4th gen i7 + 16GB RAM without GPU
4. **User experience**: ~0.6s is imperceptible, no spinner warning needed for 1b

**Alternatives Considered**:

### Option A: gemma3:4b (current chat default)
- **Pros**: Already configured in most installations, slightly better quality ceiling
- **Cons**:
  - Slower (~1.1s vs ~0.6s) with no quality improvement for this task
  - Larger model = more memory usage
- **Why not chosen**: Performance cost without quality gain

### Option B: gemma3:270m
- **Pros**: Even faster response time
- **Cons**: Too small, echoes placeholders literally, unreliable JSON
- **Why not chosen**: Quality insufficient, would increase heuristic fallback rate

### Option C: User-configured model from memory.local.md
- **Pros**: Flexibility for users with different hardware/preferences
- **Cons**: Adds configuration complexity, potential for incompatible model selection
- **Why not chosen**: Implemented as enhancement - use chat_model from memory.local.md, default to gemma3:1b if not set

**Prompt Engineering Strategy**:
```
You are an AI assistant selector. Analyse this thought and recommend the most appropriate agent/style/model.

Available styles:
- Security-Auditor: [description]
- Architect: [description]
- Devils-Advocate: [description]
...

Available agents:
- test-quality-expert: [description]
...

Available models: haiku, sonnet, opus

Avoid these styles (already used): Pragmatist, Architect

Thought topic: "Should we migrate to microservices?"
Thought content: "Complex trade-off analysis needed..."

Respond ONLY with valid JSON:
{
  "style": "Devils-Advocate",
  "reasoning": "Challenging assumptions about microservices migration"
}
```

**Fallback Strategy**: 15s timeout → circuit breaker after 3 failures → heuristics

---

## Decision 3: Heuristic Fallback Strategy

**Chosen**: Keyword-based pattern matching with conservative defaults

**Rationale**:
- **Instant response**: <100ms fallback when Ollama unavailable/timeout
- **Transparency**: Source indicator shows "(via ollama)" vs "(via heuristics - ollama unavailable)"
- **Graceful degradation**: Users still get intelligent selection without Ollama
- **Circuit breaker**: Skips Ollama after 3 consecutive failures to prevent repeated delays

**Heuristic Rules**:

```typescript
const HEURISTIC_RULES: Array<{ pattern: RegExp; selection: Partial<AutoSelection> }> = [
  {
    pattern: /security|vuln|auth|injection|xss|csrf/i,
    selection: { style: 'Security-Auditor', reasoning: 'Security-related keywords detected' }
  },
  {
    pattern: /architect|design|structure|pattern|module/i,
    selection: { style: 'Architect', reasoning: 'Architectural design keywords detected' }
  },
  {
    pattern: /should we|trade-?off|pros.?cons|versus|vs\b/i,
    selection: { style: 'Devils-Advocate', reasoning: 'Decision-making pattern detected' }
  },
  {
    pattern: /perform|optimi[sz]e|speed|latency|slow|fast/i,
    selection: { style: 'Pragmatist', reasoning: 'Performance-related keywords detected' }
  },
  {
    pattern: /test|coverage|spec|assert|unit|integration/i,
    selection: { agent: 'test-quality-expert', reasoning: 'Testing-related keywords detected' }
  }
];

const DEFAULT_SELECTION = {
  style: 'Architect',
  model: 'haiku',
  reasoning: 'No specific pattern matched, using general-purpose style'
};
```

**Alternatives Considered**:

### Option A: No fallback (require Ollama)
- **Pros**: Simpler implementation, consistent behaviour
- **Cons**: Feature unavailable without Ollama, poor user experience
- **Why not chosen**: Violates graceful degradation principle

### Option B: Random selection
- **Pros**: Ensures diversity
- **Cons**: May select inappropriate style, no reasoning provided, confusing UX
- **Why not chosen**: Unpredictable, defeats purpose of intelligent selection

### Option C: Configurable heuristic rules in memory.local.md
- **Pros**: User customisation, extensibility
- **Cons**: Adds configuration complexity, most users won't customise
- **Why not chosen**: Deferred to v1.2.0, hard-coded rules sufficient for v1.1.0

**Circuit Breaker Logic**:
```typescript
// Track consecutive Ollama failures in session state
let consecutiveFailures = 0;
const CIRCUIT_BREAKER_THRESHOLD = 3;

async function selectWithOllama() {
  if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    // Circuit open, skip Ollama
    return selectViaHeuristics();
  }

  try {
    const result = await ollamaSelection();
    consecutiveFailures = 0; // Reset on success
    return result;
  } catch (error) {
    consecutiveFailures++;
    return selectViaHeuristics();
  }
}
```

---

## Decision 4: Session-Scoped Hint Tracking

**Chosen**: Extend session-cache.ts pattern, per-session tracking only

**Rationale**:
- **Aligns with existing patterns**: Reuses session-cache.ts infrastructure
- **Natural reset**: Hints reset on `/clear` or new session start
- **Progressive disclosure**: Show first N uses (default: 3), then suppress
- **Storage location**: `.claude/session-state/<sessionId>/hints.json`
- **Fail-open**: Corrupted state rebuilds from scratch, defaults to showing hints (prioritises discoverability)

**Data Structure**:
```typescript
interface HintState {
  sessionId: string;
  hints: {
    [hintType: string]: {
      count: number;
      lastShown: string; // ISO timestamp
    }
  };
}

// Example:
{
  "sessionId": "abc-123",
  "hints": {
    "call-ai-assistance": {
      "count": 2,
      "lastShown": "2026-01-24T22:15:00.000Z"
    }
  }
}
```

**Alternatives Considered**:

### Option A: Global persistent hint state across sessions
- **Pros**: User sees hint only once ever, reduces total noise
- **Cons**:
  - Complex state management (where to store? ~/.claude/hint-state.json?)
  - No natural reset mechanism
  - Users may forget feature exists after initial suppression
  - Cross-session tracking feels intrusive
- **Why not chosen**: Adds complexity without clear UX benefit, session-scoped is more predictable

### Option B: No persistence (in-memory only)
- **Pros**: Simplest implementation
- **Cons**: Hints reset on every command invocation (no progressive disclosure)
- **Why not chosen**: Defeats purpose of progressive disclosure

### Option C: Environment variable toggle (MEMORY_HIDE_HINTS=1)
- **Pros**: User control, simple on/off
- **Cons**: Binary choice (always show or always hide), no progressive disclosure
- **Why not chosen**: Less sophisticated than count-based progressive disclosure

**Threshold Configuration**:
```typescript
const DEFAULT_HINT_THRESHOLD = 3;

// Allow per-hint-type thresholds if needed in future
interface HintConfig {
  thresholds: {
    [hintType: string]: number;
  };
}
```

**Implementation Notes**:
- Check hint count before displaying: `if (hintCount < threshold) { showHint(); }`
- Increment count after display: `await incrementHintCount(sessionId, hintType);`
- Reset on session clear: handled automatically by session-state cleanup

---

## Decision 5: Enhanced Injection Configuration

**Chosen**: Opt-in via memory.local.md with conservative defaults

**Rationale**:
- **Backward compatibility**: Default matches current behaviour (gotchas only)
- **Advanced user enablement**: Opt-in for decisions/learnings prevents noise for basic users
- **Per-type configuration**: Separate thresholds and limits for each memory type
- **Hook-type multipliers**: Adjust thresholds based on context (Bash stricter, Edit/Write looser)
- **Performance optimisation**: Single semantic search call with client-side filtering

**Configuration Schema**:
```yaml
injection:
  enabled: true
  types:
    gotcha:
      enabled: true
      threshold: 0.2      # Lower threshold = more results
      limit: 5            # Max gotchas to show
    decision:
      enabled: false      # Opt-in only
      threshold: 0.35     # Higher threshold = more relevant matches required
      limit: 3
    learning:
      enabled: false      # Opt-in only
      threshold: 0.4      # Highest threshold = only most relevant
      limit: 2
  hook_multipliers:       # Adjust thresholds by hook type
    Read: 1.0             # Baseline
    Edit: 0.8             # Looser (show more context when editing)
    Write: 0.8            # Looser (show more context when creating)
    Bash: 1.2             # Stricter (only critical gotchas for commands)
```

**Threshold Rationale**:
- **Gotchas (0.2)**: Low threshold, show warnings liberally
- **Decisions (0.35)**: Medium threshold, only relevant architectural decisions
- **Learnings (0.4)**: High threshold, only highly relevant learnings to avoid noise

**Hook Multiplier Rationale**:
- **Bash (1.2x)**: Commands are risky, only show critical gotchas (0.2 * 1.2 = 0.24)
- **Edit/Write (0.8x)**: More context helpful when modifying files (0.35 * 0.8 = 0.28 for decisions)
- **Read (1.0x)**: Baseline behaviour

**Alternatives Considered**:

### Option A: Always inject all types (no opt-in)
- **Pros**: Simpler configuration, maximum context surfaced
- **Cons**:
  - Overwhelming output (10+ memories per file read)
  - Noise hides critical gotchas
  - Breaks backward compatibility
- **Why not chosen**: Violates user choice, potential for information overload

### Option B: Global injection threshold (single threshold for all types)
- **Pros**: Simpler configuration
- **Cons**:
  - Different memory types have different relevance characteristics
  - Gotchas need liberal threshold, learnings need strict threshold
  - One-size-fits-all doesn't work
- **Why not chosen**: Per-type thresholds provide better control

### Option C: ML-based relevance ranking
- **Pros**: Adaptive thresholds, learns from user behaviour
- **Cons**:
  - Requires training data
  - Adds complexity
  - Unpredictable behaviour
  - Violates YAGNI principle
- **Why not chosen**: Over-engineered for v1.1.0, deferred to future version

**Performance Optimisation**:
```typescript
// GOOD: Single search, client-side filtering
const allResults = await searchMemories(query, basePath);
const gotchas = allResults.filter(m => m.type === 'gotcha' && m.score >= 0.2);
const decisions = allResults.filter(m => m.type === 'decision' && m.score >= 0.35);

// BAD: Multiple searches (3x semantic search calls)
const gotchas = await searchMemories(query, basePath, { type: 'gotcha' });
const decisions = await searchMemories(query, basePath, { type: 'decision' });
const learnings = await searchMemories(query, basePath, { type: 'learning' });
```

**Session Deduplication**:
```typescript
// Cache key: (memoryId, type) tuple
const cacheKey = `${memory.id}:${memory.type}`;
if (sessionCache.has(cacheKey)) {
  continue; // Skip, already shown this session
}
await sessionCache.add(cacheKey);
```

---

## Decision 6: Provider CLI Strategy

**Chosen**: Direct CLI invocation, no abstraction layer

**Rationale** (Constitution P5: Simplicity & YAGNI):
- **Provider diversity**: Each CLI has unique syntax and quirks
- **No common abstraction**: claude --print, codex exec, gemini -o text are fundamentally different
- **Abstraction hides complexity**: Wrapper layer would add indirection without reducing complexity
- **Explicit handling**: Better to document and handle each provider's specifics directly
- **Fail gracefully**: Missing CLI → actionable error with installation instructions

**Provider Command Structures**:

```typescript
interface ProviderConfig {
  command: string;
  args: string[];
  modelFlag: string;
  outputParser: (raw: string) => string;
  supportsAgent?: boolean;
  supportsStyle?: boolean;
  extraFlags?: Record<string, string>;
}

const PROVIDERS: Record<string, ProviderConfig> = {
  claude: {
    command: 'claude',
    args: ['--print', '--no-session-persistence'],
    modelFlag: '--model',
    outputParser: (raw) => raw, // Already clean
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

**Output Parsing**:

```typescript
// Codex: Strip version and workdir headers
function stripCodexHeaders(raw: string): string {
  const lines = raw.split('\n');
  const contentStart = lines.findIndex(l => !l.startsWith('[') && l.trim());
  return lines.slice(contentStart).join('\n').trim();
}

// Gemini: Filter extension loading messages
function filterGeminiNoise(raw: string): string {
  const lines = raw.split('\n');
  return lines
    .filter(l => !l.includes('Loading extension'))
    .filter(l => !l.includes('[Gemini]'))
    .join('\n')
    .trim();
}
```

**Alternatives Considered**:

### Option A: Unified provider abstraction layer
- **Pros**: Single interface for all providers
- **Cons**:
  - Each provider has unique capabilities (--agent only for Claude, --oss only for Codex)
  - Abstraction would need to handle all edge cases
  - Leaky abstraction (provider differences still visible)
  - Violates anti-abstraction principle (Constitution P5)
- **Why not chosen**: Adds complexity without reducing it

### Option B: Plugin system for providers
- **Pros**: Extensible, users can add custom providers
- **Cons**:
  - Over-engineered for 3 providers
  - No clear demand for custom providers
  - Violates YAGNI
- **Why not chosen**: Speculative feature, defer to v1.2.0 if demand emerges

### Option C: HTTP API abstraction (OpenAI-compatible endpoints)
- **Pros**: More portable than CLI
- **Cons**:
  - Requires API keys management
  - Different authentication for each provider
  - CLI is simpler for local usage
  - Doesn't support local models (Codex --oss)
- **Why not chosen**: CLI approach aligns with existing claude CLI usage

**Error Handling**:

```typescript
function checkProviderInstalled(provider: string): boolean {
  try {
    execFileSync('which', [PROVIDERS[provider].command]);
    return true;
  } catch {
    return false;
  }
}

function getInstallInstructions(provider: string): string {
  const instructions = {
    codex: 'Install with: npm i -g @openai/codex',
    gemini: 'Install with: npm i -g @google/gemini-cli'
  };
  return instructions[provider] || `Provider ${provider} not available`;
}
```

---

## Open Questions

### Q1: Should provider CLI invocations have timeout enforcement?
**Status**: RESOLVED

**Decision**: Implement 30s timeout on all provider CLI invocations (FR-045)

**Rationale**: Protects against indefinite hangs from network issues or model loading. 30s is generous enough for most responses while preventing runaway processes. Configurable timeout deferred to v1.2.0.

**Impact**: FR-045 added, T072b (test) and T084b (implementation) added to tasks.md

---

### Q2: Should stdout/stderr from provider CLIs be sanitised?
**Status**: RESOLVED

**Decision**: No sanitisation - pass stdout/stderr through as-is (NFR-010 updated)

**Rationale**: Provider CLIs are responsible for their own output sanitisation. Attempting to sanitise at our layer would create a false sense of security and add maintenance burden with regex patterns. Users who invoke provider CLIs accept responsibility for their output.

**Impact**: NFR-010 clarified in spec.md

**Recommendation**: Trust provider CLIs in v1.1.0, document security considerations

**Impact**: May affect future security audit requirements

---

### Q3: Should circuit breaker state persist across sessions?
**Status**: Deferred to v1.2.0

**Context**: Current spec is session-only. Persistent state could improve UX.

**Trade-offs**:
- **Persistent**: Ollama known-bad → skip immediately in new sessions (better UX)
- **Session-only**: Clean slate each session (more resilient to transient failures)

**Recommendation**: Keep session-only for v1.1.0, gather usage data for v1.2.0 decision

---

### Q4: Should heuristic rules be configurable via memory.local.md?
**Status**: Deferred to v1.2.0

**Context**: Hard-coded rules sufficient for v1.1.0, but extensibility may be valuable

**Trade-offs**:
- **Configurable**: User customisation, project-specific heuristics
- **Hard-coded**: Simpler, consistent behaviour, easier to test

**Recommendation**: Hard-coded in v1.1.0, add configuration in v1.2.0 if user demand exists

---

### Q5: Should --auto support custom Ollama models via config?
**Status**: Implemented via existing chat_model setting

**Resolution**: Use `chat_model` from memory.local.md, default to gemma3:1b if not set

**Implementation**:
```typescript
const autoSelectionModel = settings.chatModel ?? 'gemma3:1b';
```

---

### Q6: Should enhanced injection support custom type priorities?
**Status**: Deferred to v1.2.0

**Context**: Current spec has hard-coded priority (gotcha > decision > learning)

**Trade-offs**:
- **Configurable**: User control over what's most important
- **Hard-coded**: Simpler, sensible default (warnings before context)

**Recommendation**: Hard-coded in v1.1.0, configuration in v1.2.0 if needed

---

## References

### Research Sources

**Codebase Analysis**:
- `skills/memory/src/think/discovery.ts` - Agent/style discovery patterns
- `hooks/src/services/ollama.ts` - Ollama client wrapper
- `hooks/src/memory/gotcha-injector.ts` - Injection pattern
- `skills/memory/src/cli/response.ts` - CLI output formatting
- `skills/memory/src/think/ai-invoke.ts` - CLI invocation patterns
- `hooks/src/session/session-cache.ts` - Session state management

**Web Research**:
- [GitHub - terkelg/prompts](https://github.com/terkelg/prompts) - Interactive CLI prompts
- [Ollama API Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Progressive Disclosure - NN/G](https://www.nngroup.com/articles/progressive-disclosure/)
- [Building CLI apps with TypeScript](https://dev.to/hongminhee/building-cli-apps-with-typescript-in-2026-5c9d)

**Benchmarking**:
- Ollama model testing (2026-01-24) - gemma3:270m/1b/4b comparison
- Prompt engineering validation - JSON constraint testing
- Hardware compatibility testing - 4th gen i7 + 16GB RAM

**Exploration Document**:
- `.specify/specs/explore/v1.1.0-features.md` - Feature intent, suggested prompts, architectural approach

---

**Version**: 1.0.0 | **Created**: 2026-01-24
