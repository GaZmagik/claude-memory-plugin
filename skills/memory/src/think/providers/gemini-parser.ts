/**
 * T076: Gemini Output Parser
 */
export function parseGeminiOutput(raw: string | null | undefined): string {
  if (!raw) return '';
  const lines = raw.split('\n').filter(line => {
    const t = line.trim();
    if (/^\[(INFO|DEBUG|WARN|ERROR)\]/i.test(t)) return false;
    if (/^(Thinking|Processing|Done!?)\.{0,3}$/i.test(t)) return false;
    return true;
  });
  return lines.join('\n').trim().replace(/\n{3,}/g, '\n\n');
}
