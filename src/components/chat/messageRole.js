/** Resolve UI role for a chat message (demo + backend-friendly). */
export function resolveMessageRole(msg, user) {
  if (msg.role) return msg.role;
  if (msg.is_ai === true || msg.sender_kind === 'ai') {
    return msg.visibility === 'private' || msg.ai_visibility === 'private' ? 'ai_private' : 'ai_public';
  }
  if (msg.sender_kind === 'stakeholder') return 'stakeholder';
  if (typeof msg.sender_id === 'number' && msg.sender_id < 0) {
    return msg.sender_id === -2 ? 'ai_private' : 'ai_public';
  }
  if (user != null && msg.sender_id === user.id) return 'freelancer';
  return 'client';
}
