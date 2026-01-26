# Quickstart: v1.1.0 Enhancements

**Feature**: 002-v1.1.0-enhancements
**Purpose**: Validate implementation against success criteria
**Created**: 2026-01-24

---

## Overview

This document provides step-by-step validation scenarios for all four features in v1.1.0. Each scenario maps directly to success criteria from the specification.

**Prerequisites**:
- Plugin installed and configured
- Ollama running locally (for auto-selection tests)
- Session state directory exists: `.claude/session-state/`

---

## Scenario 1: Enhanced Hint Visibility - Progressive Disclosure

**Goal**: Validate hints appear in stderr, not JSON stdout, and suppress after threshold

**Maps to Success Criteria**: SC-001, SC-002

**Steps**:

1. Start a new session:
   ```bash
   # Clear any existing session state
   rm -rf .claude/session-state/*

   # Get new session ID
   SESSION_ID=$(uuidgen)
   export CLAUDE_SESSION_ID=$SESSION_ID
   ```

2. First invocation - hint should appear:
   ```bash
   memory think create "Test topic 1" 2>hint1.stderr 1>response1.json
   ```

3. Verify hint in stderr:
   ```bash
   cat hint1.stderr
   # Expected: Hint about --call claude functionality
   ```

4. Verify clean JSON in stdout:
   ```bash
   cat response1.json | jq .
   # Expected: Valid JSON without hint text
   ```

5. Second invocation - hint should still appear:
   ```bash
   memory think create "Test topic 2" 2>hint2.stderr 1>response2.json
   ```

6. Verify hint count:
   ```bash
   cat .claude/session-state/$SESSION_ID/hints.json | jq .
   # Expected: { "hints": { "call-ai-assistance": { "count": 2, ... } } }
   ```

7. Third invocation - hint should still appear:
   ```bash
   memory think create "Test topic 3" 2>hint3.stderr 1>response3.json
   ```

8. Fourth invocation - hint should be suppressed:
   ```bash
   memory think create "Test topic 4" 2>hint4.stderr 1>response4.json
   ```

9. Verify no hint on 4th invocation:
   ```bash
   cat hint4.stderr
   # Expected: Empty or no hint text (JSON response may be in stderr for errors)
   ```

**Expected Outcome**:
- Hints appear in first 3 invocations (stderr output)
- JSON responses remain clean (stdout only)
- 4th+ invocations have no hint
- Session state tracks count correctly

**Validation Command**:
```bash
# Quick validation
for i in {1..4}; do
  echo "=== Invocation $i ==="
  memory think create "Topic $i" 2>&1 >/dev/null | grep -c "hint" || echo "No hint"
done
# Expected output: hint count for 1-3, "No hint" for 4
```

---

## Scenario 2: Enhanced Hint Visibility - Interactive Prompts

**Goal**: Validate interactive prompts trigger for complex thoughts

**Maps to Success Criteria**: SC-003, SC-004

**Steps**:

1. Complex thought (>200 chars) should trigger prompt:
   ```bash
   memory think add "Should we migrate to microservices? This is a complex architectural decision that requires careful consideration of trade-offs, team expertise, operational overhead, and long-term maintainability. What are the pros and cons?"

   # Expected: Interactive prompt appears:
   # "This thought seems complex. Invoke AI for assistance? (y/N)"
   ```

2. Thought with question mark should trigger prompt:
   ```bash
   memory think add "What are the security implications of this approach?"

   # Expected: Same interactive prompt
   ```

3. Test non-interactive mode suppresses prompt:
   ```bash
   memory think add "Should we migrate to microservices? This is a very long thought that would normally trigger the interactive prompt..." --non-interactive

   # Expected: No prompt, command completes immediately
   ```

4. Verify help text includes examples:
   ```bash
   memory think --help | grep -A 5 "Examples:"

   # Expected: At least 3 examples showing --call, --style, --agent usage
   ```

**Expected Outcome**:
- Thoughts >200 chars trigger interactive confirmation
- Thoughts containing "?" trigger interactive confirmation
- `--non-interactive` flag suppresses all prompts
- Help text includes concrete usage examples

**Validation Command**:
```bash
# Test prompt triggering (manual verification required for interactive prompt)
echo "This is a very long thought that exceeds 200 characters and should trigger an interactive prompt asking if the user wants to invoke AI assistance for this complex deliberation topic" | memory think add --non-interactive
# Should complete without prompting
```

---

## Scenario 3: Auto-Selection with Ollama

**Goal**: Validate Ollama-based auto-selection completes in <1s with correct recommendations

**Maps to Success Criteria**: SC-006, SC-008, SC-011

**Steps**:

1. Verify Ollama is running and gemma3:1b is available:
   ```bash
   ollama list | grep gemma3:1b
   # Expected: gemma3:1b model listed
   ```

2. First auto-selection for security topic:
   ```bash
   time memory think add "SQL injection vulnerability in authentication handler" --auto

   # Expected:
   # - "Analysing thought..." spinner
   # - Response in <1s
   # - "Auto-selected (via ollama): --style Security-Auditor. Reasoning: Security vulnerability keywords detected. Proceed? (Y/n)"
   ```

3. Accept recommendation:
   ```bash
   # Type 'Y' at prompt
   # Expected: AI invocation with Security-Auditor style
   ```

4. Second auto-selection on same deliberation (diversity test):
   ```bash
   memory think add "Additional security perspective needed" --auto

   # Expected: Different style recommended (e.g., Pragmatist or Architect)
   # Reasoning should mention avoiding Security-Auditor (already used)
   ```

5. Third auto-selection (diversity test continues):
   ```bash
   memory think add "Final thoughts on approach" --auto

   # Expected: Third different style recommended
   ```

6. Test user confirmation gate:
   ```bash
   memory think add "Test rejection" --auto
   # At prompt, type 'n'

   # Expected: Command aborts without AI invocation
   ```

**Expected Outcome**:
- Ollama selection completes in <1s (gemma3:1b)
- Appropriate style recommended based on topic
- Repeated `--auto` on same deliberation recommends different styles
- User confirmation required before AI invocation
- Rejection aborts gracefully

**Performance Validation**:
```bash
# Benchmark auto-selection timing
for i in {1..5}; do
  time memory think add "Performance test topic $i" --auto --non-interactive 2>&1 | grep real
done
# Expected: All runs complete in <1s
```

---

## Scenario 4: Auto-Selection with Heuristic Fallback

**Goal**: Validate heuristic fallback when Ollama unavailable

**Maps to Success Criteria**: SC-007, SC-010

**Steps**:

1. Stop Ollama service:
   ```bash
   # On Linux/macOS
   killall ollama
   # Or: systemctl stop ollama
   ```

2. Run auto-selection with Ollama down:
   ```bash
   time memory think add "Architecture design question" --auto

   # Expected:
   # - Immediate response (<100ms)
   # - "Auto-selected (via heuristics - ollama unavailable): --style Architect. Reasoning: Architectural keywords detected. Proceed? (Y/n)"
   ```

3. Verify heuristic keyword matching:
   ```bash
   # Security keywords
   memory think add "XSS vulnerability in form handler" --auto --non-interactive
   # Expected: Security-Auditor style

   # Architecture keywords
   memory think add "Module structure redesign needed" --auto --non-interactive
   # Expected: Architect style

   # Decision keywords
   memory think add "Should we use microservices vs monolith?" --auto --non-interactive
   # Expected: Devils-Advocate style

   # Performance keywords
   memory think add "Optimise database query latency" --auto --non-interactive
   # Expected: Pragmatist style

   # Testing keywords
   memory think add "Improve test coverage for auth module" --auto --non-interactive
   # Expected: test-quality-expert agent
   ```

4. Test circuit breaker (requires Ollama restarted but failing):
   ```bash
   # Restart Ollama but with invalid config to cause failures
   # Run auto-selection 3 times
   memory think add "Test 1" --auto --non-interactive
   memory think add "Test 2" --auto --non-interactive
   memory think add "Test 3" --auto --non-interactive

   # Check session state
   # Expected: Circuit breaker should be open after 3 failures

   # 4th attempt should skip Ollama immediately
   memory think add "Test 4" --auto --non-interactive
   # Expected: Immediate heuristic selection, no Ollama attempt
   ```

**Expected Outcome**:
- Heuristic fallback completes in <100ms
- Source indicator shows "heuristics - ollama unavailable"
- Keyword matching produces sensible selections
- Circuit breaker activates after 3 consecutive failures

**Validation Command**:
```bash
# Test heuristic fallback timing
time (memory think add "Security vulnerability" --auto --non-interactive && \
      memory think add "Architecture design" --auto --non-interactive && \
      memory think add "Should we refactor?" --auto --non-interactive)
# Expected: Total time <500ms for 3 selections
```

---

## Scenario 5: Enhanced Memory Injection - Default Behaviour

**Goal**: Validate default configuration preserves existing behaviour (gotchas only)

**Maps to Success Criteria**: SC-012

**Steps**:

1. Ensure no custom injection config exists:
   ```bash
   # Remove any custom config
   rm -f .claude/memory.local.md
   ```

2. Create a gotcha memory:
   ```bash
   memory add gotcha "Session cache race condition" \
     --content "Concurrent writes to session cache can corrupt state. Always use atomic write operations." \
     --tags "session,concurrency,file:hooks/src/session/session-cache.ts" \
     --severity high
   ```

3. Create a decision memory:
   ```bash
   memory add decision "Use prompts library for CLI" \
     --content "Decided to use prompts npm package for interactive CLI prompts." \
     --tags "cli,dependencies,file:skills/memory/src/cli/commands/think.ts"
   ```

4. Read a file that matches both memories:
   ```bash
   # This should trigger injection hook
   cat hooks/src/session/session-cache.ts | head -20
   ```

5. Check injection output (in Claude Code session):
   ```
   Expected: Only gotcha memory appears (🚨 Session cache race condition)
   Expected: Decision memory does NOT appear (default config excludes decisions)
   ```

**Expected Outcome**:
- Only gotcha-type memories injected by default
- Decision and learning memories NOT injected
- Backward compatibility preserved

---

## Scenario 6: Enhanced Memory Injection - Opt-In Configuration

**Goal**: Validate opt-in configuration successfully injects decisions and learnings

**Maps to Success Criteria**: SC-013, SC-014, SC-015

**Steps**:

1. Create custom injection config:
   ```bash
   cat > .claude/memory.local.md << 'EOF'
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
         enabled: true
         threshold: 0.35
         limit: 3
       learning:
         enabled: true
         threshold: 0.4
         limit: 2
     hook_multipliers:
       Read: 1.0
       Edit: 0.8
       Write: 0.8
       Bash: 1.2
   ---

   # Memory Plugin Configuration
   See memory.example.md for full documentation.
   EOF
   ```

2. Create test memories of each type:
   ```bash
   memory add gotcha "Test gotcha" \
     --content "Gotcha content" \
     --tags "test,file:test.ts" \
     --severity medium

   memory add decision "Test decision" \
     --content "Decision content" \
     --tags "test,file:test.ts"

   memory add learning "Test learning" \
     --content "Learning content" \
     --tags "test,file:test.ts"
   ```

3. Read matching file:
   ```bash
   cat test.ts | head -10
   ```

4. Verify all types injected (in Claude Code session):
   ```
   Expected:
   - 🚨 Test gotcha (gotcha-xxx)
   - 📋 Test decision (decision-xxx)
   - 💡 Test learning (learning-xxx)
   ```

5. Test hook-type multipliers with Bash command:
   ```bash
   # Bash hook has 1.2x multiplier (stricter threshold)
   # Only high-relevance memories should appear

   rm -f test.ts  # Bash command that matches file:test.ts tags

   # Expected: Fewer memories due to stricter threshold
   ```

6. Verify single semantic search call (check logs):
   ```bash
   # Enable debug logging
   MEMORY_DEBUG=1 cat test.ts | head -10

   # Expected in logs: Single "Searching memories" call, not 3 separate calls
   ```

**Expected Outcome**:
- All enabled types (gotcha, decision, learning) are injected
- Type-specific icons appear correctly
- Single semantic search call (performance optimisation)
- Hook-type multipliers correctly adjust thresholds
- Per-type limits respected

---

## Scenario 7: Enhanced Memory Injection - Session Deduplication

**Goal**: Validate session deduplication prevents duplicate injections

**Maps to Success Criteria**: SC-016

**Steps**:

1. Create a memory:
   ```bash
   memory add gotcha "Duplicate test" \
     --content "This should only appear once per session" \
     --tags "file:duplicate.ts"
   ```

2. Read the same file multiple times in same session:
   ```bash
   cat duplicate.ts | head -10
   # Note the injected memory

   cat duplicate.ts | head -20
   # Same file, should NOT inject again

   cat duplicate.ts | tail -10
   # Same file, should NOT inject again
   ```

3. Verify deduplication (in Claude Code session):
   ```
   Expected: Memory appears on first read only
   Expected: Subsequent reads of same file do NOT inject the same memory
   ```

4. Start new session and verify reset:
   ```bash
   # Clear session state
   rm -rf .claude/session-state/*

   # Start new session
   cat duplicate.ts | head -10

   # Expected: Memory appears again (new session, cache cleared)
   ```

**Expected Outcome**:
- Same memory not injected twice in one session
- Session cache tracks (memoryId, type) tuples
- New session allows re-injection

---

## Scenario 8: Cross-Provider Calling - Codex Integration

**Goal**: Validate Codex CLI invocation and local model support

**Maps to Success Criteria**: SC-018, SC-019

**Steps**:

1. Verify Codex CLI is installed:
   ```bash
   which codex
   # Expected: /usr/local/bin/codex or similar

   codex --version
   # Expected: Version information
   ```

2. Test Codex invocation with cloud model:
   ```bash
   memory think add "Test thought for Codex" --call codex --model gpt-5-codex

   # Expected:
   # - Codex CLI invoked
   # - Clean output (headers stripped)
   # - Attribution: "by: model:gpt-5-codex provider:codex [session-id]"
   ```

3. Test Codex with local OSS model:
   ```bash
   memory think add "Test with local model" --call codex --model gpt:oss-20b --oss

   # Expected:
   # - Codex invoked with --oss flag
   # - Local model used (no API call)
   # - Attribution: "by: model:gpt:oss-20b provider:codex [session-id]"
   ```

4. Test error handling for missing CLI:
   ```bash
   # Temporarily rename codex
   sudo mv /usr/local/bin/codex /usr/local/bin/codex.bak

   memory think add "Test error" --call codex --model gpt-5-codex

   # Expected: Graceful error with installation instructions
   # "Codex CLI not installed. Install with: npm i -g @openai/codex"

   # Restore
   sudo mv /usr/local/bin/codex.bak /usr/local/bin/codex
   ```

**Expected Outcome**:
- Codex CLI invoked successfully
- Local models work with --oss flag
- Output parsed correctly (headers stripped)
- Attribution includes provider and model
- Missing CLI shows actionable error

---

## Scenario 9: Cross-Provider Calling - Gemini Integration

**Goal**: Validate Gemini CLI invocation and output parsing

**Maps to Success Criteria**: SC-020

**Steps**:

1. Verify Gemini CLI is installed:
   ```bash
   which gemini
   # Expected: Path to gemini executable

   gemini --version
   # Expected: Version information
   ```

2. Test Gemini invocation:
   ```bash
   memory think add "Test thought for Gemini" --call gemini --model gemini-2.5-pro

   # Expected:
   # - Gemini CLI invoked with -o text flag
   # - Extension loading noise filtered out
   # - Attribution: "by: model:gemini-2.5-pro provider:gemini [session-id]"
   ```

3. Verify output parsing removes noise:
   ```bash
   # Check deliberation content
   memory think show <deliberation-id> | grep -v "Loading extension" | grep -v "[Gemini]"

   # Expected: Clean thought content, no CLI noise
   ```

**Expected Outcome**:
- Gemini CLI invoked successfully
- Output filtered correctly (no extension loading messages)
- Attribution includes provider and model

---

## Scenario 10: Cross-Provider Calling - Parameter Validation

**Goal**: Validate provider-specific parameter warnings and errors

**Maps to Success Criteria**: SC-021, SC-022

**Steps**:

1. Test --agent with non-Claude provider (should warn):
   ```bash
   memory think add "Test" --call codex --model gpt-5-codex --agent test-quality-expert

   # Expected: Warning message
   # "Warning: --agent is only supported with --call claude (ignored)"
   # Command proceeds without --agent
   ```

2. Test --style with non-Claude provider (should warn):
   ```bash
   memory think add "Test" --call gemini --model gemini-2.5-pro --style Security-Auditor

   # Expected: Warning message
   # "Warning: --style is only supported with --call claude (ignored)"
   ```

3. Test --oss with non-Codex provider (should error):
   ```bash
   memory think add "Test" --call gemini --model gemini-2.5-pro --oss

   # Expected: Error message
   # "The --oss flag is only supported with --call codex"
   # Command aborts
   ```

4. Test missing provider:
   ```bash
   memory think add "Test" --call invalid-provider --model test

   # Expected: Error message
   # "Unknown provider: invalid-provider. Supported: claude, codex, gemini"
   ```

**Expected Outcome**:
- Unsupported parameters generate warnings
- Invalid flag combinations generate errors
- Error messages are actionable
- Command continues or aborts appropriately

---

## Scenario 11: Integration Test - All Features Together

**Goal**: Validate all features work together seamlessly

**Maps to Success Criteria**: All SC-* criteria

**Steps**:

1. Start fresh session with enhanced injection enabled:
   ```bash
   # Clear session
   rm -rf .claude/session-state/*

   # Ensure injection config enabled (from Scenario 6)
   # Create memories of all types with relevant tags
   ```

2. Use auto-selection with hint visibility:
   ```bash
   # First use - hint should appear
   memory think create "Should we implement circuit breaker pattern?" --auto 2>stderr.log

   # Verify hint in stderr
   grep "hint" stderr.log

   # Verify auto-selection prompt
   # Expected: "Auto-selected (via ollama): --style Devils-Advocate..."
   ```

3. Accept auto-selection and verify cross-provider:
   ```bash
   # Use different provider for additional thought
   memory think add "Implementation perspective" --call codex --model gpt-5-codex

   # Expected: Mixed providers in deliberation
   ```

4. Read file to trigger enhanced injection:
   ```bash
   cat hooks/src/services/ollama.ts | head -20

   # Expected: Multiple memory types injected (gotcha + decision + learning)
   ```

5. Verify all features working:
   ```bash
   # Check deliberation shows multiple providers
   memory think show <deliberation-id>

   # Expected:
   # - Thoughts from claude (via auto-selection)
   # - Thoughts from codex (explicit --call)
   # - Correct attributions for each
   ```

**Expected Outcome**:
- Hints appear progressively
- Auto-selection recommends appropriate styles
- Enhanced injection surfaces multiple memory types
- Cross-provider calling works seamlessly
- All features integrate without conflicts

---

## Performance Benchmarks

### Target Performance Metrics

| Feature | Target | Measurement Command |
|---------|--------|---------------------|
| Hint display latency | <10ms | `time memory think create "Test" 2>&1 >/dev/null` |
| Auto-selection (Ollama) | <1s | `time memory think add "Test" --auto --non-interactive` |
| Auto-selection (heuristics) | <100ms | Same as above, with Ollama stopped |
| Enhanced injection | <100ms | Monitor PostToolUse hook timing |
| Provider CLI invocation | Variable | `time memory think add "Test" --call <provider>` |

### Benchmark Script

```bash
#!/bin/bash
# performance-validation.sh

echo "=== v1.1.0 Performance Benchmarks ==="

echo "1. Hint Display Latency"
time memory think create "Benchmark test" 2>&1 >/dev/null
# Target: <10ms

echo "2. Auto-Selection with Ollama"
time memory think add "Security test" --auto --non-interactive
# Target: <1s

echo "3. Auto-Selection with Heuristics (stop Ollama first)"
killall ollama
time memory think add "Architecture test" --auto --non-interactive
# Target: <100ms

echo "4. Enhanced Injection (requires debug logging)"
MEMORY_DEBUG=1 time cat test.ts | head -10
# Target: <100ms additional latency

echo "5. Cross-Provider Invocation"
time memory think add "Test" --call codex --model gpt-5-codex --non-interactive
# Target: Variable (depends on provider)

echo "=== Benchmarks Complete ==="
```

---

## Validation Checklist

**Enhanced Hint Visibility**:
- [ ] Hints appear in stderr (not JSON stdout)
- [ ] Progressive disclosure works (first 3 uses, then suppress)
- [ ] Interactive prompts trigger for complex thoughts
- [ ] `--non-interactive` flag suppresses all prompts
- [ ] Help text includes 3+ concrete examples
- [ ] Session state persists hint counts correctly

**Auto-Selection**:
- [ ] Ollama selection completes in <1s (gemma3:1b)
- [ ] Heuristic fallback completes in <100ms
- [ ] Appropriate styles recommended for different topics
- [ ] Repeated `--auto` recommends different styles (diversity)
- [ ] Invalid selections rejected by whitelist validation
- [ ] Circuit breaker activates after 3 consecutive failures
- [ ] User confirmation required before invocation
- [ ] Source indicator shows "ollama" vs "heuristics"

**Enhanced Memory Injection**:
- [ ] Default config preserves existing behaviour (gotchas only)
- [ ] Opt-in config injects decisions and learnings
- [ ] Single semantic search call per hook invocation
- [ ] Type-specific icons appear correctly (🚨📋💡)
- [ ] Hook-type multipliers adjust thresholds correctly
- [ ] Session deduplication prevents duplicates
- [ ] Per-type limits respected
- [ ] Hard limit of 10 total memories enforced

**Cross-Provider Calling**:
- [ ] Codex invocation works with cloud models
- [ ] Codex --oss flag works with local models
- [ ] Gemini invocation works correctly
- [ ] Output parsing removes provider-specific noise
- [ ] Attribution includes provider and model
- [ ] Missing CLI shows graceful error with instructions
- [ ] Unsupported parameters warn or error appropriately
- [ ] --agent and --style only work with claude provider

**Integration**:
- [ ] All features work together without conflicts
- [ ] Performance targets met for all features
- [ ] Backward compatibility maintained
- [ ] Pipeline mode works with `--non-interactive`

---

**Version**: 1.0.0 | **Created**: 2026-01-24
