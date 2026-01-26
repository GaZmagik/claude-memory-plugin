/**
 * T075: Codex Output Parser
 */
export function parseCodexOutput(raw: string | null | undefined): string {
  if (!raw) return '';
  let output = raw.replace(/^=+\s*Codex Response\s*=+\n*/im, '').replace(/^---+\n*/gm, '');
  return output.trim().replace(/\n{3,}/g, '\n\n');
}

/**
 * Extract model name from Codex CLI output
 * Codex shows "model: gpt-5.2-codex" in its startup banner
 */
export function extractCodexModel(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  // Match "model: <model-name>" line in codex output
  const match = raw.match(/^model:\s*(.+)$/m);
  return match?.[1]?.trim();
}
