import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MatchCard from '../components/MatchCard';
import InviteToProjectModal from '../components/InviteToProjectModal';
import { isDemoMode } from '../api/demoAdapter';
import { MOCK_MATCHES } from '../data/mockMatches';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import { getAggregatedReputation, getClientCompletedProjectCount } from '../utils/clientReputationStorage';

const SORTS = [
  { id: 'overall', label: 'Best Match' },
  { id: 'skillFit', label: 'Skill Fit' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'budget', label: 'Budget' },
];

function EmptyMatchesIllustration() {
  return (
    <svg width="160" height="140" viewBox="0 0 160 140" fill="none" aria-hidden style={{ marginBottom: 8 }}>
      <ellipse cx="80" cy="118" rx="52" ry="10" fill="var(--color-surface-3)" opacity="0.6" />
      <circle cx="80" cy="58" r="36" stroke="var(--color-border)" strokeWidth="2" fill="var(--color-surface)" />
      <path d="M62 58c0-10 8-18 18-18s18 8 18 18-8 18-18 18" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.5" />
      <circle cx="98" cy="44" r="5" stroke="var(--color-primary)" strokeWidth="2" fill="none" />
      <path d="M102 48l10 10" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function MatchResults() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const forceEmpty = params.get('empty') === '1';
  const isClient = user?.role === 'client';

  const [sortBy, setSortBy] = useState('overall');
  const [tab, setTab] = useState('all'); // 'all' | 'interested'
  const [passedIds, setPassedIds] = useState(() => new Set());
  const [interestIds, setInterestIds] = useState(() => new Set());
  const [inviteTarget, setInviteTarget] = useState(null);

  const [apiMatches, setApiMatches] = useState(null);

  useEffect(() => {
    if (isDemoMode() || forceEmpty) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/matches');
        if (!cancelled) {
          const list = Array.isArray(data) ? data : [];
          setApiMatches(list);
          setInterestIds(new Set(list.filter((m) => m.interested).map((m) => m.id)));
        }
      } catch {
        if (!cancelled) setApiMatches([]);
      }
    })();
    return () => { cancelled = true; };
  }, [forceEmpty]);

  const baseList = forceEmpty ? [] : (apiMatches ?? (isDemoMode() ? MOCK_MATCHES : []));

  const withReputation = useMemo(() => {
    return baseList.map((m) => {
      const live = m.clientId ? getAggregatedReputation(m.clientId) : null;
      const reputation = live ?? m.seedReputation ?? null;
      const completedProjectsCount = getClientCompletedProjectCount(m.clientId, m.clientCompletedProjects ?? 0);
      return { ...m, reputation, completedProjectsCount };
    });
  }, [baseList]);

  const sorted = useMemo(() => {
    const list = [...withReputation];
    const key = sortBy === 'skillFit' ? 'skillFit' : sortBy === 'timeline' ? 'timeline' : sortBy === 'budget' ? 'budget' : 'overall';
    list.sort((a, b) => {
      if (key === 'overall') return b.overallScore - a.overallScore;
      return (b.scores?.[key] ?? 0) - (a.scores?.[key] ?? 0);
    });
    return list;
  }, [withReputation, sortBy]);

  const filteredByTab = tab === 'interested' ? sorted.filter((m) => interestIds.has(m.id)) : sorted;
  const visible = filteredByTab.filter((m) => !passedIds.has(m.id));
  const count = visible.length;

  const handleInterested = async (match) => {
    setInterestIds((prev) => new Set(prev).add(match.id));
    if (!isDemoMode() && match.userId != null) {
      try { await api.post(`/interests/${match.userId}`); } catch { /* noop */ }
    }
    if (isClient && match.userId != null) {
      // Clients jump straight to inviting to a project
      setInviteTarget({ id: match.userId, name: match.name });
    } else {
      navigate('/matches/confirm', {
        state: {
          projectName: match.projectName,
          projectSummary: match.projectSummary,
          me: { name: user?.name ?? 'You', avatarUrl: user?.avatar_url ?? null },
          other: { name: match.name, avatarUrl: match.avatarUrl ?? null, role: match.role },
        },
      });
    }
  };

  const handleUnInterested = async (match) => {
    setInterestIds((prev) => {
      const next = new Set(prev); next.delete(match.id); return next;
    });
    if (!isDemoMode() && match.userId != null) {
      try { await api.delete(`/interests/${match.userId}`); } catch { /* noop */ }
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      <div style={{ padding: '24px 24px 0', flexShrink: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>Your matches</h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-2)', margin: 0 }}>
          {count === 0 ? 'No matches yet' : `${count} ${count === 1 ? 'match' : 'matches'}`}
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginTop: 16, borderBottom: '1px solid var(--color-border)' }}>
          {[
            { id: 'all', label: 'All matches' },
            { id: 'interested', label: `Interested (${interestIds.size})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                padding: '10px 16px',
                background: 'none',
                border: 'none',
                borderBottom: tab === t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: tab === t.id ? 'var(--color-primary)' : 'var(--color-text-2)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {sorted.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)' }}>Sort by</span>
            {SORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSortBy(s.id)}
                style={{
                  padding: '6px 12px', borderRadius: 8,
                  border: sortBy === s.id ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: sortBy === s.id ? 'rgba(29, 110, 205, 0.08)' : 'var(--color-surface)',
                  color: sortBy === s.id ? 'var(--color-primary)' : 'var(--color-text-2)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {count === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 280, padding: 24 }}>
            <EmptyMatchesIllustration />
            <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 8px' }}>
              {tab === 'interested' ? 'No interested matches yet' : "We're still building your matches"}
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: '0 0 20px', maxWidth: 320, lineHeight: 1.5 }}>
              {tab === 'interested'
                ? 'Mark people as interested from the All matches tab.'
                : "When we find people who fit your skills and preferences, they'll show up here."}
            </p>
            {tab === 'interested' ? (
              <button type="button" onClick={() => setTab('all')}
                style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                See all matches
              </button>
            ) : (
              <button type="button" onClick={() => navigate('/')}
                style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Go to Dashboard
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560 }}>
            {visible.map((match) => {
              const sent = interestIds.has(match.id);
              const showInterestActions = sent && isClient && match.userId != null;
              const footer = showInterestActions ? (
                <>
                  <button
                    type="button"
                    onClick={() => setInviteTarget({ id: match.userId, name: match.name })}
                    style={{
                      padding: '8px 14px', borderRadius: 8, border: 'none',
                      background: 'var(--color-primary)', color: '#fff',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    Invite to project
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUnInterested(match)}
                    style={{
                      padding: '8px 14px', borderRadius: 8,
                      border: '1px solid var(--color-border)',
                      background: 'transparent', color: 'var(--color-text-2)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Remove interest
                  </button>
                </>
              ) : null;

              return (
                <MatchCard
                  key={match.id}
                  match={match}
                  interestSent={sent}
                  passed={passedIds.has(match.id)}
                  onInterested={() => handleInterested(match)}
                  onPass={() => setPassedIds((prev) => new Set(prev).add(match.id))}
                  onViewProfile={() => navigate(`/profile/${match.username || match.id}`)}
                  viewerRole={user?.role}
                  footerActions={footer}
                />
              );
            })}
          </div>
        )}
      </div>

      {inviteTarget && (
        <InviteToProjectModal
          target={inviteTarget}
          onClose={() => setInviteTarget(null)}
          onInvited={() => setInviteTarget(null)}
        />
      )}
    </div>
  );
}
