/** Public profile fields not yet on /auth/me — keyed by user id. */

import { isDemoMode } from '../api/demoAdapter';

const KEY = (id) => `scout_profile_extras_${id}`;

const empty = () => ({
  specialty: null,
  location: null,
  bio: null,
  memberSince: null,
  projectsCompleted: null,
  skills: [],
  availability: null,
  responseTime: null,
});

const demoDefaults = () => ({
  specialty: 'Product design & frontend',
  location: 'Vancouver, BC',
  bio: 'I help teams ship polished web experiences — from discovery and UI systems to production-ready React. I care about clarity, performance, and collaboration.',
  memberSince: '2024-03',
  projectsCompleted: 24,
  skills: ['Figma', 'React', 'Design systems', 'Prototyping', 'Accessibility'],
  availability: 'Yes, immediately',
  responseTime: '< 2 hours',
});

function defaults() {
  return isDemoMode() ? { ...empty(), ...demoDefaults() } : empty();
}

export function getProfileExtras(userId) {
  if (userId == null) return defaults();
  try {
    const raw = localStorage.getItem(KEY(userId));
    if (!raw) return defaults();
    const parsed = JSON.parse(raw);
    return { ...defaults(), ...parsed };
  } catch {
    return defaults();
  }
}

export function setProfileExtras(userId, patch) {
  if (userId == null) return;
  try {
    const prev = getProfileExtras(userId);
    localStorage.setItem(KEY(userId), JSON.stringify({ ...prev, ...patch }));
  } catch {
    /* ignore */
  }
}
