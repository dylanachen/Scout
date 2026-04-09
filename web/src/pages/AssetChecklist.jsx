import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateChecklistItemsFromBrief } from '../utils/assetChecklistFromBrief';

function loadClientOnboarding() {
  try {
    const raw = sessionStorage.getItem('fos_onboarding_client');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default function AssetChecklist() {
  const navigate = useNavigate();
  const [items, setItems] = useState(() => {
    const answers = loadClientOnboarding();
    const brief = answers.brief_seed ?? '';
    const rows = generateChecklistItemsFromBrief(brief);
    return rows.map((r) => ({
      ...r,
      status: null,
      dueDate: '',
      fileName: null,
    }));
  });

  useEffect(() => {
    const answers = loadClientOnboarding();
    if (!answers?.name_company && !answers?.brief_seed) {
      navigate('/onboarding/client', { replace: true });
    }
  }, [navigate]);

  const allSet = useMemo(
    () =>
      items.length > 0 &&
      items.every((i) => {
        if (i.status == null) return false;
        if (i.status === 'later') return Boolean(i.dueDate);
        return true;
      }),
    [items],
  );

  const setStatus = (id, status) => {
    setItems((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (status == null) return { ...row, status: null, dueDate: '' };
        if (status === 'ready' || status === 'na') return { ...row, status, dueDate: '' };
        if (status === 'later') return { ...row, status: 'later', dueDate: row.dueDate ?? '' };
        return row;
      }),
    );
  };

  const setDue = (id, dueDate) => {
    setItems((prev) => prev.map((row) => (row.id === id ? { ...row, dueDate } : row)));
  };

  const onFile = (id, file) => {
    setItems((prev) =>
      prev.map((row) => (row.id === id ? { ...row, fileName: file ? file.name : null } : row)),
    );
  };

  const confirm = () => {
    const reminders = items
      .filter((i) => i.status === 'later' && i.dueDate)
      .map((i) => ({ id: i.id, label: i.label, dueDate: i.dueDate }));
    try {
      sessionStorage.setItem(
        'fos_asset_checklist',
        JSON.stringify({
          items: items.map(({ id, label, status, dueDate, fileName }) => ({ id, label, status, dueDate, fileName })),
          reminders,
        }),
      );
    } catch {
      /* ignore */
    }
    navigate('/onboarding/matching?role=client', { replace: true });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-surface-2)',
        padding: '24px 18px calc(24px + env(safe-area-inset-bottom, 0px))',
        maxWidth: 720,
        margin: '0 auto',
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
        Before we find your match
      </h1>
      <p style={{ fontSize: 14, color: 'var(--color-text-2)', marginBottom: 24, lineHeight: 1.5 }}>
        Freelancers work faster when assets are ready from day one. Here&apos;s what you&apos;ll likely need for this project.
      </p>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {items.map((row) => (
          <li
            key={row.id}
            style={{
              padding: 14,
              borderRadius: 12,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.45 }}>{row.label}</div>

            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              {['ready', 'later', 'na'].map((s) => {
                const labels = { ready: 'Ready', later: "I'll send by…", na: 'Not needed' };
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(row.id, s)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: `1px solid ${row.status === s ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: row.status === s ? 'rgba(29, 110, 205, 0.08)' : 'var(--color-surface-2)',
                      fontSize: 12,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                      fontWeight: row.status === s ? 600 : 400,
                    }}
                  >
                    {labels[s]}
                  </button>
                );
              })}
              {row.status === 'ready' && (
                <label style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
                  <input
                    type="file"
                    style={{ display: 'none' }}
                    onChange={(e) => onFile(row.id, e.target.files?.[0] ?? null)}
                  />
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      fontSize: 12,
                      background: 'var(--color-surface-2)',
                    }}
                  >
                    {row.fileName ? row.fileName : 'Attach file'}
                  </span>
                </label>
              )}
            </div>

            {row.status === 'later' ? (
              <div style={{ marginTop: 10 }}>
                <label style={{ fontSize: 12, color: 'var(--color-text-3)', display: 'block', marginBottom: 4 }}>
                  Delivery date
                </label>
                <input
                  type="date"
                  value={row.dueDate}
                  onChange={(e) => setDue(row.id, e.target.value)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 13,
                  }}
                />
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={!allSet}
        onClick={confirm}
        style={{
          marginTop: 24,
          width: '100%',
          padding: '14px 18px',
          borderRadius: 12,
          border: 'none',
          background: allSet ? 'var(--color-primary)' : 'var(--color-surface-3)',
          color: '#fff',
          fontWeight: 600,
          fontSize: 15,
          cursor: allSet ? 'pointer' : 'default',
          fontFamily: 'var(--font-sans)',
        }}
      >
        Confirm and Continue
      </button>

      <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 14, lineHeight: 1.45 }}>
        Items with future delivery dates are saved — FreelanceOS can remind you in chat when those dates arrive.
      </p>
    </div>
  );
}
