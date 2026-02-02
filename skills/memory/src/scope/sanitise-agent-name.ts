/**
 * Sanitises agent names to filesystem-safe lowercase alphanumeric + hyphens
 *
 * Algorithm:
 * 1. Convert to lowercase
 * 2. Replace whitespace and underscores with hyphens
 * 3. Remove non-alphanumeric characters except hyphens
 * 4. Collapse multiple hyphens to single hyphen
 * 5. Trim leading/trailing hyphens
 *
 * @param name - Raw agent name to sanitise
 * @returns Sanitised agent name (empty string if no valid characters)
 *
 * @example
 * sanitiseAgentName('TypeScript Expert') // => 'typescript-expert'
 * sanitiseAgentName('API_Architect') // => 'api-architect'
 * sanitiseAgentName('Rust (Systems)') // => 'rust-systems'
 */
export function sanitiseAgentName(name: string): string {
  return (
    name
      // 1. Convert to lowercase
      .toLowerCase()
      // 2. Replace whitespace and underscores with hyphens
      .replace(/[\s_]+/g, '-')
      // 3. Replace non-alphanumeric characters (except hyphens) with hyphens
      .replace(/[^a-z0-9-]+/g, '-')
      // 4. Collapse multiple hyphens to single hyphen
      .replace(/-+/g, '-')
      // 5. Trim leading/trailing hyphens
      .replace(/^-+|-+$/g, '')
  );
}
