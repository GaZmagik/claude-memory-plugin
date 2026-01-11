/**
 * Topic Classification for Memory Context
 *
 * Utilities for classifying bash commands and extracting topics.
 */

// Patterns for trivial commands that should never trigger memory checks
const TRIVIAL_PATTERNS =
  /^(ls|pwd|cd|echo|cat|head|tail|wc|which|whoami|date|clear|history|env|export|source|alias|type|file|stat)\b/;
const GIT_TRIVIAL =
  /^git\s+(status|log|diff|branch|remote|fetch|stash\s+list|show|blame)\b/;

// Meta-topics to reject (too generic)
const META_TOPICS =
  /^(learning|decision|artifact|gotcha|phase|impl|struct|enum|trait|module)$/;

// Valid topic pattern: 3-15 lowercase letters
const VALID_TOPIC_PATTERN = /^[a-z]{3,15}$/;

/**
 * Check if a command is trivial and should be skipped.
 */
export function isTrivialCommand(command: string): boolean {
  const trimmed = command.trim();
  return TRIVIAL_PATTERNS.test(trimmed) || GIT_TRIVIAL.test(trimmed);
}

/**
 * Check if a topic is a meta-topic that should be rejected.
 */
export function isMetaTopic(topic: string): boolean {
  return META_TOPICS.test(topic.toLowerCase());
}

/**
 * Check if a topic is valid (3-15 lowercase letters only, not a meta-topic).
 */
export function isValidTopic(topic: string): boolean {
  const lower = topic.toLowerCase();

  // Must contain only letters (no dashes, numbers, etc.)
  if (!/^[a-z]+$/.test(lower)) {
    return false;
  }

  if (!VALID_TOPIC_PATTERN.test(lower)) {
    return false;
  }

  if (isMetaTopic(lower)) {
    return false;
  }

  return true;
}

/**
 * Extract topic from a CHECK response.
 */
export function extractTopicFromResponse(response: string): string | null {
  // Check for SKIP response
  if (response.includes('SKIP:')) {
    return null;
  }

  // Extract topic from CHECK response
  const checkMatch = response.match(/CHECK:\s*(\w+)/);
  if (!checkMatch) {
    return null;
  }

  const topic = checkMatch[1].toLowerCase().replace(/[^a-z]/g, '');

  if (!isValidTopic(topic)) {
    return null;
  }

  return topic;
}

/**
 * Build the topic extraction prompt for Ollama.
 */
export function buildTopicPrompt(command: string): string {
  return `You are a code assistant. Given a bash command, extract the relevant domain topic for checking project documentation.

Command: ${command}

Rules:
- Output CHECK if this command relates to specific project code (tests, builds, scripts, tools)
- Output SKIP if this is a generic system command with no project context
- The topic must be a SINGLE common English word (noun) describing the domain
- Extract semantic meaning from paths and filenames
- Good topics: adam, care, parser, tests, build, migration, deploy, database
- Bad topics: pytest, python, bash, npm (these are tools, not domains)

Reply with ONLY one line in this exact format:
CHECK: <single_word_topic>
OR
SKIP: <reason>

Examples:
Command: pytest tests/adam/ → CHECK: adam
Command: python src/care/parser.py → CHECK: parser
Command: cargo build --release → CHECK: build
Command: npm run test:coverage → CHECK: tests
Command: grep -r "function" . → SKIP: generic search
Command: rm -rf node_modules → SKIP: cleanup
Command: docker compose up → CHECK: docker`;
}

/**
 * Build the gotcha extraction prompt for Ollama.
 */
export function buildSummaryPrompt(
  command: string,
  topic: string,
  memoryContent: string
): string {
  return `TASK: Extract ONLY actionable warnings from memory notes relevant to this bash command.

COMMAND: ${command}
TOPIC: ${topic}

MEMORY NOTES:
${memoryContent}

STRICT RULES:
1. Extract ONLY explicit warnings, bugs, gotchas, or "careful/avoid/never" statements
2. The warning must be DIRECTLY relevant to "${topic}" or the command being run
3. DO NOT include status updates, achievements, or vague suggestions
4. If no ACTIONABLE warnings found, output exactly: No gotchas found

OUTPUT FORMAT:
- One bullet per warning, max 50 words total
- Must quote specific technical issue from the notes

YOUR OUTPUT:`;
}

/**
 * Clean memory content by removing status updates.
 */
export function cleanMemoryContent(content: string): string {
  return content
    .replace(/\d+ tests? passing/gi, '')
    .replace(/zero (clippy )?warnings?/gi, '')
    .replace(/all tests pass(ing|ed)?/gi, '')
    .replace(/clippy clean/gi, '')
    .replace(/build succeed(s|ed)?/gi, '')
    .replace(/no (clippy )?warnings?/gi, '')
    .slice(0, 2000);
}

/**
 * Check if gotcha summary indicates no gotchas were found.
 */
export function hasNoGotchas(summary: string): boolean {
  return !summary || summary.toLowerCase().includes('no gotchas');
}

/**
 * Clean up gotcha summary for display.
 */
export function cleanGotchaSummary(summary: string): string {
  return summary.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);
}
