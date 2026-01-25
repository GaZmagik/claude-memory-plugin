/**
 * T075: Codex Output Parser
 */
export function parseCodexOutput(raw: string | null | undefined): string {
  if (!raw) return '';
  let output = raw.replace(/^=+\s*Codex Response\s*=+\n*/im, '').replace(/^---+\n*/gm, '');
  return output.trim().replace(/\n{3,}/g, '\n\n');
}
