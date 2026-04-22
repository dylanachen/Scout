import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { readProposals, saveProposal } from './Proposals';
import { useDirtyFormGuard } from '../hooks/useDirtyFormGuard';
import { showToast } from '../utils/toast';

const STEPS = ['Scope', 'Deliverables', 'Timeline', 'Price', 'Review'];

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: 14,
  fontFamily: 'var(--font-sans)',
};

export default function ProposalDraft() {
  const { proposalId } = useParams();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState(() => readProposals().find((p) => p.id === proposalId) || null);
  const [dirty, setDirty] = useState(false);

  useDirtyFormGuard(dirty);

  useEffect(() => {
    if (!proposal) navigate('/proposals', { replace: true });
  }, [proposal, navigate]);

  const autoSave = useMemo(
    () => (next) => {
      saveProposal(next);
      setProposal(next);
      setDirty(false);
    },
    [],
  );

  useEffect(() => {
    if (!proposal) return undefined;
    if (!dirty) return undefined;
    const t = window.setTimeout(() => autoSave(proposal), 600);
    return () => window.clearTimeout(t);
  }, [proposal, dirty, autoSave]);

  if (!proposal) return null;

  const update = (partial) => {
    setProposal((prev) => ({ ...prev, ...partial }));
    setDirty(true);
  };

  const setStep = (n) => update({ step: Math.max(0, Math.min(STEPS.length - 1, n)) });

  const step = proposal.step || 0;

  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 88px', width: '100%' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <button
          type="button"
          onClick={() => navigate('/proposals')}
          style={{ border: 'none', background: 'none', color: 'var(--color-text-3)', fontSize: 13, cursor: 'pointer', padding: 0 }}
        >
          ← All proposals
        </button>

        <div style={{ marginTop: 16, marginBottom: 18 }}>
          <input
            value={proposal.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="Proposal title"
            aria-label="Proposal title"
            style={{ ...inputStyle, fontSize: 22, fontWeight: 700, border: 'none', padding: '4px 0' }}
          />
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>
            {dirty ? 'Saving…' : `Saved ${new Date(proposal.updatedAt || proposal.createdAt).toLocaleTimeString()}`}
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Proposal steps"
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}
        >
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={step === i}
              onClick={() => setStep(i)}
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                border: '1px solid var(--color-border)',
                background: step === i ? 'var(--color-primary)' : 'var(--color-surface)',
                color: step === i ? '#fff' : 'var(--color-text-2)',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {i + 1}. {label}
            </button>
          ))}
        </div>

        <div style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: 20, background: 'var(--color-surface)' }}>
          {step === 0 ? (
            <div>
              <Label>Client name</Label>
              <input
                value={proposal.clientName}
                onChange={(e) => update({ clientName: e.target.value })}
                style={inputStyle}
                placeholder="Client name"
              />
              <div style={{ height: 12 }} />
              <Label>Scope summary</Label>
              <textarea
                value={proposal.scope}
                onChange={(e) => update({ scope: e.target.value })}
                rows={6}
                placeholder="Describe what you'll do, what's included, and any explicit exclusions."
                style={{ ...inputStyle, fontFamily: 'var(--font-sans)' }}
              />
            </div>
          ) : null}

          {step === 1 ? (
            <div>
              <Label>Deliverables</Label>
              <DeliverableEditor
                items={proposal.deliverables || []}
                onChange={(deliverables) => update({ deliverables })}
              />
            </div>
          ) : null}

          {step === 2 ? (
            <div>
              <Label>Timeline (weeks)</Label>
              <input
                type="number"
                min={1}
                value={proposal.timelineWeeks || 1}
                onChange={(e) => update({ timelineWeeks: Number(e.target.value) })}
                style={{ ...inputStyle, maxWidth: 160 }}
              />
              <div style={{ height: 12 }} />
              <Label>Milestone notes</Label>
              <textarea
                value={proposal.timelineNotes || ''}
                onChange={(e) => update({ timelineNotes: e.target.value })}
                rows={4}
                placeholder="Key dates, reviews, approval windows…"
                style={{ ...inputStyle, fontFamily: 'var(--font-sans)' }}
              />
            </div>
          ) : null}

          {step === 3 ? (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <Label>Price</Label>
                <input
                  type="number"
                  min={0}
                  value={proposal.price || 0}
                  onChange={(e) => update({ price: Number(e.target.value) })}
                  style={inputStyle}
                />
              </div>
              <div style={{ width: 120 }}>
                <Label>Currency</Label>
                <select
                  value={proposal.currency || 'USD'}
                  onChange={(e) => update({ currency: e.target.value })}
                  style={inputStyle}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="JPY">JPY</option>
                  <option value="CAD">CAD</option>
                </select>
              </div>
              <div style={{ width: '100%' }}>
                <Label>Payment terms</Label>
                <input
                  value={proposal.paymentTerms || ''}
                  onChange={(e) => update({ paymentTerms: e.target.value })}
                  placeholder="e.g. 50% upfront, 50% on delivery"
                  style={inputStyle}
                />
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div>
              <Label>Review</Label>
              <ReviewSummary proposal={proposal} />
              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    update({ status: 'sent', sentAt: new Date().toISOString() });
                    showToast('Proposal sent (demo)', 'success');
                  }}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 10,
                    background: 'var(--color-primary)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Send proposal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    update({ status: 'draft' });
                    showToast('Proposal kept as draft', 'info');
                  }}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 10,
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Keep draft
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              cursor: step === 0 ? 'not-allowed' : 'pointer',
              opacity: step === 0 ? 0.5 : 1,
              fontWeight: 600,
            }}
          >
            Back
          </button>
          <button
            type="button"
            disabled={step === STEPS.length - 1}
            onClick={() => setStep(step + 1)}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              cursor: step === STEPS.length - 1 ? 'not-allowed' : 'pointer',
              opacity: step === STEPS.length - 1 ? 0.5 : 1,
              fontWeight: 700,
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function Label({ children }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 6 }}>{children}</div>
  );
}

function DeliverableEditor({ items, onChange }) {
  const [draft, setDraft] = useState('');
  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a deliverable"
          style={inputStyle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draft.trim()) {
              onChange([...items, { id: `d_${Date.now()}`, text: draft.trim() }]);
              setDraft('');
            }
          }}
        />
        <button
          type="button"
          onClick={() => {
            if (!draft.trim()) return;
            onChange([...items, { id: `d_${Date.now()}`, text: draft.trim() }]);
            setDraft('');
          }}
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Add
        </button>
      </div>
      <ul style={{ marginTop: 14, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((d) => (
          <li
            key={d.id}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface-2)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 13,
            }}
          >
            <span>{d.text}</span>
            <button
              type="button"
              onClick={() => onChange(items.filter((x) => x.id !== d.id))}
              style={{ border: 'none', background: 'none', color: 'var(--color-text-3)', cursor: 'pointer' }}
              aria-label="Remove"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReviewSummary({ proposal }) {
  return (
    <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 8, fontSize: 13 }}>
      <dt style={{ color: 'var(--color-text-3)' }}>Client</dt>
      <dd style={{ margin: 0 }}>{proposal.clientName || '—'}</dd>
      <dt style={{ color: 'var(--color-text-3)' }}>Scope</dt>
      <dd style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{proposal.scope || '—'}</dd>
      <dt style={{ color: 'var(--color-text-3)' }}>Deliverables</dt>
      <dd style={{ margin: 0 }}>
        {(proposal.deliverables || []).length === 0 ? '—' : (
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {proposal.deliverables.map((d) => <li key={d.id}>{d.text}</li>)}
          </ul>
        )}
      </dd>
      <dt style={{ color: 'var(--color-text-3)' }}>Timeline</dt>
      <dd style={{ margin: 0 }}>{proposal.timelineWeeks} weeks</dd>
      <dt style={{ color: 'var(--color-text-3)' }}>Price</dt>
      <dd style={{ margin: 0 }}>
        {proposal.currency} {Number(proposal.price || 0).toLocaleString()}
      </dd>
      <dt style={{ color: 'var(--color-text-3)' }}>Terms</dt>
      <dd style={{ margin: 0 }}>{proposal.paymentTerms || '—'}</dd>
    </dl>
  );
}
