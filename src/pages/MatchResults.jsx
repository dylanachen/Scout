import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MatchCard from '../components/MatchCard';
import MatchCompareModal from '../components/MatchCompareModal';
import WhyThisMatchDrawer from '../components/WhyThisMatchDrawer';
import { api } from '../api/client';
import { isDemoMode } from '../api/demoAdapter';
import { MOCK_MATCHES } from '../data/mockMatches';
import { useAuth } from '../hooks/useAuth';
import { getAggregatedReputation, getClientCompletedProjectCount } from '../utils/clientReputationStorage';
import { lsRead, lsWrite } from '../utils/localStore';
import { showToast } from '../utils/toast';

const SAVED_KEY = 'scout_saved_searches';

const SORTS = [
  { id: 'overall', labelKey: 'matches.sorts.bestMatch' },
  { id: 'skillFit', labelKey: 'matches.sorts.skillFit' },
  { id: 'timeline', labelKey: 'matches.sorts.timeline' },
  { id: 'budget', labelKey: 'matches.sorts.budget' },
];

function EmptyMatchesIllustration() {
  return (
    <svg width="160" height="140" viewBox="0 0 160 140" fill="none" aria-hidden style={{ marginBottom: 8 }}>
      <ellipse cx="80" cy="118" rx="52" ry="10" fill="var(--color-surface-3)" opacity="0.6" />
      <circle cx="80" cy="58" r="36" stroke="var(--color-border)" strokeWidth="2" fill="var(--color-surface)" />
      <path
        d="M62 58c0-10 8-18 18-18s18 8 18 18-8 18-18 18"
        stroke="var(--color-primary)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
      <circle cx="98" cy="44" r="5" stroke="var(--color-primary)" strokeWidth="2" fill="none" />
      <path d="M102 48l10 10" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="56" cy="32" r="3" fill="var(--color-text-3)" opacity="0.35" />
      <circle cx="118" cy="72" r="2.5" fill="var(--color-text-3)" opacity="0.3" />
      <circle cx="42" cy="78" r="2" fill="var(--color-text-3)" opacity="0.25" />
    </svg>
  );
}

export default function MatchResults() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const forceEmpty = params.get('empty') === '1';

  const [sortBy, setSortBy] = useState('overall');
  const [minimumRating, setMinimumRating] = useState(0);
  const [skillFilter, setSkillFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(8);
  const [passedIds, setPassedIds] = useState(() => new Set());
  const [interestIds, setInterestIds] = useState(() => new Set());
  const [repBump, setRepBump] = useState(0);
  const [savedSearches, setSavedSearches] = useState(() => lsRead(SAVED_KEY, []));
  const [compareIds, setCompareIds] = useState(() => new Set());
  const [compareOpen, setCompareOpen] = useState(false);
  const [whyMatch, setWhyMatch] = useState(null);

  const saveCurrentSearch = () => {
    const entry = {
      id: `ss_${Date.now()}`,
      name: [sortBy, minimumRating ? `${minimumRating}+` : null, skillFilter !== 'all' ? skillFilter : null].filter(Boolean).join(' · '),
      sortBy,
      minimumRating,
      skillFilter,
      savedAt: new Date().toISOString(),
    };
    const next = [entry, ...savedSearches].slice(0, 10);
    setSavedSearches(next);
    lsWrite(SAVED_KEY, next);
    showToast('Search saved', 'success');
  };

  const applySaved = (s) => {
    setSortBy(s.sortBy);
    setMinimumRating(s.minimumRating);
    setSkillFilter(s.skillFilter);
    showToast('Saved search applied', 'info');
  };

  const removeSaved = (id) => {
    const next = savedSearches.filter((s) => s.id !== id);
    setSavedSearches(next);
    lsWrite(SAVED_KEY, next);
  };

  const passWithUndo = (id) => {
    setPassedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    const toastEl = document.createElement('div');
    toastEl.className = 'scout-toast scout-toast--info';
    toastEl.innerHTML = `<span>Passed — </span><button style="background:none;border:none;color:#fff;font-weight:700;cursor:pointer;text-decoration:underline">Undo</button>`;
    toastEl.querySelector('button').addEventListener('click', () => {
      setPassedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toastEl.remove();
    });
    document.body.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 3200);
  };

  const toggleCompare = (id) => {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (next.size >= 3) return prev;
        next.add(id);
      }
      return next;
    });
  };

  useEffect(() => {
    const fn = () => setRepBump((x) => x + 1);
    window.addEventListener('scout-reputation-updated', fn);
    return () => window.removeEventListener('scout-reputation-updated', fn);
  }, []);

  const [apiMatches, setApiMatches] = useState(null);

  useEffect(() => {
    if (isDemoMode() || forceEmpty) return;
    let cancelled = false;
    (async () => {
      try {
        const [matchesRes, interestsRes] = await Promise.all([
          api.get('/matches'),
          api.get('/interests').catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        setApiMatches(Array.isArray(matchesRes.data) ? matchesRes.data : []);
        const existing = new Set();
        for (const p of interestsRes.data || []) {
          if (p?.id != null) existing.add(`match_${user?.id}_${p.id}`);
        }
        setInterestIds(existing);
      } catch {
        if (!cancelled) setApiMatches([]);
      }
    })();
    return () => { cancelled = true; };
  }, [forceEmpty, user?.id]);

  const baseList = forceEmpty ? [] : (apiMatches ?? (isDemoMode() ? MOCK_MATCHES : []));

  const withReputation = useMemo(() => {
    return baseList.map((m) => {
      const live = m.clientId ? getAggregatedReputation(m.clientId) : null;
      const reputation = live ?? m.seedReputation ?? null;
      const completedProjectsCount = getClientCompletedProjectCount(m.clientId, m.clientCompletedProjects ?? 0);
      return { ...m, reputation, completedProjectsCount };
    });
  }, [baseList, repBump]);

  const sorted = useMemo(() => {
    const list = [...withReputation];
    const key =
      sortBy === 'skillFit' ? 'skillFit' : sortBy === 'timeline' ? 'timeline' : sortBy === 'budget' ? 'budget' : 'overall';
    list.sort((a, b) => {
      if (key === 'overall') return b.overallScore - a.overallScore;
      return b.scores[key] - a.scores[key];
    });
    return list;
  }, [withReputation, sortBy]);

  const visible = sorted
    .filter((m) => !passedIds.has(m.id))
    .filter((m) => (m.reputation?.rating ?? 0) >= minimumRating)
    .filter((m) => (skillFilter === 'all' ? true : (m.primarySkill ?? '').toLowerCase().includes(skillFilter.toLowerCase())));
  const paginated = visible.slice(0, visibleCount);
  const count = visible.length;

  if (!authLoading && user && user.role !== 'client') {
    return <Navigate to="/" replace />;
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      <div style={{ padding: '24px 24px 0', flexShrink: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.02em' }}>{t('matches.title')}</h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-2)', margin: 0 }}>
          {count === 0 ? t('matches.none') : t('matches.countFound', { count })}
        </p>

        {count > 0 ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 8,
              marginTop: 18,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)' }}>{t('matches.sortBy')}</span>
            {SORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSortBy(s.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: sortBy === s.id ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: sortBy === s.id ? 'rgba(29, 110, 205, 0.08)' : 'var(--color-surface)',
                  color: sortBy === s.id ? 'var(--color-primary)' : 'var(--color-text-2)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {t(s.labelKey)}
              </button>
            ))}
            <label style={{ fontSize: 12, color: 'var(--color-text-3)', marginLeft: 8 }}>
              {t('matches.minRating')}
              <select
                value={minimumRating}
                onChange={(e) => setMinimumRating(Number(e.target.value))}
                aria-label={t('matches.minRating')}
                style={{ marginLeft: 8, borderRadius: 8, border: '1px solid var(--color-border)', padding: '5px 8px' }}
              >
                <option value={0}>{t('matches.any')}</option>
                <option value={3}>3.0+</option>
                <option value={4}>4.0+</option>
                <option value={4.5}>4.5+</option>
              </select>
            </label>
            <label style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
              {t('matches.skill')}
              <input
                value={skillFilter === 'all' ? '' : skillFilter}
                onChange={(e) => setSkillFilter(e.target.value || 'all')}
                placeholder={t('matches.skillPlaceholder')}
                aria-label={t('matches.skill')}
                style={{ marginLeft: 8, borderRadius: 8, border: '1px solid var(--color-border)', padding: '5px 8px' }}
              />
            </label>
            <button
              type="button"
              onClick={saveCurrentSearch}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', fontWeight: 600, fontSize: 12, cursor: 'pointer', color: 'var(--color-text-2)' }}
            >
              Save search
            </button>
            {compareIds.size >= 2 ? (
              <button
                type="button"
                onClick={() => setCompareOpen(true)}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--color-primary)', background: 'var(--color-primary)', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
              >
                Compare {compareIds.size}
              </button>
            ) : null}
          </div>
        ) : null}

        {savedSearches.length > 0 ? (
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-3)', alignSelf: 'center' }}>Saved:</span>
            {savedSearches.map((s) => (
              <span
                key={s.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 999,
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <button
                  type="button"
                  onClick={() => applySaved(s)}
                  style={{ border: 'none', background: 'none', fontSize: 11, cursor: 'pointer', color: 'var(--color-text-2)' }}
                >
                  {s.name || 'Saved search'}
                </button>
                <button
                  type="button"
                  onClick={() => removeSaved(s.id)}
                  aria-label="Remove saved search"
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-3)' }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {count === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              minHeight: 280,
              padding: 24,
            }}
          >
            <EmptyMatchesIllustration />
            <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 8px', color: 'var(--color-text)' }}>
              {t('matches.buildingTitle')}
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: '0 0 20px', maxWidth: 320, lineHeight: 1.5 }}>
              {t('matches.buildingBody')}
            </p>
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{
                padding: '10px 20px',
                borderRadius: 10,
                border: 'none',
                background: 'var(--color-primary)',
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {t('matches.goToDashboard')}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560 }}>
            {paginated.map((match) => (
              <div key={match.id} style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1, display: 'flex', gap: 6 }}>
                  <label
                    style={{
                      fontSize: 11,
                      color: 'var(--color-text-3)',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      padding: '3px 8px',
                      display: 'inline-flex',
                      gap: 4,
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={compareIds.has(match.id)}
                      onChange={() => toggleCompare(match.id)}
                      disabled={!compareIds.has(match.id) && compareIds.size >= 3}
                      style={{ margin: 0 }}
                    />
                    Compare
                  </label>
                  <button
                    type="button"
                    onClick={() => setWhyMatch(match)}
                    style={{
                      fontSize: 11,
                      color: 'var(--color-primary)',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      padding: '3px 8px',
                      cursor: 'pointer',
                    }}
                  >
                    Why this match?
                  </button>
                </div>
                <MatchCard
                  match={match}
                  interestSent={interestIds.has(match.id)}
                  passed={passedIds.has(match.id)}
                  onInterested={async () => {
                    const targetUserId = match.userId ?? Number(match.clientId) ?? null;
                    if (!targetUserId) {
                      showToast('Could not find this user.', 'error');
                      return;
                    }
                    setInterestIds((prev) => new Set(prev).add(match.id));
                    try {
                      await api.post(`/interests/${targetUserId}`);
                      showToast(`${match.name} added to Interests`, 'success');
                    } catch (e) {
                      setInterestIds((prev) => {
                        const next = new Set(prev);
                        next.delete(match.id);
                        return next;
                      });
                      showToast(
                        e?.response?.data?.detail || 'Failed to mark interest',
                        'error',
                      );
                    }
                  }}
                  onPass={() => passWithUndo(match.id)}
                  onViewProfile={() => {
                    navigate(`/profile/${match.username || match.id}`);
                  }}
                  viewerRole={user?.role}
                />
              </div>
            ))}
            {visible.length > paginated.length ? (
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 8)}
                style={{
                  width: '100%',
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  padding: '10px 12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t('matches.loadMore')}
              </button>
            ) : null}
          </div>
        )}
      </div>
      {compareOpen ? (
        <MatchCompareModal
          matches={sorted.filter((m) => compareIds.has(m.id))}
          onClose={() => setCompareOpen(false)}
        />
      ) : null}
      {whyMatch ? <WhyThisMatchDrawer match={whyMatch} onClose={() => setWhyMatch(null)} /> : null}
    </div>
  );
}
