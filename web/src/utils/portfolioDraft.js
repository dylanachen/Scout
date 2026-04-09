/** Build a short description draft from recent chat lines (demo “AI draft”). */

export function buildPortfolioDraftFromMessages(messages, projectName) {
  const lines = (messages || [])
    .filter((m) => m && typeof m.text === 'string' && m.text.trim())
    .slice(-12)
    .map((m) => m.text.trim());

  if (!lines.length) {
    return `Work completed for “${projectName}”: collaboration, iterations, and final delivery through FreelanceOS.`;
  }

  const joined = lines.join(' ');
  const snippet = joined.length > 320 ? `${joined.slice(0, 317)}…` : joined;
  return `Summary from project conversation for “${projectName}”: ${snippet}`;
}
