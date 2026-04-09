/**
 * Demo payload for post-meeting summary (stored when a meeting ends in demo flow).
 */
export function buildDemoMeetingSummary({ projectName, callStartedAt, durationMinutes }) {
  const started = callStartedAt ? new Date(callStartedAt) : new Date();
  return {
    projectName,
    callStartedAt: started.toISOString(),
    durationMinutes: durationMinutes ?? 42,
    transcript: `[00:00] Host: Thanks for joining — quick scope check on the hero section.\n[00:45] Client: We also need an extra animation on the pricing block.\n[02:10] Host: That sounds like a small add-on; I can send a mini change order.\n[05:22] Client: Let's target April 22 for the homepage handoff.\n[12:00] Host: Agreed — two revision rounds stay in scope; anything beyond goes through CO.\n[18:30] Client: Please send the hero copy by Friday.\n[35:00] Host: I'll own the timeline update; client to approve wireframes by EOD Wednesday.`,
    decisions: [
      {
        id: 'sum-d1',
        text: 'Treat pricing animation as a scoped add-on with a mini change order before build.',
      },
      {
        id: 'sum-d2',
        text: 'Homepage handoff target: April 22 (pending client asset delivery).',
      },
      {
        id: 'sum-d3',
        text: 'Revision policy: two rounds in scope; further rounds require written change order.',
      },
    ],
    scopeFlags: [
      {
        id: 'sum-s1',
        severity: 'HIGH',
        explanation:
          'Client verbally requested a third hero variant — contract allows two revision rounds per milestone.',
        contract_clause:
          'Revisions: Client receives up to two (2) rounds of revision per milestone; additional rounds require a written change order.',
      },
      {
        id: 'sum-s2',
        severity: 'MEDIUM',
        explanation: 'Mentioned integrating a new CRM webhook — not in current SOW.',
        contract_clause: null,
      },
    ],
    actionItems: [
      {
        id: 'sum-a1',
        task: 'Send mini change order for pricing animation',
        owner: 'freelancer',
        due: null,
      },
      {
        id: 'sum-a2',
        task: 'Approve Milestone 2 wireframes',
        owner: 'client',
        due: 'Wednesday EOD',
      },
      {
        id: 'sum-a3',
        task: 'Deliver hero copy',
        owner: 'client',
        due: 'Friday',
      },
    ],
    deadlinesDiscussed: [
      { id: 'sum-dl1', label: 'Homepage handoff', date: 'April 22' },
      { id: 'sum-dl2', label: 'Wireframe approval', date: 'Wednesday EOD' },
      { id: 'sum-dl3', label: 'Hero copy', date: 'Friday' },
    ],
  };
}
