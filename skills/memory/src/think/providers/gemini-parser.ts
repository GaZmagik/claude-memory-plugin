/**
 * T076: Gemini Output Parser
 */
export function parseGeminiOutput(raw: string | null | undefined): string {
  if (!raw) return '';
  const lines = raw.split('\n').filter(line => {
    const t = line.trim();
    // Filter out log lines (INFO, DEBUG, WARN, ERROR prefixes)
    if (/^\[(INFO|DEBUG|WARN|ERROR)\]/i.test(t)) return false;
    // Filter out status messages
    if (/^(Thinking|Processing|Done!?)\.{0,3}$/i.test(t)) return false;
    return true;
  });
  return lines.join('\n').trim().replace(/\n{3,}/g, '\n\n');
}

/**
 * Extract model name from Gemini CLI debug output
 * Always parse to get actual model used (CLI may fall back if requested model unavailable)
 *
 * Gemini outputs model info in several formats:
 * 1. JSON: `"model": "gemini-3-flash-preview"` in error/debug output
 * 2. User-Agent: `GeminiCLI/0.25.2/gemini-3-pro-preview (linux; x64)`
 * 3. Plain: `model: gemini-xxx` (rare)
 */
export function extractGeminiModel(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;

  // Match "model": "gemini-xxx" in JSON debug output
  // Note: Requires double-quoted JSON format; single quotes not supported
  const jsonMatch = raw.match(/"model":\s*"(gemini-[^"]+)"/);
  if (jsonMatch) return jsonMatch[1];

  // Match User-Agent string: GeminiCLI/version/model-name
  // e.g., GeminiCLI/0.25.2/gemini-3-pro-preview (linux; x64)
  const userAgentMatch = raw.match(/GeminiCLI\/[\d.]+\/(gemini-[^\s(]+)/);
  if (userAgentMatch) return userAgentMatch[1];

  // Also try plain format like codex
  const plainMatch = raw.match(/^model:\s*(gemini-.+)$/m);
  return plainMatch?.[1]?.trim();
}
