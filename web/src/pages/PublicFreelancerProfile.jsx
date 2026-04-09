import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isDemoMode } from '../api/demoAdapter';
import { getProfileExtras } from '../utils/profileExtrasStorage';
import { getPortfolioItemsForFreelancer } from '../utils/portfolioStorage';
import { getTestimonialsForFreelancer } from '../utils/testimonialStorage';
import { demoPortfolioSeed, demoTestimonialsSeed } from '../data/demoPublicProfile';
import PortfolioItemCard from '../components/portfolio/PortfolioItemCard';
import PortfolioItemDetailModal from '../components/portfolio/PortfolioItemDetailModal';

function averageRating(rows) {
  if (!rows.length) return null;
  const s = rows.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
  return Math.round((s / rows.length) * 10) / 10;
}

export default function PublicFreelancerProfile() {
  const { username } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);

  const isOwn = user && (String(user.id) === String(username) || user.username === username);
  const isClientViewer = user?.role === 'client';
  const showHireCta = isClientViewer && !isOwn;
  const guestViewer = !user && !isOwn;

  const extras = useMemo(() => getProfileExtras(username), [username]);

  const displayName = useMemo(() => {
    if (isOwn && user?.name) return user.name;
    if (extras.displayName) return extras.displayName;
    if (isDemoMode() && (String(username) === '1' || username === 'angela-kang')) return 'Angela Kang';
    const parts = String(username).split('-');
    if (parts.length >= 2) return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    return `Freelancer \u00b7 ${username}`;
  }, [isOwn, user?.name, username, extras.displayName]);

  const avatarUrl = isOwn ? user?.avatar_url : null;

  const portfolioRaw = useMemo(() => getPortfolioItemsForFreelancer(username), [username]);
  const portfolio = portfolioRaw.length ? portfolioRaw : isDemoMode() ? demoPortfolioSeed(username) : [];

  const testimonialsRaw = useMemo(() => getTestimonialsForFreelancer(username), [username]);
  const testimonials = testimonialsRaw.length ? testimonialsRaw : isDemoMode() ? demoTestimonialsSeed(username, displayName) : [];

  const avg = averageRating(testimonials);
  const projectsDone = extras.projectsCompleted ?? portfolioRaw.length;

  const availBadge = useMemo(() => {
    const raw = extras.availability;
    if (!raw) return null;
    if (raw === 'Yes, immediately')
      return { label: 'Available now', color: '#15803d', bg: '#ecfdf3', border: '#86efac', dot: '#16a34a' };
    if (raw.startsWith('Yes, starting')) {
      const dateStr = raw.replace('Yes, starting ', '');
      return { label: `Available ${dateStr}`, color: '#92400e', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b' };
    }
    if (raw === 'No, just browsing for now')
      return { label: 'Not available', color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db', dot: '#9ca3af' };
    return { label: raw, color: '#15803d', bg: '#ecfdf3', border: '#86efac', dot: '#16a34a' };
  }, [extras.availability]);

  const goMessage = () => {
    if (guestViewer) {
      navigate('/login', { state: { from: 'public_profile', freelancerId: username } });
      return;
    }
    navigate('/chat', { state: { hireIntent: { freelancerId: username, name: displayName } } });
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-surface-2)', paddingBottom: !isOwn ? 72 : 0 }}>
      <style>{`
        .fos-portfolio-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        @media (min-width: 640px) {
          .fos-portfolio-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        .fos-testimonials-scroll {
          display: flex;
          overflow-x: auto;
          gap: 12px;
          padding-bottom: 8px;
          -webkit-overflow-scrolling: touch;
          scroll-snap-type: x mandatory;
        }
        .fos-testimonials-scroll::-webkit-scrollbar { height: 4px; }
        .fos-testimonials-scroll::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 4px; }
        .fos-testimonial-card {
          scroll-snap-align: start;
          min-width: 280px;
          max-width: 340px;
          flex-shrink: 0;
          padding: 16px 18px;
          border-radius: 12px;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
        }
      `}</style>

      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          height: 52,
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          borderBottom: '1px solid var(--color-border)',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Link to={user ? '/' : '/login'} style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)', textDecoration: 'none' }}>
          &larr; FreelanceOS
        </Link>
        {isOwn ? (
          <Link
            to="/settings"
            style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}
          >
            Account settings
          </Link>
        ) : null}
      </header>

      {/* Cover */}
      <div
        style={{
          height: 160,
          background: 'linear-gradient(135deg, #1d4ed8 0%, #5b21b6 45%, #0f172a 100%)',
          position: 'relative',
        }}
      />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px 48px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-end', marginTop: -56 }}>
          <div
            style={{
              width: 112,
              height: 112,
              borderRadius: '50%',
              border: '4px solid var(--color-surface)',
              background: avatarUrl ? `url(${avatarUrl}) center/cover` : 'var(--color-surface-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 36,
              fontWeight: 800,
              color: 'var(--color-text-2)',
              flexShrink: 0,
              boxShadow: '0 8px 24px rgba(15, 22, 35, 0.12)',
            }}
          >
            {!avatarUrl ? displayName.slice(0, 1).toUpperCase() : null}
          </div>
          <div style={{ flex: 1, minWidth: 200, paddingBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 26, letterSpacing: '-0.03em' }}>{displayName}</h1>
              {availBadge ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: availBadge.bg,
                    color: availBadge.color,
                    border: `1px solid ${availBadge.border}`,
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: availBadge.dot, flexShrink: 0 }} />
                  {availBadge.label}
                </span>
              ) : null}
            </div>
            {(extras.specialty || extras.location) ? (
              <p style={{ margin: '6px 0 0', fontSize: 15, color: 'var(--color-text-2)' }}>
                {[extras.specialty, extras.location].filter(Boolean).join(' \u00b7 ')}
              </p>
            ) : null}
          </div>
          {!isOwn ? (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginLeft: 'auto' }}>
              {showHireCta ? (
                <button
                  type="button"
                  onClick={goMessage}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'var(--color-primary)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  Hire Me
                </button>
              ) : null}
              {guestViewer ? (
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'var(--color-primary)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  Sign in to hire
                </button>
              ) : null}
              <button
                type="button"
                onClick={goMessage}
                style={{
                  padding: '10px 20px',
                  borderRadius: 10,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {guestViewer ? 'Sign in to message' : 'Message on platform'}
              </button>
            </div>
          ) : null}
        </div>

        {extras.bio ? (
          <p style={{ margin: '20px 0 0', fontSize: 15, lineHeight: 1.65, color: 'var(--color-text-2)', maxWidth: 720 }}>
            {extras.bio}
          </p>
        ) : null}

        {/* Stats */}
        <div
          style={{
            marginTop: 24,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
          }}
        >
          <StatCard label="Projects completed" value={projectsDone != null ? String(projectsDone) : '\u2014'} />
          <StatCard label="Average rating" value={avg != null ? `${avg} / 5` : '\u2014'} />
          <StatCard label="Response time" value={extras.responseTime ?? '\u2014'} />
        </div>

        <section style={{ marginTop: 36 }}>
          <h2 style={{ fontSize: 18, margin: '0 0 14px', letterSpacing: '-0.02em' }}>Portfolio</h2>
          {portfolio.length ? (
            <div className="fos-portfolio-grid">
              {portfolio.map((item) => (
                <PortfolioItemCard key={item.id} item={item} onOpen={setDetail} />
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 14, color: 'var(--color-text-3)' }}>No portfolio items yet.</p>
          )}
        </section>

        {(extras.skills?.length > 0) ? (
          <section style={{ marginTop: 36 }}>
            <h2 style={{ fontSize: 18, margin: '0 0 12px', letterSpacing: '-0.02em' }}>Skills</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {extras.skills.map((s) => (
              <span
                key={s}
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {s}
              </span>
              ))}
            </div>
          </section>
        ) : null}

        <section style={{ marginTop: 36 }}>
          <h2 style={{ fontSize: 18, margin: '0 0 14px', letterSpacing: '-0.02em' }}>Client testimonials</h2>
          {testimonials.length ? (
            <>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--color-text-3)' }}>
                Pulled from completed projects. New reviews may appear after a short moderation step.
              </p>
              <div className="fos-testimonials-scroll">
                {testimonials.map((t) => {
              const initial = (t.clientName || '?').trim().charAt(0).toUpperCase();
              return (
                <div key={t.id} className="fos-testimonial-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--color-surface-3), #dbe4f0)',
                        border: '1px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 13,
                        color: 'var(--color-text-2)',
                        flexShrink: 0,
                      }}
                    >
                      {initial}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{t.clientName}</div>
                      {t.projectName ? (
                        <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 1 }}>{t.projectName}</div>
                      ) : null}
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: 13, color: '#ca8a04', flexShrink: 0 }} aria-hidden>
                      {'\u2605'.repeat(Math.min(5, Math.max(0, Number(t.rating) || 0)))}
                    </div>
                  </div>
                  {t.text ? <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--color-text)' }}>{t.text}</p> : null}
                </div>
              );
              })}
              </div>
            </>
          ) : (
            <p style={{ fontSize: 14, color: 'var(--color-text-3)' }}>No testimonials yet.</p>
          )}
        </section>
      </div>

      {!isOwn ? (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 20,
            padding: '12px 20px',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={goMessage}
            style={{
              flex: 1,
              maxWidth: 420,
              padding: '12px 20px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--color-primary)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            I&apos;m Interested
          </button>
        </div>
      ) : null}

      {detail ? <PortfolioItemDetailModal item={detail} onClose={() => setDetail(null)} /> : null}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div
      style={{
        padding: '14px 16px',
        borderRadius: 12,
        border: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-3)' }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, letterSpacing: '-0.02em' }}>{value}</div>
    </div>
  );
}
