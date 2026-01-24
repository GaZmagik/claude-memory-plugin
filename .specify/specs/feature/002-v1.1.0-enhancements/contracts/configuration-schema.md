# Configuration Schema Contract

**Feature**: 002-v1.1.0-enhancements
**Purpose**: Define configuration extensions for enhanced memory injection
**Created**: 2026-01-24

---

## Configuration File

**Location**: `.claude/memory.local.md`

**Format**: YAML frontmatter with Markdown documentation

**Encoding**: UTF-8

**Parsing**: YAML 1.2 compliant

---

## New Configuration Section: injection

**Parent**: Root level of YAML frontmatter

**Type**: Object

**Required**: No (defaults apply if omitted)

**Description**: Controls contextual memory injection behaviour in PostToolUse hooks

### Schema Definition

```yaml
injection:
  enabled: boolean              # Master switch for all injection
  types:                        # Per-type configuration
    gotcha:
      enabled: boolean          # Enable gotcha injection
      threshold: number         # Minimum relevance score (0.0-1.0)
      limit: integer            # Maximum gotchas to inject
    decision:
      enabled: boolean          # Enable decision injection
      threshold: number         # Minimum relevance score (0.0-1.0)
      limit: integer            # Maximum decisions to inject
    learning:
      enabled: boolean          # Enable learning injection
      threshold: number         # Minimum relevance score (0.0-1.0)
      limit: integer            # Maximum learnings to inject
  hook_multipliers:             # Threshold adjustments by hook type
    Read: number                # Multiplier for Read hook (0.5-2.0)
    Edit: number                # Multiplier for Edit hook (0.5-2.0)
    Write: number               # Multiplier for Write hook (0.5-2.0)
    Bash: number                # Multiplier for Bash hook (0.5-2.0)
```

---

## Default Values

```yaml
injection:
  enabled: true
  types:
    gotcha:
      enabled: true
      threshold: 0.2
      limit: 5
    decision:
      enabled: false          # Opt-in only
      threshold: 0.35
      limit: 3
    learning:
      enabled: false          # Opt-in only
      threshold: 0.4
      limit: 2
  hook_multipliers:
    Read: 1.0
    Edit: 0.8
    Write: 0.8
    Bash: 1.2
```

**Rationale for Defaults**:
- **gotcha.enabled: true** - Preserves existing behaviour (backward compatibility)
- **decision.enabled: false** - Opt-in to avoid overwhelming users with context
- **learning.enabled: false** - Opt-in to avoid overwhelming users with context
- **gotcha.threshold: 0.2** - Low threshold, liberal gotcha display
- **decision.threshold: 0.35** - Medium threshold, relevant decisions only
- **learning.threshold: 0.4** - High threshold, highly relevant learnings only
- **Read multiplier: 1.0** - Baseline behaviour
- **Edit/Write multiplier: 0.8** - More context helpful when modifying files
- **Bash multiplier: 1.2** - Stricter threshold for commands (only critical gotchas)

---

## Field Specifications

### injection.enabled

**Type**: `boolean`

**Required**: No

**Default**: `true`

**Description**: Master switch to enable or disable all memory injection

**Behaviour**:
- `true`: Memory injection enabled, respects per-type settings
- `false`: All memory injection disabled globally (overrides per-type settings)

**Example**:
```yaml
injection:
  enabled: false  # Disable all injection
```

**Use Case**: Temporarily disable injection for performance testing or troubleshooting

---

### injection.types.<type>.enabled

**Type**: `boolean`

**Required**: No

**Default**:
- `gotcha`: `true`
- `decision`: `false`
- `learning`: `false`

**Description**: Enable or disable injection for specific memory type

**Behaviour**:
- Only enabled types are included in injection queries
- Disabled types are filtered out even if semantic search returns results

**Example**:
```yaml
injection:
  types:
    gotcha:
      enabled: true
    decision:
      enabled: true   # Opt-in to decision injection
    learning:
      enabled: false  # Keep learnings disabled
```

**Validation**:
- Must be boolean value (not string "true"/"false")
- Invalid values default to `false` with warning logged

---

### injection.types.<type>.threshold

**Type**: `number` (float)

**Required**: No

**Default**:
- `gotcha`: `0.2`
- `decision`: `0.35`
- `learning`: `0.4`

**Range**: `0.0` to `1.0` (inclusive)

**Description**: Minimum relevance score required for memory to be injected

**Behaviour**:
- Memories with `score < threshold` are filtered out
- Threshold is multiplied by hook_multiplier before comparison
- Effective threshold = `base_threshold * hook_multiplier`

**Example**:
```yaml
injection:
  types:
    gotcha:
      threshold: 0.15   # Very liberal (show more gotchas)
    decision:
      threshold: 0.5    # Very strict (only highly relevant decisions)
```

**Validation**:
- Must be numeric value between 0.0 and 1.0
- Values < 0.0 are clamped to 0.0
- Values > 1.0 are clamped to 1.0
- Non-numeric values default to type-specific default with warning

**Semantic Search Scores**:
- `0.8 - 1.0`: Highly relevant (exact match, same file/tag)
- `0.5 - 0.8`: Relevant (related topic, similar tags)
- `0.3 - 0.5`: Somewhat relevant (keyword overlap)
- `0.0 - 0.3`: Weakly relevant (distant connection)

**Recommended Ranges by Type**:
- Gotchas: `0.15 - 0.25` (liberal, show warnings proactively)
- Decisions: `0.3 - 0.4` (moderate, relevant architectural context)
- Learnings: `0.35 - 0.5` (strict, only highly applicable learnings)

---

### injection.types.<type>.limit

**Type**: `integer`

**Required**: No

**Default**:
- `gotcha`: `5`
- `decision`: `3`
- `learning`: `2`

**Range**: `>= 1` (minimum 1)

**Description**: Maximum number of memories of this type to inject per hook invocation

**Behaviour**:
- After filtering by threshold, take top N memories by score
- Per-type limits apply independently
- Hard total limit of 10 memories enforced across all types

**Example**:
```yaml
injection:
  types:
    gotcha:
      limit: 3   # Show up to 3 gotchas
    decision:
      limit: 5   # Show up to 5 decisions
    learning:
      limit: 2   # Show up to 2 learnings
```

**Validation**:
- Must be positive integer >= 1
- Values < 1 default to 1 with warning
- Non-integer values rounded down

**Hard Total Limit**:
- Regardless of per-type limits, max 10 memories total
- Priority: gotchas > decisions > learnings
- Example: 5 gotchas + 3 decisions + 2 learnings = 10 total
- Example: 10 high-relevance gotchas → only gotchas shown (per-type limit 5, but total limit 10 allows more if no other types)

---

### injection.hook_multipliers.<HookType>

**Type**: `number` (float)

**Required**: No

**Default**:
- `Read`: `1.0`
- `Edit`: `0.8`
- `Write`: `0.8`
- `Bash`: `1.2`

**Range**: `0.5` to `2.0` (recommended)

**Description**: Multiplier applied to thresholds based on hook type

**Behaviour**:
- Effective threshold = `base_threshold * hook_multiplier`
- Multiplier < 1.0: Looser threshold (show more memories)
- Multiplier > 1.0: Stricter threshold (show fewer memories)
- Multiplier = 1.0: Baseline (no adjustment)

**Example**:
```yaml
injection:
  hook_multipliers:
    Read: 1.0    # Baseline for reading files
    Edit: 0.7    # Show more context when editing
    Write: 0.7   # Show more context when creating files
    Bash: 1.5    # Show only critical gotchas for commands
```

**Calculation Example**:
```typescript
// Decision with threshold 0.35 on Bash hook (multiplier 1.2)
const effectiveThreshold = 0.35 * 1.2 = 0.42

// Decision with threshold 0.35 on Edit hook (multiplier 0.8)
const effectiveThreshold = 0.35 * 0.8 = 0.28
```

**Validation**:
- Must be numeric value
- Values outside 0.5-2.0 accepted but generate warning (extreme multipliers)
- Non-numeric values default to 1.0 with warning

**Rationale by Hook Type**:
- **Read (1.0)**: Baseline - balanced context when reading code
- **Edit (0.8)**: Looser - more context helpful when modifying files
- **Write (0.8)**: Looser - more context helpful when creating files
- **Bash (1.2)**: Stricter - only critical gotchas for potentially dangerous commands

---

## Configuration Examples

### Example 1: Default Configuration (Backward Compatible)

```yaml
---
enabled: true
ollama_host: http://localhost:11434
chat_model: gemma3:4b
embedding_model: embeddinggemma:latest

# No injection config = defaults apply
---

# Memory Plugin Configuration
# Gotchas injected only (existing behaviour)
```

**Result**: Only gotchas injected, decisions and learnings disabled

---

### Example 2: Enable All Memory Types

```yaml
---
enabled: true
ollama_host: http://localhost:11434
chat_model: gemma3:4b
embedding_model: embeddinggemma:latest

injection:
  enabled: true
  types:
    gotcha:
      enabled: true
      threshold: 0.2
      limit: 5
    decision:
      enabled: true      # Opt-in
      threshold: 0.35
      limit: 3
    learning:
      enabled: true      # Opt-in
      threshold: 0.4
      limit: 2
  hook_multipliers:
    Read: 1.0
    Edit: 0.8
    Write: 0.8
    Bash: 1.2
---

# Memory Plugin Configuration
# All memory types injected with recommended settings
```

**Result**: Gotchas, decisions, and learnings all injected according to thresholds

---

### Example 3: Strict Injection (Decisions Only)

```yaml
---
enabled: true
ollama_host: http://localhost:11434
chat_model: gemma3:4b
embedding_model: embeddinggemma:latest

injection:
  enabled: true
  types:
    gotcha:
      enabled: false     # Disable gotchas
    decision:
      enabled: true
      threshold: 0.5     # Very strict threshold
      limit: 2           # Minimal context
    learning:
      enabled: false
  hook_multipliers:
    Read: 1.0
    Edit: 1.0
    Write: 1.0
    Bash: 1.0
---

# Memory Plugin Configuration
# Only highly relevant decisions injected
```

**Result**: Only decisions with relevance >= 0.5 shown, max 2 per hook

---

### Example 4: Liberal Injection (Maximum Context)

```yaml
---
enabled: true
ollama_host: http://localhost:11434
chat_model: gemma3:4b
embedding_model: embeddinggemma:latest

injection:
  enabled: true
  types:
    gotcha:
      enabled: true
      threshold: 0.15    # Very liberal
      limit: 8
    decision:
      enabled: true
      threshold: 0.25    # Liberal
      limit: 5
    learning:
      enabled: true
      threshold: 0.3     # Moderate
      limit: 3
  hook_multipliers:
    Read: 0.9
    Edit: 0.7          # Very liberal for edits
    Write: 0.7
    Bash: 1.0          # Still baseline for commands
---

# Memory Plugin Configuration
# Maximum context surfacing
```

**Result**: Many memories shown (limited by hard cap of 10 total)

---

### Example 5: Disable All Injection

```yaml
---
enabled: true
ollama_host: http://localhost:11434
chat_model: gemma3:4b
embedding_model: embeddinggemma:latest

injection:
  enabled: false       # Master switch off
---

# Memory Plugin Configuration
# Memory injection completely disabled
```

**Result**: No memories injected regardless of per-type settings

---

## Configuration Validation

### Load Process

1. **Read file**: `.claude/memory.local.md`
2. **Extract YAML frontmatter**: Between `---` delimiters
3. **Parse YAML**: Using js-yaml library
4. **Merge with defaults**: User values override defaults
5. **Validate fields**: Type checking, range validation
6. **Apply corrections**: Clamp out-of-range values, apply defaults for invalid values
7. **Log warnings**: Non-fatal validation issues
8. **Return config**: Validated and corrected configuration object

### Validation Rules

**Type Validation**:
```typescript
// Boolean fields
if (typeof value !== 'boolean') {
  console.warn(`Invalid boolean value for ${field}: ${value}. Using default: ${defaultValue}`);
  value = defaultValue;
}

// Numeric fields (threshold)
if (typeof value !== 'number' || isNaN(value)) {
  console.warn(`Invalid numeric value for ${field}: ${value}. Using default: ${defaultValue}`);
  value = defaultValue;
} else if (value < 0.0) {
  console.warn(`Threshold ${field} < 0.0, clamping to 0.0`);
  value = 0.0;
} else if (value > 1.0) {
  console.warn(`Threshold ${field} > 1.0, clamping to 1.0`);
  value = 1.0;
}

// Integer fields (limit)
if (typeof value !== 'number' || !Number.isInteger(value)) {
  console.warn(`Invalid integer value for ${field}: ${value}. Using default: ${defaultValue}`);
  value = defaultValue;
} else if (value < 1) {
  console.warn(`Limit ${field} < 1, setting to 1`);
  value = 1;
}

// Multiplier fields
if (typeof value !== 'number' || isNaN(value)) {
  console.warn(`Invalid multiplier for ${field}: ${value}. Using default: 1.0`);
  value = 1.0;
} else if (value < 0.5 || value > 2.0) {
  console.warn(`Multiplier ${field} outside recommended range (0.5-2.0): ${value}`);
  // Accept but warn
}
```

**Missing Fields**:
- Use default value
- No warning (defaults are expected)

**Unknown Fields**:
- Ignore silently
- Future compatibility (new fields may be added)

### Error Handling

**File Not Found**:
- Not an error, use all defaults
- User doesn't need config file for basic usage

**YAML Parse Error**:
- Log warning with line number
- Use all defaults
- Continue operation (graceful degradation)

**Invalid YAML Structure**:
- Use defaults for invalid sections
- Log warning with field path
- Continue operation

**Example Warning Messages**:
```
[Memory Plugin] Warning: Invalid threshold for injection.types.gotcha.threshold: "high". Using default: 0.2
[Memory Plugin] Warning: injection.types.decision.limit < 1, setting to 1
[Memory Plugin] Warning: injection.hook_multipliers.Bash outside recommended range (0.5-2.0): 3.0
[Memory Plugin] Config parse error in .claude/memory.local.md: Unexpected character at line 15. Using defaults.
```

---

## Configuration Documentation

**Location**: `.claude/memory.example.md` (to be updated)

**New Section to Add**:

```markdown
## Enhanced Memory Injection

Control which types of memories are surfaced during Read/Edit/Write/Bash operations.

### Configuration

```yaml
injection:
  enabled: true
  types:
    gotcha:
      enabled: true       # Show gotchas (warnings/gotchas)
      threshold: 0.2      # Minimum relevance score
      limit: 5            # Max gotchas to show
    decision:
      enabled: false      # Opt-in: Show architectural decisions
      threshold: 0.35
      limit: 3
    learning:
      enabled: false      # Opt-in: Show learnings
      threshold: 0.4
      limit: 2
  hook_multipliers:
    Read: 1.0             # Baseline for reading files
    Edit: 0.8             # Show more context when editing
    Write: 0.8            # Show more context when creating
    Bash: 1.2             # Show only critical gotchas for commands
```

### Opt-In Instructions

To enable decision and learning injection:

1. Copy `.claude/memory.example.md` to `.claude/memory.local.md`
2. Set `injection.types.decision.enabled: true`
3. Set `injection.types.learning.enabled: true`
4. Adjust thresholds and limits as needed
5. Restart Claude Code

### Threshold Guide

- **0.15-0.25**: Liberal (show many memories, may include some noise)
- **0.3-0.4**: Moderate (balanced relevance)
- **0.45-0.6**: Strict (only highly relevant memories)

### Hook Multipliers

Adjust thresholds based on operation type:

- **< 1.0**: Looser threshold (show more context)
- **1.0**: Baseline (no adjustment)
- **> 1.0**: Stricter threshold (show less context)

Recommended: Keep Bash multiplier >= 1.0 to avoid overwhelming command-line operations with context.
```

---

## TypeScript Interface

```typescript
/**
 * Injection configuration from memory.local.md
 */
interface InjectionConfig {
  enabled: boolean;
  types: {
    gotcha: TypeConfig;
    decision: TypeConfig;
    learning: TypeConfig;
  };
  hook_multipliers: {
    Read: number;
    Edit: number;
    Write: number;
    Bash: number;
  };
}

/**
 * Per-type injection configuration
 */
interface TypeConfig {
  enabled: boolean;
  threshold: number;
  limit: number;
}

/**
 * Default injection configuration
 */
const DEFAULT_INJECTION_CONFIG: InjectionConfig = {
  enabled: true,
  types: {
    gotcha: {
      enabled: true,
      threshold: 0.2,
      limit: 5
    },
    decision: {
      enabled: false,
      threshold: 0.35,
      limit: 3
    },
    learning: {
      enabled: false,
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

---

## Migration Guide

### From v1.0.x to v1.1.0

**No changes required** - default behaviour matches v1.0.x (gotchas only)

**To enable new features**:

1. Create or edit `.claude/memory.local.md`
2. Add `injection` section to YAML frontmatter
3. Enable desired memory types
4. Restart Claude Code

**Example Migration**:

Before (v1.0.x):
```yaml
---
enabled: true
ollama_host: http://localhost:11434
---
```

After (v1.1.0 with enhanced injection):
```yaml
---
enabled: true
ollama_host: http://localhost:11434

injection:
  enabled: true
  types:
    gotcha:
      enabled: true
    decision:
      enabled: true    # New: Enable decision injection
    learning:
      enabled: true    # New: Enable learning injection
---
```

**Rollback**: Remove `injection` section or set `injection.enabled: false`

---

**Version**: 1.0.0 | **Created**: 2026-01-24
