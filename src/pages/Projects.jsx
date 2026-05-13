import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ProjectCard from '../components/ProjectCard';
import EmptyState from '../components/states/EmptyState';
import ErrorState from '../components/states/ErrorState';
import Skeleton from '../components/states/Skeleton';
import { useAuth } from '../hooks/useAuth';
import { useDashboardData } from '../hooks/useDashboardData';
import { useUnreadMessages } from '../hooks/useUnreadMessages';
import { getBookmarks, saveBookmarks } from '../utils/bookmarksStorage';

export default function Projects() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { loading, err, projects } = useDashboardData();
  const { counts: unreadCounts } = useUnreadMessages();
  const isClient = user?.role === 'client';
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('deadline');
  const [visibleCount, setVisibleCount] = useState(8);
  const [bookmarkedIds, setBookmarkedIds] = useState(() => getBookmarks());

  const liveUnreadFor = (projectId) => {
    const key = String(projectId);
    return Object.prototype.hasOwnProperty.call(unreadCounts, key)
      ? Number(unreadCounts[key]) || 0
      : undefined;
  };

  const filtered = useMemo(() => {
    let list = [...projects];
    if (statusFilter !== 'all') {
      list = list.filter((project) => project.status === statusFilter);
    }
    if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'rate') {
      list.sort((a, b) => (b.hourly_rate ?? 0) - (a.hourly_rate ?? 0));
    } else {
      list.sort((a, b) => String(a.next_deadline ?? '').localeCompare(String(b.next_deadline ?? '')));
    }
    // Always float projects with unread messages to the top so users can find them.
    list.sort((a, b) => {
      const ua = liveUnreadFor(a.id) ?? a.unread_count ?? 0;
      const ub = liveUnreadFor(b.id) ?? b.unread_count ?? 0;
      return (ub > 0 ? 1 : 0) - (ua > 0 ? 1 : 0);
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, statusFilter, sortBy, unreadCounts]);

  const visibleProjects = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleProjects.length;

  const toggleBookmark = (projectId) => {
    const next = new Set(bookmarkedIds);
    if (next.has(projectId)) {
      next.delete(projectId);
    } else {
      next.add(projectId);
    }
    setBookmarkedIds(next);
    saveBookmarks(next);
  };

  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 88px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.03em' }}>{t('projects.title')}</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: 0 }}>{t('projects.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link
            to="/pipeline"
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              fontWeight: 600,
              fontSize: 13,
              textDecoration: 'none',
              background: 'var(--color-surface)',
            }}
          >
            {t('projects.pipeline')}
          </Link>
          {isClient && (
            <Link
              to="/projects/new"
              style={{
                padding: '10px 18px',
                borderRadius: 10,
                background: 'var(--color-primary)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 13,
                textDecoration: 'none',
              }}
            >
              {t('projects.newProject')}
            </Link>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <select aria-label={t('projects.filters.statusAria')} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ borderRadius: 8, border: '1px solid var(--color-border)', padding: '8px 10px' }}>
          <option value="all">{t('projects.filters.allStatuses')}</option>
          <option value="in_progress">{t('projects.filters.inProgress')}</option>
          <option value="needs_client">{t('projects.filters.needsClient')}</option>
          <option value="completed">{t('projects.filters.completed')}</option>
        </select>
        <select aria-label={t('projects.filters.sortAria')} value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ borderRadius: 8, border: '1px solid var(--color-border)', padding: '8px 10px' }}>
          <option value="deadline">{t('projects.filters.sortDeadline')}</option>
          <option value="name">{t('projects.filters.sortName')}</option>
          <option value="rate">{t('projects.filters.sortRate')}</option>
        </select>
      </div>
      {err ? <ErrorState message={err} /> : null}
      {loading ? (
        <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
          <Skeleton height={100} />
          <Skeleton height={100} />
          <Skeleton height={100} />
        </div>
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 14,
        }}
      >
        {visibleProjects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            unreadCount={liveUnreadFor(p.id)}
            onToggleBookmark={toggleBookmark}
            isBookmarked={bookmarkedIds.has(p.id)}
          />
        ))}
      </div>
      {!filtered.length && !loading ? (
        <EmptyState title={t('dashboardPage.noActiveProjects')} message={t('projects.empty')} />
      ) : null}
      {hasMore ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + 8)}
            style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: '10px 14px', background: 'var(--color-surface)', color: 'var(--color-text)', fontWeight: 600, cursor: 'pointer' }}
          >
            {t('projects.loadMore')}
          </button>
        </div>
      ) : null}

      <Link
        to="/onboarding"
        className="scout-fab"
        aria-label={t('projects.startProjectAria')}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--color-primary)',
          color: '#fff',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          fontWeight: 300,
          boxShadow: '0 4px 14px rgba(29, 110, 205, 0.35)',
          textDecoration: 'none',
          zIndex: 900,
        }}
      >
        +
      </Link>
    </div>
  );
}
