import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import { lsRead, lsSubscribe, lsWrite } from '../utils/localStore';
import { showToast } from '../utils/toast';

const KEY = 'scout_proposal_drafts';

export function readProposals() {
  return lsRead(KEY, []);
}

export function saveProposal(proposal) {
  const list = readProposals();
  const idx = list.findIndex((p) => p.id === proposal.id);
  const next = { ...proposal, updatedAt: new Date().toISOString() };
  if (idx >= 0) list[idx] = next;
  else list.unshift(next);
  lsWrite(KEY, list);
  return next;
}

export function deleteProposal(id) {
  lsWrite(KEY, readProposals().filter((p) => p.id !== id));
}

function fmt(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return iso;
  }
}

const STATUS_BADGE = {
  draft: { label: 'Draft', bg: '#f3f4f6', color: '#4b5563' },
  sent: { label: 'Sent', bg: '#dbeafe', color: '#1e40af' },
  accepted: { label: 'Accepted', bg: '#dcfce7', color: '#166534' },
  declined: { label: 'Declined', bg: '#fee2e2', color: '#991b1b' },
};

export default function Proposals() {
  const navigate = useNavigate();
  const [list, setList] = useState(() => readProposals());

  useEffect(() => lsSubscribe(KEY, () => setList(readProposals())), []);

  const createNew = () => {
    const id = `prop_${Date.now()}`;
    saveProposal({
      id,
      title: 'Untitled proposal',
      status: 'draft',
      step: 0,
      scope: '',
      deliverables: [],
      timelineWeeks: 4,
      price: 0,
      currency: 'USD',
      clientName: '',
      createdAt: new Date().toISOString(),
    });
    navigate(`/proposals/${id}`);
  };

  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 88px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Proposals</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-3)', fontSize: 13 }}>
            Draft, send, and track proposals to prospective clients.
          </p>
        </div>
        <button
          type="button"
          onClick={createNew}
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          New proposal
        </button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="No proposals yet"
          body="Create your first proposal to pitch scope, timeline, and price to a client."
          actionLabel="New proposal"
          onAction={createNew}
        />
      ) : (
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {list.map((p) => {
            const badge = STATUS_BADGE[p.status] || STATUS_BADGE.draft;
            return (
              <Link
                key={p.id}
                to={`/proposals/${p.id}`}
                style={{
                  display: 'block',
                  textDecoration: 'none',
                  color: 'inherit',
                  border: '1px solid var(--color-border)',
                  borderRadius: 14,
                  background: 'var(--color-surface)',
                  padding: 16,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{p.title || 'Untitled proposal'}</div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      background: badge.bg,
                      color: badge.color,
                      padding: '4px 7px',
                      borderRadius: 6,
                    }}
                  >
                    {badge.label}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-2)', marginTop: 4 }}>
                  {p.clientName || 'No client set'}
                </div>
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-3)' }}>
                  <span>
                    {p.currency} {Number(p.price || 0).toLocaleString()}
                  </span>
                  <span>{fmt(p.updatedAt)}</span>
                </div>
                <div style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      deleteProposal(p.id);
                      showToast('Proposal deleted', 'info');
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-danger)',
                      fontSize: 12,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Delete
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
