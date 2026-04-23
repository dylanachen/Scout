import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjectFromParams } from '../hooks/useProjectFromParams';
import { formatShortDate } from '../utils/dashboard';

const RATE_STORAGE = 'scout_default_hourly_rate';

function loadDefaultRate() {
  try {
    const raw = localStorage.getItem(RATE_STORAGE);
    const n = parseFloat(String(raw ?? ''));
    if (Number.isFinite(n) && n > 0) return n;
  } catch {
    /* ignore */
  }
  return 125;
}

export default function ChangeOrderPreview() {
  const { projectId, projectName, loading } = useProjectFromParams();
  const today = useMemo(() => formatShortDate(new Date()), []);

  const [readOnlyDoc, setReadOnlyDoc] = useState(true);

  const [changeOrderNum, setChangeOrderNum] = useState('001');
  const [freelancerName, setFreelancerName] = useState('Your Name');
  const [clientNameField, setClientNameField] = useState('Client');
  const [originalAmount, setOriginalAmount] = useState(5000);

  const [description, setDescription] = useState(
    'Implement additional API endpoints for the reporting dashboard, including export to CSV and scheduled email digests.',
  );
  const [hours, setHours] = useState(12);
  const [hourlyRate, setHourlyRate] = useState(loadDefaultRate);
  const [additionalCost, setAdditionalCost] = useState(() => Math.round(12 * loadDefaultRate() * 100) / 100);
  const [costOverride, setCostOverride] = useState(false);

  const [sigFreelancer, setSigFreelancer] = useState('Your Name');
  const [sigClient, setSigClient] = useState('');

  const newProjectTotal = useMemo(() => {
    const orig = Number(originalAmount) || 0;
    const add = Number(additionalCost) || 0;
    return Math.round((orig + add) * 100) / 100;
  }, [originalAmount, additionalCost]);

  useEffect(() => {
    if (costOverride) return;
    const next = Math.round(Number(hours) * Number(hourlyRate) * 100) / 100;
    if (Number.isFinite(next)) setAdditionalCost(next);
  }, [hours, hourlyRate, costOverride]);

  useEffect(() => {
    try {
      localStorage.setItem(RATE_STORAGE, String(hourlyRate));
    } catch {
      /* ignore */
    }
  }, [hourlyRate]);

  const onCostChange = useCallback((e) => {
    setCostOverride(true);
    const v = parseFloat(e.target.value);
    setAdditionalCost(Number.isFinite(v) ? v : 0);
  }, []);

  const onHoursChange = useCallback((e) => {
    setCostOverride(false);
    const v = parseFloat(e.target.value);
    setHours(Number.isFinite(v) ? v : 0);
  }, []);

  const onRateChange = useCallback((e) => {
    setCostOverride(false);
    const v = parseFloat(e.target.value);
    setHourlyRate(Number.isFinite(v) && v > 0 ? v : 0);
  }, []);

  const fmtCurrency = (n) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n);

  const fieldShell = {
    border: '1px solid var(--color-border)',
    borderRadius: 10,
    padding: '12px 14px',
    fontSize: 14,
    background: readOnlyDoc ? 'var(--color-surface-2)' : 'var(--color-surface)',
    color: 'var(--color-text)',
    width: '100%',
    outline: 'none',
  };

  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 88px', maxWidth: 640, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <Link to="/projects" style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}>
          ← Projects
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '14px 0 6px', letterSpacing: '-0.03em' }}>Change Order Draft</h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: 0 }}>Review this change order before sending to your client</p>
      </div>

      <div
        style={{
          border: '1px solid var(--color-border)',
          borderRadius: 14,
          background: 'var(--color-surface)',
          padding: '22px 22px 20px',
          boxShadow: '0 1px 0 rgba(15,22,35,0.04)',
        }}
      >
        <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 16, marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-3)' }}>
              Change order
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, marginTop: 6, letterSpacing: '-0.02em' }}>{projectName}</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-2)', marginTop: 4 }}>{today}</div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>Scout</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', display: 'block', marginBottom: 6 }}>
              Change Order #
            </label>
            {readOnlyDoc ? (
              <div style={fieldShell}>{changeOrderNum}</div>
            ) : (
              <input value={changeOrderNum} onChange={(e) => setChangeOrderNum(e.target.value)} style={fieldShell} />
            )}
          </div>
          <div />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', display: 'block', marginBottom: 6 }}>
              Freelancer
            </label>
            {readOnlyDoc ? (
              <div style={fieldShell}>{freelancerName}</div>
            ) : (
              <input value={freelancerName} onChange={(e) => setFreelancerName(e.target.value)} style={fieldShell} />
            )}
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', display: 'block', marginBottom: 6 }}>
              Client
            </label>
            {readOnlyDoc ? (
              <div style={fieldShell}>{clientNameField}</div>
            ) : (
              <input value={clientNameField} onChange={(e) => setClientNameField(e.target.value)} style={fieldShell} />
            )}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', display: 'block', marginBottom: 6 }}>
            Description of new work
          </label>
          {readOnlyDoc ? (
            <div style={{ ...fieldShell, minHeight: 88, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{description}</div>
          ) : (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              style={{ ...fieldShell, resize: 'vertical', fontFamily: 'inherit' }}
            />
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', display: 'block', marginBottom: 6 }}>
              Estimated additional hours
            </label>
            {readOnlyDoc ? (
              <div style={fieldShell}>{hours}</div>
            ) : (
              <input
                type="number"
                min={0}
                step={0.25}
                value={hours}
                onChange={onHoursChange}
                style={fieldShell}
              />
            )}
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', display: 'block', marginBottom: 6 }}>
              Default hourly rate ($)
            </label>
            {readOnlyDoc ? (
              <div style={fieldShell}>{hourlyRate}</div>
            ) : (
              <input type="number" min={0} step={1} value={hourlyRate} onChange={onRateChange} style={fieldShell} />
            )}
          </div>
        </div>

        <div style={{ marginBottom: 22 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', display: 'block', marginBottom: 6 }}>
            Additional cost (USD)
          </label>
          {readOnlyDoc ? (
            <div style={fieldShell}>
              {fmtCurrency(additionalCost)}
            </div>
          ) : (
            <input type="number" min={0} step={0.01} value={additionalCost} onChange={onCostChange} style={fieldShell} />
          )}
          {!readOnlyDoc && (
            <p style={{ fontSize: 12, color: 'var(--color-text-3)', margin: '8px 0 0' }}>
              Calculated as hours × rate unless you edit this amount.
            </p>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 12,
            marginBottom: 22,
            padding: '14px 0',
            borderTop: '1px solid var(--color-border)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', marginBottom: 6 }}>Original contract</div>
            {readOnlyDoc ? (
              <div style={{ fontSize: 16, fontWeight: 700 }}>{fmtCurrency(originalAmount)}</div>
            ) : (
              <input
                type="number"
                min={0}
                step={0.01}
                value={originalAmount}
                onChange={(e) => setOriginalAmount(parseFloat(e.target.value) || 0)}
                style={fieldShell}
              />
            )}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', marginBottom: 6 }}>Additional cost</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{fmtCurrency(additionalCost)}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', marginBottom: 6 }}>New Project Total</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-primary)' }}>{fmtCurrency(newProjectTotal)}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', marginBottom: 6 }}>Freelancer signature</div>
            {readOnlyDoc ? (
              <div style={{ ...fieldShell, minHeight: 44, fontStyle: sigFreelancer ? 'italic' : 'normal' }}>{sigFreelancer || '—'}</div>
            ) : (
              <input
                value={sigFreelancer}
                onChange={(e) => setSigFreelancer(e.target.value)}
                placeholder="Type full name"
                style={fieldShell}
              />
            )}
            <div style={{ marginTop: 8, height: 1, background: 'var(--color-text)', opacity: 0.35 }} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', marginBottom: 6 }}>Client signature</div>
            {readOnlyDoc ? (
              <div style={{ ...fieldShell, minHeight: 44 }}>{sigClient || '—'}</div>
            ) : (
              <input value={sigClient} onChange={(e) => setSigClient(e.target.value)} placeholder="Type full name" style={fieldShell} />
            )}
            <div style={{ marginTop: 8, height: 1, background: 'var(--color-text)', opacity: 0.35 }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 22, alignItems: 'center' }}>
        <button
          type="button"
          style={{
            padding: '12px 20px',
            borderRadius: 10,
            background: 'var(--color-primary)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(29, 110, 205, 0.35)',
          }}
        >
          Send to Client
        </button>
        <button
          type="button"
          onClick={() => setReadOnlyDoc((v) => !v)}
          style={{
            padding: '12px 18px',
            borderRadius: 10,
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            color: 'var(--color-text)',
          }}
        >
          {readOnlyDoc ? 'Edit' : 'Done'}
        </button>
      </div>

      <div style={{ marginTop: 18 }}>
        <button
          type="button"
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--color-danger)',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Discard
        </button>
      </div>

      {projectId && (
        <div style={{ marginTop: 24, fontSize: 12, color: 'var(--color-text-3)' }}>
          <Link to={`/projects/${projectId}/contract`} style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
            Contract upload
          </Link>
          {' · '}
          <Link to={`/projects/${projectId}/scope-drift`} style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
            Scope drift report
          </Link>
        </div>
      )}
    </div>
  );
}
