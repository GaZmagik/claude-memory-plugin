/**
 * Input sanitisation for Ollama prompts and selection names
 * Prevents injection attacks and normalises input
 */

/**
 * Sanitise text for inclusion in Ollama prompts
 * @param input - Raw input text
 * @param maxLength - Maximum allowed length (default 2000)
 */
export function sanitiseForPrompt(input: string, maxLength = 2000): string {
  if (!input) return '';

  let result = input
    // Remove control characters (except newlines and tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
    // Normalise multiple spaces
    .replace(/ +/g, ' ')
    // Normalise multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    // Trim
    .trim();

  // Truncate if too long
  if (result.length > maxLength) {
    result = result.slice(0, maxLength);
  }

  return result;
}

/**
 * Sanitise style name for validation
 * Removes path traversal and special characters
 */
export function sanitiseStyleName(name: string): string {
  if (!name) return '';

  return name
    // Remove path separators
    .replace(/[/\\]/g, '')
    // Remove dots (path traversal)
    .replace(/\.\./g, '')
    // Keep only alphanumeric, hyphens, underscores
    .replace(/[^a-zA-Z0-9_-]/g, '')
    // Strip leading dots (prevent hidden files)
    .replace(/^\.+/, '')
    // Truncate
    .slice(0, 100);
}

/**
 * Sanitise agent name for validation
 * Removes path traversal and special characters
 */
export function sanitiseAgentName(name: string): string {
  if (!name) return '';

  return name
    // Remove path separators
    .replace(/[/\\]/g, '')
    // Remove dots (path traversal)
    .replace(/\.\./g, '')
    // Keep only alphanumeric, hyphens, underscores
    .replace(/[^a-zA-Z0-9_-]/g, '')
    // Strip leading dots (prevent hidden files)
    .replace(/^\.+/, '')
    // Truncate
    .slice(0, 100);
}
