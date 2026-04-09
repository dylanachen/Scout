import { NOTIFICATION_TYPES } from '../utils/notificationModel';

const DEMO_PROJECT = '1';

/** Raw seeds merged when API returns no notifications (demo / offline). */
export const DEMO_NOTIFICATION_SEEDS = [
  {
    id: 'demo-match-1',
    type: NOTIFICATION_TYPES.MATCH,
    title: 'New match available',
    description: 'Acme Corp is looking for a product designer with your stack.',
    at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    projectId: DEMO_PROJECT,
  },
  {
    id: 'demo-msg-1',
    type: NOTIFICATION_TYPES.MESSAGE,
    title: 'New message in chat',
    description: 'Sarah left a reply in the brand refresh thread.',
    at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    projectId: DEMO_PROJECT,
  },
  {
    id: 'demo-scope-1',
    type: NOTIFICATION_TYPES.SCOPE,
    title: 'Scope flag raised',
    description: 'Deliverable count increased beyond the agreed scope.',
    at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    projectId: DEMO_PROJECT,
  },
  {
    id: 'demo-decision-1',
    type: NOTIFICATION_TYPES.DECISION,
    title: 'Decision logged',
    description: 'You approved the revised timeline in chat.',
    at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    projectId: DEMO_PROJECT,
  },
  {
    id: 'demo-milestone-1',
    type: NOTIFICATION_TYPES.MILESTONE,
    title: 'Milestone due',
    description: 'Design handoff is due tomorrow.',
    at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    projectId: DEMO_PROJECT,
  },
  {
    id: 'demo-inv-1',
    type: NOTIFICATION_TYPES.INVOICE_VIEWED,
    title: 'Invoice viewed by client',
    description: 'Invoice #1042 was opened by the client.',
    at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    projectId: DEMO_PROJECT,
  },
  {
    id: 'demo-co-1',
    type: NOTIFICATION_TYPES.CHANGE_ORDER,
    title: 'Change order signed',
    description: 'Additional discovery hours are now approved.',
    at: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
    projectId: DEMO_PROJECT,
  },
  {
    id: 'demo-meet-1',
    type: NOTIFICATION_TYPES.MEETING_SUMMARY,
    title: 'Meeting summary ready',
    description: 'Notes from yesterday’s sync are ready.',
    at: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
    projectId: DEMO_PROJECT,
  },
  {
    id: 'demo-var-1',
    type: NOTIFICATION_TYPES.VARIANCE,
    title: 'Variance alert',
    description: 'This week’s hours are 12% over the planned burn.',
    at: new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString(),
    projectId: DEMO_PROJECT,
  },
];
