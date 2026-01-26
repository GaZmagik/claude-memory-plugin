# Implementation Plan: v1.1.0 Enhancements

**Feature**: 002-v1.1.0-enhancements
**Branch**: feature/002-v1.1.0-enhancements
**Created**: 2026-01-24
**Status**: Draft

---

## Executive Summary

This plan details the implementation of four complementary enhancements to the memory plugin that improve discoverability, automation, and contextual awareness:

1. **Enhanced Hint Visibility (US1)** - Progressive disclosure of CLI hints via stderr, interactive prompts for complex thoughts
2. **Auto-Selection with --auto Flag (US2)** - AI-powered agent/style/model selection using Ollama with heuristic fallback
3. **Enhanced Memory Injection (US3)** - Extend PostToolUse hook to surface decisions and learnings, not just gotchas
4. **Cross-Provider Agent Calling (US4)** - Support for Codex and Gemini CLIs alongside Claude

**Total Estimated Effort**: 8-12 days across 4 phases

---

## Technical Context

### Technology Stack

**Core Technologies**:
- TypeScript with Bun runtime (existing)
- Ollama integration via ollama-js library (existing)
- Session state management (existing pattern)
- Direct CLI invocation (no abstraction layers)

**New Dependencies**:
- `prompts` (npm) - Interactive CLI prompts with stdin/stdout/stderr control
  - **Version**: ^2.4.2 (latest stable)
  - **Rationale**: Type-safe, 1M+ weekly downloads, non-interactive mode support
  - **Alternative considered**: inquirer (rejected - heavier, less TypeScript-friendly)

**Existing Services to Extend**:
- `skills/memory/src/think/discovery.ts` - Agent/style enumeration
- `hooks/src/services/ollama.ts` - Ollama client wrapper
- `hooks/src/memory/gotcha-injector.ts` - Contextual memory injection
- `skills/memory/src/cli/response.ts` - CLI output formatting
- `hooks/src/session/session-cache.ts` - Session-scoped state

### Architecture Approach

**Library-First Design** (Constitution P1, P5):
- Direct use of prompts package (no wrapper abstractions)
- Extend existing Ollama service (no new client layers)
- Reuse session cache patterns (no new tracking mechanisms)
- Direct CLI invocation for providers (no provider abstraction layer)

**Extend Existing Patterns**:
- Hint tracking uses session cache pattern from `session-cache.ts`
- Enhanced injection extends `gotcha-injector.ts` pattern
- Provider calling extends `ai-invoke.ts` execution model
- Auto-selection integrates with `discovery.ts` and `ollama.ts`

**Performance Characteristics**:
| Feature | Target Latency | Fallback Strategy |
|---------|----------------|-------------------|
| Hint display | <10ms | N/A (synchronous) |
| Auto-selection (Ollama) | <1s (gemma3:1b) | Heuristics in <100ms |
| Enhanced injection | <100ms | Degrade to gotchas only |
| Provider calling | Variable (external CLI) | Graceful error with instructions |

---

## Constitution Check

| Article | Status | Notes |
|---------|--------|-------|
| P1: Plugin Architecture Compliance | ✅ Pass | All changes within existing plugin structure |
| P2: Test-First Development | ✅ Pass | TDD workflow enforced (tests before implementation) |
| P3: GitHub Flow Discipline | ✅ Pass | Feature branch already created |
| P4: Observability & Debuggability | ✅ Pass | JSON output preserved, hints to stderr, logging added |
| P5: Simplicity & YAGNI | ✅ Pass | Solving documented problems, no speculative features |
| P6: Semantic Versioning | ✅ Pass | Minor version bump (1.0.8 → 1.1.0) - new features, backward compatible |

**No violations detected**. All enhancements align with constitutional principles.

---

## Phase 0: Research

See [research.md](./research.md) for full research findings.

**Key Technology Decisions**:

### Decision 1: Prompts Library for Interactive CLI
**Chosen**: `prompts` npm package v2.4.2

**Rationale**:
- Type-safe with TypeScript support out-of-the-box
- 1M+ weekly downloads, well-maintained
- Native non-interactive mode support via `onCancel` and stdin handling
- Lightweight (no heavy dependencies)
- Separate stdout/stderr control (critical for hint visibility)

**Alternatives Considered**:
- **inquirer**: More features but heavier, less TypeScript-friendly, 500KB vs 20KB
- **Custom implementation**: Reinvents wheel, stdin/stdout/stderr handling is complex

### Decision 2: Ollama Model for Auto-Selection
**Chosen**: gemma3:1b as default

**Rationale**: (from exploration research)
- Response time: ~0.6s with proper prompt engineering
- Quality: Reliable JSON output with explicit prompt constraints
- Tested selections: Security-Auditor for SQL injection ✅, Architect for module structure ✅
- Hardware compatibility: Works on 4th gen i7 + 16GB RAM

**Alternatives Considered**:
- **gemma3:270m**: Too small, echoes placeholders literally
- **gemma3:4b**: Slightly slower (~1.1s), same quality, current default for chat
- **User-configured model**: Allow override via memory.local.md

**Key Insight**: Prompt engineering matters more than model size. Explicit "Respond ONLY with valid JSON" constraint yields reliable results.

### Decision 3: Heuristic Fallback Strategy
**Chosen**: Keyword-based pattern matching with conservative defaults

**Rationale**:
- Instant fallback (<100ms) when Ollama unavailable/timeout
- Transparent source indicator: "(via ollama)" vs "(via heuristics - ollama unavailable)"
- Circuit breaker after 3 consecutive failures prevents repeated delays

**Heuristic Rules**:
```typescript
{
  /security|vuln|auth|injection/i: { style: 'Security-Auditor' },
  /architect|design|structure|pattern/i: { style: 'Architect' },
  /should we|trade-?off|pros.?cons|versus|vs\b/i: { style: 'Devils-Advocate' },
  /perform|optimi[sz]e|speed|latency|slow/i: { style: 'Pragmatist' },
  /test|coverage|spec|assert/i: { agent: 'test-quality-expert' },
  default: { style: 'Architect', model: 'haiku' }
}
```

### Decision 4: Session-Scoped Hint Tracking
**Chosen**: Extend session-cache.ts pattern, per-session tracking only

**Rationale**:
- Aligns with existing session state pattern
- No cross-session persistence complexity
- Natural reset on `/clear` or new session
- Progressive disclosure: show first 3 times, then suppress

**Alternative Considered**: Global persistent hint state across sessions (rejected - adds complexity without clear UX benefit)

### Decision 5: Enhanced Injection Configuration
**Chosen**: Opt-in via memory.local.md, conservative defaults

**Rationale**:
- Backward compatibility: default matches current behaviour (gotchas only)
- Advanced users can enable decisions/learnings
- Per-type thresholds prevent noise: gotchas (0.2), decisions (0.35), learnings (0.4)
- Hook-type multipliers: Bash (1.2x stricter), Edit/Write (0.8x looser)

**Performance Optimisation**: Single semantic search call with client-side filtering (not 3 separate searches)

### Decision 6: Provider CLI Strategy
**Chosen**: Direct CLI invocation, no abstraction layer

**Rationale** (Constitution P5: Anti-Abstraction):
- Each provider has unique syntax: claude --print, codex exec, gemini -o text
- Abstraction layer would hide complexity without reducing it
- Better to explicitly handle each provider's quirks
- Fail gracefully with installation instructions

**Provider Command Structures**:
```typescript
claude: ['--print', '--no-session-persistence', '--model', model, prompt]
codex: ['exec', prompt, '--model', model] // + '--oss' for local models
gemini: [prompt, '--model', model, '-o', 'text']
```

---

## Phase 1: Design

### Data Model

See [data-model.md](./data-model.md) for full entity definitions.

**Key Entities**:

1. **HintState** - Session-scoped hint display tracking
2. **AutoSelection** - AI-recommended agent/style/model with reasoning
3. **InjectionConfig** - User configuration for memory type injection
4. **ProviderConfig** - CLI command structure and output parser per provider
5. **CircuitBreakerState** - Session-scoped Ollama failure tracking

### API Contracts

See [contracts/](./contracts/) for detailed specifications.

**New CLI Flags**:
- `--auto` - Enable intelligent agent/style/model selection
- `--call <provider>` - Invoke specific AI provider (claude|codex|gemini)
- `--oss` - Use local OSS model (Codex only)
- `--non-interactive` - Suppress all interactive prompts (pipeline mode)

**Configuration Schema** (memory.local.md extension):
```yaml
injection:
  enabled: true
  types:
    gotcha:
      enabled: true
      threshold: 0.2
      limit: 5
    decision:
      enabled: false  # opt-in
      threshold: 0.35
      limit: 3
    learning:
      enabled: false  # opt-in
      threshold: 0.4
      limit: 2
  hook_multipliers:
    Read: 1.0
    Edit: 0.8
    Write: 0.8
    Bash: 1.2
```

### Validation Scenarios

See [quickstart.md](./quickstart.md) for step-by-step validation procedures.

**Critical Success Paths**:
1. Hint appears in stderr (not JSON stdout) on first 3 uses
2. Interactive prompt triggers for complex thought (>200 chars or "?")
3. Auto-selection completes in <1s with Ollama, <100ms with heuristics
4. Enhanced injection surfaces decisions/learnings when enabled
5. Cross-provider calling invokes correct CLI and parses output

---

## Phase 2: Implementation Outline

### Phase A: Enhanced Hint Visibility (US1)
**Priority**: P1 (Lowest risk, highest immediate value)
**Estimated Effort**: 1-2 days

**Files to Modify**:
- `skills/memory/src/cli/response.ts` - Add stderr hint output
- `skills/memory/src/cli/commands/think.ts` - Interactive prompts, help text
- `skills/memory/src/cli/hint-tracker.ts` (NEW) - Session-scoped hint tracking

**Key Implementation Points**:
1. Modify `outputResponse()` to write hints to stderr before JSON to stdout
2. Use `process.stderr.write()` (not `console.error` which adds formatting)
3. Ensure stderr flush completes before stdout JSON (ordering guarantee)
4. Track hint display count in `.claude/session-state/<sessionId>/hints.json`
5. Progressive disclosure: show first 3 times, suppress after threshold
6. Interactive prompt: "This thought seems complex. Invoke AI for assistance? (y/N)"
7. Respect `--non-interactive` flag: skip all prompts if set
8. Update help text with 3+ examples of `--call`, `--style`, `--agent` usage

**Success Criteria** (from spec.md SC-001 to SC-005):
- Hints visible in stderr, not JSON stdout
- First 3 invocations show hint, 4th+ do not
- Interactive prompts for thoughts >200 chars or containing "?"
- `--non-interactive` suppresses all prompts
- Help text includes 3+ concrete examples

---

### Phase B: Enhanced Memory Injection (US3)
**Priority**: P2 (Builds on existing patterns)
**Estimated Effort**: 2-3 days

**Files to Modify**:
- `hooks/src/memory/enhanced-injector.ts` (NEW) - Multi-type injection
- `hooks/src/settings/injection-settings.ts` (NEW) - Config parser
- `hooks/post-tool-use/memory-context.ts` - Use enhanced injector
- `.claude/memory.example.md` - Document injection configuration

**Key Implementation Points**:
1. Single `searchMemories()` call with combined query (not 3 separate calls)
2. Client-side filtering by type with per-type thresholds
3. Apply hook-type multiplier: Read (1.0x), Edit/Write (0.8x), Bash (1.2x)
4. Sort by type priority (gotcha > decision > learning) then relevance score
5. Respect per-type limits: gotchas (5), decisions (3), learnings (2)
6. Format with type-specific icons: 🚨 Gotchas, 📋 Decisions, 💡 Learnings
7. Session deduplication: cache by `(memoryId, type)` tuple
8. Conservative defaults: gotchas enabled, decisions/learnings disabled (opt-in)

**Success Criteria** (from spec.md SC-012 to SC-017):
- Default config preserves existing behaviour (gotchas only)
- Opt-in config successfully injects decisions/learnings
- Single semantic search call (not 3 separate)
- Threshold multipliers correctly applied
- Session deduplication prevents duplicate injections
- Total memories capped at 10

---

### Phase C: Auto-Selection with --auto Flag (US2)
**Priority**: P2 (Most complex, needs security hardening)
**Estimated Effort**: 3-4 days

**Files to Modify**:
- `skills/memory/src/think/auto-selector.ts` (NEW) - Selection logic
- `skills/memory/src/cli/commands/think.ts` - Handle `--auto` flag
- `package.json` - Add `prompts` dependency

**Key Implementation Points**:
1. **Heuristic Rules**: Keyword pattern matching with `RegExp` → `{style?, agent?, model?}`
2. **Ollama Selection**:
   - Build prompt with full agent/style/model lists from discovery
   - Include "Avoid: X, Y (already used)" from existing thought attributions
   - 15s timeout accommodates typical hardware
   - Display spinner: "Analysing thought..."
   - Parse JSON response, validate against discovery whitelist
3. **Security Safeguards**:
   - Sanitise thought content before Ollama prompt (escape special chars)
   - Validate selections against discovery results (prevent injection of non-existent agents)
   - Circuit breaker: skip Ollama after 3 consecutive failures
   - User confirmation required: "Auto-selected (via ollama): --style X. Proceed? (Y/n)"
4. **Fallback Strategy**:
   - If Ollama unavailable/timeout/parse error → heuristics
   - Source indicator: "(via ollama)" or "(via heuristics - ollama unavailable)"
5. **Non-Interactive Mode**: Use recommendation directly without confirmation

**Success Criteria** (from spec.md SC-006 to SC-011):
- Ollama selection completes in <1s (gemma3:1b)
- Heuristic fallback in <100ms
- Repeated `--auto` recommends 3 different styles (diversity via avoid list)
- 100% invalid agent/style rejection (whitelist validation)
- Circuit breaker activates after 3 failures
- User confirmation required before invocation

---

### Phase D: Cross-Provider Agent Calling (US4)
**Priority**: P3 (Moderate complexity, external dependencies)
**Estimated Effort**: 2-3 days

**Files to Modify**:
- `skills/memory/src/think/providers.ts` (NEW) - Provider configs
- `skills/memory/src/think/ai-invoke.ts` - Route to providers
- `skills/memory/src/cli/commands/think.ts` - Parse `--call`, `--oss`

**Key Implementation Points**:
1. **Provider Detection**: Check CLI installation with `which <command>`
2. **Command Building**:
   ```typescript
   claude: buildClaudeCommand(prompt, model)
   codex: ['codex', 'exec', prompt, '--model', model, ...(oss ? ['--oss'] : [])]
   gemini: ['gemini', prompt, '--model', model, '-o', 'text']
   ```
3. **Output Parsing**:
   - Claude: Use as-is (--print is clean)
   - Codex: Strip header lines (version, workdir info)
   - Gemini: Filter extension loading noise
4. **Attribution**: "model:X provider:Y [session-id]"
5. **Error Handling**:
   - Missing CLI: "Codex CLI not installed. Install with: npm i -g @openai/codex"
   - Invalid flags: "--oss is only supported with --call codex"
   - Unsupported params: "Warning: --agent is only supported with --call claude (ignored)"

**Success Criteria** (from spec.md SC-018 to SC-023):
- `--call codex --model gpt-5-codex` invokes Codex successfully
- `--call codex --model gpt:oss-20b --oss` uses local models
- `--call gemini --model gemini-2.5-pro` invokes Gemini with clean output
- Missing CLI displays graceful error with install instructions
- Provider-specific params warn and ignore gracefully
- Attribution correctly identifies provider and model

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Ollama timeout on slow hardware** | High | Medium | 15s timeout + circuit breaker + heuristic fallback |
| **Provider CLI command structure changes** | Medium | Low | Document tested CLI versions, version detection deferred to v1.2.0 |
| **Prompt injection via thought content** | High | Medium | Sanitise inputs, validate selections against whitelist, user confirmation gate |
| **Hint tracking state corruption** | Low | Low | Rebuild from scratch, default to showing hints (fail-open for discoverability) |
| **Enhanced injection performance degradation** | Medium | Low | Single search + client-side filtering, hard limit of 10 memories, session caching |
| **Breaking pipeline composability** | High | Low | Strict `--non-interactive` flag support, comprehensive pipeline testing |
| **Backward compatibility regression** | High | Low | Conservative defaults (gotchas only, no auto-selection), extensive regression testing |

---

## Testing Strategy

### Unit Tests (TDD Workflow - Tests First)

**Phase A (Hint Visibility)**:
- `hint-tracker.spec.ts`: Session state persistence, threshold logic, reset behaviour
- `response.spec.ts`: Stderr output ordering, hint formatting
- `think.spec.ts`: Interactive prompt triggering, `--non-interactive` flag

**Phase B (Enhanced Injection)**:
- `enhanced-injector.spec.ts`: Multi-type filtering, threshold application, prioritisation
- `injection-settings.spec.ts`: Config parsing, default values, validation
- `memory-context.spec.ts`: Hook integration, session deduplication

**Phase C (Auto-Selection)**:
- `auto-selector.spec.ts`: Prompt building, response parsing, validation, heuristics
- `think.spec.ts`: `--auto` flag handling, confirmation flow, circuit breaker

**Phase D (Cross-Provider)**:
- `providers.spec.ts`: Command building, output parsing, provider detection
- `ai-invoke.spec.ts`: Provider routing, attribution formatting, error handling

### Integration Tests

1. **Hint Visibility**: Run `memory think create "Topic"` 4 times, verify hint appears first 3 times only
2. **Auto-Selection**: Run `memory think add "SQL injection in auth" --auto`, verify Ollama invocation and selection
3. **Enhanced Injection**: Enable decisions in config, read file with related decisions, verify injection
4. **Cross-Provider**: Run `memory think add "Topic" --call codex --model gpt-5-codex` (mocked or real)
5. **Pipeline Mode**: Run `echo "Topic" | memory think create --non-interactive`, verify no prompts
6. **Ollama Timeout**: Mock Ollama timeout, verify heuristic fallback in <100ms

### Manual Testing

- [ ] Progressive disclosure works correctly (show 3 times, suppress after)
- [ ] Interactive prompts respect `--non-interactive` flag
- [ ] Auto-selection diversity: 3 different styles on repeated `--auto`
- [ ] Enhanced injection respects opt-in configuration
- [ ] Provider CLI missing errors are actionable
- [ ] Ollama circuit breaker activates after 3 failures
- [ ] Help text includes concrete examples

---

## Rollout Plan

### Version Bump
- **Current**: 1.0.8
- **Target**: 1.1.0 (minor version - new features, backward compatible)

### Default Behaviour (Backward Compatibility)
- Hints disabled by default (show progressively for discoverability)
- Enhanced injection disabled (gotchas only, opt-in for decisions/learnings)
- `--auto` flag optional (users continue manual selection)
- Provider calling requires explicit `--call <provider>` flag

### Migration Guide

**For Users**:
1. No changes required - all features opt-in or progressive
2. To enable enhanced injection: update `.claude/memory.local.md` (see example)
3. To use auto-selection: add `--auto` flag to `memory think` commands
4. To use alternative providers: install CLI and use `--call <provider>`

**For Plugin Administrators**:
1. Review injection configuration example in `memory.example.md`
2. Consider enabling decisions/learnings for advanced users
3. Document provider CLI installation instructions
4. Update team documentation with new CLI flags

### Documentation Updates

- [ ] README.md: Add `--auto` flag documentation
- [ ] README.md: Add cross-provider calling examples
- [ ] memory.example.md: Add injection configuration section
- [ ] CHANGELOG.md: Document all v1.1.0 changes
- [ ] Help text: Add concrete examples for `--call`, `--style`, `--agent`

---

## Dependencies

### New Dependencies
| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| prompts | ^2.4.2 | Interactive CLI prompts | MIT |

### Existing Dependencies (Extended)
| Package | Current Version | Changes |
|---------|-----------------|---------|
| ollama | ^0.6.3 | Extended for auto-selection |
| @types/node | ^20.11.0 | No changes |
| typescript | ^5.3.0 | No changes |

### External CLI Dependencies (Optional)
| CLI | Purpose | Installation |
|-----|---------|--------------|
| claude | Primary provider (existing) | Already installed |
| codex | Cross-provider calling | `npm i -g @openai/codex` |
| gemini | Cross-provider calling | `npm i -g @google/gemini-cli` |

---

## Implementation Phases Summary

**Phase 1: Enhanced Hint Visibility (US1)** - 1-2 days
- Lowest risk, highest immediate value
- Establishes UX foundation for Phase 3

**Phase 2: Enhanced Memory Injection (US3)** - 2-3 days
- Builds on existing gotcha-injector pattern
- Can be implemented in parallel with Phase 3

**Phase 3: Auto-Selection with --auto Flag (US2)** - 3-4 days
- Most complex, requires security hardening
- Depends on Phase 1 for confirmation prompts

**Phase 4: Cross-Provider Calling (US4)** - 2-3 days
- Moderate complexity, external dependencies
- Independent implementation

**Total Estimated Effort**: 8-12 days

---

## Success Metrics

**Enhanced Hint Visibility**:
- [ ] Hints appear in stderr (not JSON stdout)
- [ ] Progressive disclosure: first 3 uses show hint, 4th+ do not
- [ ] Interactive prompts for complex thoughts (>200 chars or "?")
- [ ] `--non-interactive` flag suppresses all prompts
- [ ] Help text includes 3+ concrete examples

**Auto-Selection**:
- [ ] Ollama selection completes in <1s (gemma3:1b)
- [ ] Heuristic fallback in <100ms when Ollama unavailable
- [ ] Repeated `--auto` recommends 3 different appropriate styles
- [ ] Invalid agent/style names caught by whitelist validation (100%)
- [ ] Circuit breaker activates after 3 consecutive Ollama failures
- [ ] User confirmation required before auto-selected agent invoked

**Enhanced Memory Injection**:
- [ ] Default config preserves existing behaviour (gotchas only)
- [ ] Opt-in config successfully injects decisions and learnings
- [ ] Single semantic search call per hook invocation
- [ ] Threshold multipliers correctly applied (Bash 1.2x stricter)
- [ ] Session deduplication prevents duplicate injections
- [ ] Total memories capped at 10 regardless of config

**Cross-Provider Calling**:
- [ ] `--call codex --model gpt-5-codex` invokes Codex successfully
- [ ] `--call codex --model gpt:oss-20b --oss` uses local models
- [ ] `--call gemini --model gemini-2.5-pro` invokes Gemini with clean output
- [ ] Missing CLI displays graceful error with install instructions
- [ ] Provider-specific params warn and ignore gracefully
- [ ] Attribution correctly identifies provider and model

---

## Next Steps

1. **Review this plan** with stakeholders (if applicable)
2. **Approve technology choices** (prompts library, gemma3:1b for auto-selection)
3. **Run `/speckit:tasks`** to generate detailed task breakdown with TDD workflow
4. **Begin Phase 1 implementation** (Enhanced Hint Visibility)
5. **Store planning decisions in memory skill** for future reference

---

**Version**: 1.0.0 | **Created**: 2026-01-24 | **Status**: Draft
