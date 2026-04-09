import ClientReputationBadge from './ClientReputationBadge';

function ScoreRing({ percent, size = 76 }) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, percent)) / 100) * c;
  const cx = size / 2;
  const cy = size / 2;
  const ringColor = percent >= 80 ? '#16a34a' : percent >= 60 ? '#ca8a04' : '#dc2626';

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-border)" strokeWidth={stroke} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          pointerEvents: 'none',
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>{percent}%</span>
        <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase' }}>
          match
        </span>
      </div>
    </div>
  );
}

function MiniBar({ label, value }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-2)' }}>{label}</span>
        <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{value}%</span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 4,
          background: 'var(--color-surface-3)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${value}%`,
            borderRadius: 4,
            background: 'linear-gradient(90deg, var(--color-primary), #4f8fd9)',
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  );
}

function Avatar({ name, url }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  if (url) {
    return (
      <img
        src={url}
        alt=""
        style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-border)' }}
      />
    );
  }
  return (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--color-surface-3), #dbe4f0)',
        border: '2px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: 18,
        color: 'var(--color-text-2)',
      }}
      aria-hidden
    >
      {initial}
    </div>
  );
}

function AvailabilityIndicator({ available, availableFrom }) {
  if (available) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>Available now</span>
      </div>
    );
  }
  if (availableFrom) {
    const d = new Date(availableFrom);
    const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ca8a04', flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: '#ca8a04', fontWeight: 600 }}>Available from {label}</span>
      </div>
    );
  }
  return null;
}

function PortfolioPreview({ items }) {
  if (!items || !items.length) return null;
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {items.slice(0, 3).map((p) => (
        <div
          key={p.id}
          style={{
            width: 72,
            height: 52,
            borderRadius: 8,
            background: p.gradient || 'var(--color-surface-3)',
            border: '1px solid var(--color-border)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'flex-end',
            padding: 4,
          }}
          title={p.label}
        >
          {p.label ? (
            <span style={{ fontSize: 8, fontWeight: 600, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
              {p.label}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default function MatchCard({
  match,
  onInterested,
  onPass,
  onViewProfile,
  interestSent,
  passed,
  viewerRole,
}) {
  const {
    name,
    role,
    specialty,
    location,
    avatarUrl,
    overallScore,
    scores,
    explanation,
    timelineTightWarning,
    reputation,
    completedProjectsCount,
    available,
    availableFrom,
    portfolio,
  } = match;
  const disabled = interestSent || passed;
  const isFreelancer = viewerRole === 'freelancer';

  return (
    <article
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 14,
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        boxShadow: '0 1px 2px rgba(15, 22, 35, 0.04)',
      }}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Avatar name={name} url={avatarUrl} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>{name}</div>
            {isFreelancer ? (
              <ClientReputationBadge
                reputation={reputation}
                completedProjectsCount={completedProjectsCount ?? 0}
                compact
              />
            ) : null}
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-2)', marginTop: 2 }}>
            {role}
            {specialty ? <span style={{ color: 'var(--color-text-3)' }}> &middot; {specialty}</span> : null}
            {location ? <span style={{ color: 'var(--color-text-3)' }}> &middot; {location}</span> : null}
          </div>
          <AvailabilityIndicator available={available} availableFrom={availableFrom} />
        </div>
        <ScoreRing percent={overallScore} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <MiniBar label="Skill Fit" value={scores.skillFit} />
        <MiniBar label="Communication Style" value={scores.communication} />
        <MiniBar label="Timeline Match" value={scores.timeline} />
        <MiniBar label="Budget Alignment" value={scores.budget} />
      </div>

      <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-2)', fontStyle: 'italic', lineHeight: 1.45 }}>
        {explanation}
      </p>

      <PortfolioPreview items={portfolio} />

      <button
        type="button"
        onClick={() => onViewProfile?.(match)}
        style={{
          alignSelf: 'flex-start',
          padding: 0,
          border: 'none',
          background: 'none',
          color: 'var(--color-primary)',
          fontWeight: 600,
          fontSize: 13,
          cursor: 'pointer',
          textDecoration: 'underline',
          textUnderlineOffset: 3,
          fontFamily: 'var(--font-sans)',
        }}
      >
        View full profile
      </button>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onInterested?.(match)}
          style={{
            padding: '10px 18px',
            borderRadius: 10,
            border: 'none',
            background: disabled ? 'var(--color-surface-3)' : 'var(--color-primary)',
            color: disabled ? 'var(--color-text-3)' : '#fff',
            fontWeight: 600,
            fontSize: 13,
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {interestSent ? 'Interest sent' : "I'm interested"}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onPass?.(match)}
          style={{
            padding: '10px 18px',
            borderRadius: 10,
            border: '1px solid var(--color-border)',
            background: 'transparent',
            color: 'var(--color-text-2)',
            fontWeight: 600,
            fontSize: 13,
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {passed ? 'Passed' : 'Pass'}
        </button>
      </div>

      {isFreelancer && timelineTightWarning ? (
        <div
          role="status"
          style={{
            marginTop: 2,
            padding: '10px 12px',
            borderRadius: 8,
            background: '#fefce8',
            border: '1px solid #fde047',
            fontSize: 12,
            color: '#854d0e',
            lineHeight: 1.4,
          }}
        >
          <strong style={{ fontWeight: 700 }}>Heads up:</strong> this client&apos;s timeline may be tight for the described scope.
        </div>
      ) : null}
    </article>
  );
}
