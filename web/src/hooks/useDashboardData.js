import { useEffect, useState, useMemo } from 'react';
import { api } from '../api/client';
import { useAuth } from './useAuth';
import { normalizeProject } from '../utils/dashboard';

function sumOpenInvoiceCents(invoices) {
  return (invoices ?? []).reduce((acc, inv) => {
    if (inv.status === 'paid') return acc;
    const raw = inv.amount;
    if (typeof raw === 'string') {
      const digits = raw.replace(/[^0-9.]/g, '');
      const n = parseFloat(digits);
      if (!Number.isFinite(n)) return acc;
      return acc + Math.round(n * 100);
    }
    if (typeof raw === 'number' && Number.isFinite(raw)) return acc + Math.round(raw * 100);
    return acc;
  }, 0);
}

function buildFallbackSummary(projects, invoices, user) {
  const role = user?.role === 'client' ? 'client' : 'freelancer';
  const open = (invoices ?? []).filter((i) => i.status !== 'paid');
  const totalCents = sumOpenInvoiceCents(invoices);
  return {
    stats: {
      active_projects: projects.length,
      hours_logged_week: 0,
      pending_invoices_count: open.length,
      pending_invoices_total_cents: totalCents,
      unread_messages: projects.reduce((a, p) => a + (Number(p.unread_count) || 0), 0),
    },
    projects: projects.map((p) => normalizeProject(p, role)),
    pendingMatches: [],
    notifications: [],
    pipeline: null,
  };
}

export function useDashboardData() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [summary, setSummary] = useState(null);
  const [rawProjects, setRawProjects] = useState([]);
  const [rawInvoices, setRawInvoices] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const sumRes = await api.get('/dashboard/summary').catch(() => null);
        if (sumRes?.status === 200 && sumRes.data && !cancelled) {
          setSummary(sumRes.data);
          setRawProjects([]);
          setRawInvoices([]);
          return;
        }
        const [p, inv] = await Promise.all([api.get('/projects'), api.get('/invoices')]);
        if (cancelled) return;
        setSummary(null);
        setRawProjects(p.data ?? []);
        setRawInvoices(inv.data ?? []);
      } catch (e) {
        if (!cancelled) {
          setErr('Could not load dashboard — start the FastAPI backend or enable demo mode.');
          setSummary(null);
          setRawProjects([]);
          setRawInvoices([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const data = useMemo(() => {
    const role = user?.role === 'client' ? 'client' : 'freelancer';
    const baseStats = {
      active_projects: 0,
      hours_logged_week: null,
      pending_invoices_count: 0,
      pending_invoices_total_cents: 0,
      unread_messages: 0,
    };
    if (summary) {
      const projects = (summary.projects ?? []).map((p) => normalizeProject(p, role));
      return {
        stats: { ...baseStats, ...summary.stats },
        projects,
        pendingMatches: summary.pending_matches ?? summary.pendingMatches ?? [],
        notifications: summary.notifications ?? [],
        pipeline: summary.pipeline ?? null,
      };
    }
    const fb = buildFallbackSummary(rawProjects, rawInvoices, user);
    return {
      stats: { ...baseStats, ...fb.stats },
      projects: fb.projects,
      pendingMatches: fb.pendingMatches,
      notifications: fb.notifications,
      pipeline: fb.pipeline,
    };
  }, [summary, rawProjects, rawInvoices, user]);

  return { loading, err, ...data };
}
