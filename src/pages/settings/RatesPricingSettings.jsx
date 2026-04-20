import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getUserSettings, setUserSettings } from '../../utils/userSettingsStorage';

const TERMS = [
  { value: 'net7', label: 'Net 7' },
  { value: 'net14', label: 'Net 14' },
  { value: 'net30', label: 'Net 30' },
  { value: 'custom', label: 'Custom' },
];

const RATE_MODES = [
  { id: 'hourly', label: 'Hourly' },
  { id: 'flat', label: 'Per Project' },
  { id: 'retainer', label: 'Retainer' },
];

export default function RatesPricingSettings() {
  const { user } = useAuth();
  const userId = user?.id;

  const saved = getUserSettings(userId).ratesPricing;
  const [hourly, setHourly] = useState(saved.defaultHourlyRate);
  const [mode, setMode] = useState(saved.projectRateMode);
  const [tax, setTax] = useState(saved.taxRate);
  const [terms, setTerms] = useState(saved.paymentTerms);
  const [customTerms, setCustomTerms] = useState(saved.customTerms);
  const [savedOk, setSavedOk] = useState(false);

  const [initial, setInitial] = useState({});

  useEffect(() => {
    const rp = getUserSettings(userId).ratesPricing;
    setHourly(rp.defaultHourlyRate);
    setMode(rp.projectRateMode);
    setTax(rp.taxRate);
    setTerms(rp.paymentTerms);
    setCustomTerms(rp.customTerms);
    setInitial({
      hourly: rp.defaultHourlyRate,
      mode: rp.projectRateMode,
      tax: rp.taxRate,
      terms: rp.paymentTerms,
      customTerms: rp.customTerms,
    });
  }, [userId]);

  const dirty = useMemo(() => {
    return (
      hourly !== initial.hourly ||
      mode !== initial.mode ||
      tax !== initial.tax ||
      terms !== initial.terms ||
      customTerms !== initial.customTerms
    );
  }, [hourly, mode, tax, terms, customTerms, initial]);

  const save = (e) => {
    e.preventDefault();
    setUserSettings(userId, {
      ratesPricing: {
        defaultHourlyRate: hourly.trim(),
        projectRateMode: mode,
        taxRate: tax.trim(),
        paymentTerms: terms,
        customTerms: terms === 'custom' ? customTerms.trim() : '',
      },
    });
    setInitial({ hourly: hourly.trim(), mode, tax: tax.trim(), terms, customTerms: terms === 'custom' ? customTerms.trim() : '' });
    setSavedOk(true);
    window.setTimeout(() => setSavedOk(false), 2500);
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 20px 48px' }}>
      <div style={{ marginBottom: 20 }}>
        <Link
          to="/settings"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            color: 'var(--color-text-2)',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          <span aria-hidden>←</span> Settings
        </Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 8px' }}>Rates &amp; pricing defaults</h1>
      <p style={{ fontSize: 14, color: 'var(--color-text-3)', marginBottom: 24 }}>
        Used as starting points for quotes and invoice calculations.
      </p>

      <form onSubmit={save}>
        <label
          htmlFor="rp-hourly"
          style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-2)', display: 'block', marginBottom: 6 }}
        >
          Default hourly rate
        </label>
        <div style={{ display: 'flex', alignItems: 'stretch', marginBottom: 20 }}>
          <span
            style={{
              padding: '10px 12px',
              border: '1px solid var(--color-border)',
              borderRight: 'none',
              borderRadius: '9px 0 0 9px',
              background: 'var(--color-surface-2)',
              fontSize: 14,
              color: 'var(--color-text-2)',
            }}
          >
            $
          </span>
          <input
            id="rp-hourly"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="0.00"
            value={hourly}
            onChange={(e) => setHourly(e.target.value)}
            style={{
              flex: 1,
              minWidth: 0,
              padding: '10px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: 0,
              fontSize: 14,
              fontFamily: 'var(--font-sans)',
              color: 'var(--color-text)',
              background: 'var(--color-surface)',
            }}
          />
          <span
            style={{
              padding: '10px 12px',
              border: '1px solid var(--color-border)',
              borderLeft: 'none',
              borderRadius: '0 9px 9px 0',
              background: 'var(--color-surface-2)',
              fontSize: 14,
              color: 'var(--color-text-2)',
            }}
          >
            /hr
          </span>
        </div>

        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-2)', marginBottom: 10 }}>Default project rate type</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            marginBottom: 20,
          }}
        >
          {RATE_MODES.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setMode(opt.id)}
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                border: `2px solid ${mode === opt.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: mode === opt.id ? 'rgba(29, 110, 205, 0.08)' : 'var(--color-surface)',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                color: 'var(--color-text)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <label
          htmlFor="rp-tax"
          style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-2)', display: 'block', marginBottom: 6 }}
        >
          Tax rate (optional)
        </label>
        <div style={{ display: 'flex', alignItems: 'stretch', marginBottom: 20 }}>
          <input
            id="rp-tax"
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step="0.01"
            placeholder="e.g. 5"
            value={tax}
            onChange={(e) => setTax(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: '9px 0 0 9px',
              fontSize: 14,
              fontFamily: 'var(--font-sans)',
              color: 'var(--color-text)',
              background: 'var(--color-surface)',
            }}
          />
          <span
            style={{
              padding: '10px 12px',
              border: '1px solid var(--color-border)',
              borderLeft: 'none',
              borderRadius: '0 9px 9px 0',
              background: 'var(--color-surface-2)',
              fontSize: 14,
              color: 'var(--color-text-2)',
            }}
          >
            %
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--color-text-3)', margin: '-12px 0 20px' }}>
          Applied in invoice totals when you add tax to a line or document.
        </p>

        <label
          htmlFor="rp-terms"
          style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-2)', display: 'block', marginBottom: 6 }}
        >
          Payment terms
        </label>
        <select
          id="rp-terms"
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid var(--color-border)',
            borderRadius: 9,
            fontSize: 14,
            fontFamily: 'var(--font-sans)',
            marginBottom: terms === 'custom' ? 12 : 20,
            color: 'var(--color-text)',
            background: 'var(--color-surface)',
          }}
        >
          {TERMS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        {terms === 'custom' ? (
          <>
            <label htmlFor="rp-custom" style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-2)', display: 'block', marginBottom: 6 }}>
              Custom terms
            </label>
            <input
              id="rp-custom"
              value={customTerms}
              onChange={(e) => setCustomTerms(e.target.value)}
              placeholder="e.g. 50% upfront, 50% on delivery"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: 9,
                fontSize: 14,
                fontFamily: 'var(--font-sans)',
                marginBottom: 20,
                color: 'var(--color-text)',
                background: 'var(--color-surface)',
              }}
            />
          </>
        ) : null}

        {savedOk ? (
          <p style={{ fontSize: 13, color: '#15803d', marginBottom: 12 }}>Saved.</p>
        ) : null}

        {dirty && (
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 9,
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              minHeight: 44,
            }}
          >
            Save
          </button>
        )}
      </form>
    </div>
  );
}
