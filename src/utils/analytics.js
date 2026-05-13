import { isDemoMode } from '../api/demoAdapter';
import { getFlag } from './featureFlags';

let initialized = false;

export function initAnalytics() {
  if (initialized) return;
  initialized = true;
  if (isDemoMode()) return;
  if (!getFlag('experimentalAnalytics')) return;

  if (typeof window !== 'undefined' && window.__SENTRY__) {
    try {
      window.__SENTRY__.init({ dsn: import.meta.env.VITE_SENTRY_DSN });
    } catch {
      /* noop */
    }
  }
}

export function trackEvent(name, props) {
  if (isDemoMode() || !getFlag('experimentalAnalytics')) return;
  try {
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture(name, props || {});
    }
  } catch {
    /* noop */
  }
}

export function trackPage(path) {
  trackEvent('$pageview', { path });
}

export function reportError(error, context) {
  if (typeof window === 'undefined') return;
  if (window.__SENTRY__ && window.__SENTRY__.captureException) {
    try {
      window.__SENTRY__.captureException(error, { extra: context });
    } catch {
      /* noop */
    }
  }
}
