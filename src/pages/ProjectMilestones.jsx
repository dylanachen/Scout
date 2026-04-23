import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lsRead, lsWrite } from '../utils/localStore';
import { showToast } from '../utils/toast';
import EmptyState from '../components/EmptyState';

const COLUMNS = [
  { id: 'funded', title: 'Funded', tone: '#eff6ff', color: '#1e40af' },
  { id: 'in_progress', title: 'In Progress', tone: '#fff7ed', color: '#c2410c' },
  { id: 'submitted', title: 'Submitted', tone: '#fef3c7', color: '#92400e' },
  { id: 'released', title: 'Released', tone: '#dcfce7', color: '#166534' },
];

const storageKey = (projectId) => `scout_milestones_${projectId}`;

function readBoard(projectId) {
  return lsRead(storageKey(projectId), { milestones: [] });
}

function writeBoard(projectId, board) {
  lsWrite(storageKey(projectId), board);
}

function moveMilestone(board, id, dir) {
  const m = board.milestones.find((x) => x.id === id);
  if (!m) return board;
  const idx = COLUMNS.findIndex((c) => c.id === m.status);
  const next = Math.max(0, Math.min(COLUMNS.length - 1, idx + dir));
  return {
    ...board,
    milestones: board.milestones.map((x) =>
      x.id === id ? { ...x, status: COLUMNS[next].id, movedAt: new Date().toISOString() } : x,
    ),
  };
}

export default function ProjectMilestones() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState(() => readBoard(projectId));
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState(1000);

  useEffect(() => setBoard(readBoard(projectId)), [projectId]);

  const grouped = useMemo(() => {
    const groups = Object.fromEntries(COLUMNS.map((c) => [c.id, []]));
    board.milestones.forEach((m) => {
      (groups[m.status] || groups.funded).push(m);
    });
    return groups;
  }, [board]);

  const addMilestone = () => {
    if (!newTitle.trim()) return;
    const next = {
      ...board,
      milestones: [
        ...board.milestones,
        {
          id: `ms_${Date.now()}`,
          title: newTitle.trim(),
          amount: Number(newAmount) || 0,
          status: 'funded',
          createdAt: new Date().toISOString(),
        },
      ],
    };
    writeBoard(projectId, next);
    setBoard(next);
    setNewTitle('');
    setNewAmount(1000);
    showToast('Milestone added', 'success');
  };

  const move = (id, dir) => {
    const next = moveMilestone(board, id, dir);
    writeBoard(projectId, next);
    setBoard(next);
  };

  const remove = (id) => {
    const next = { ...board, milestones: board.milestones.filter((m) => m.id !== id) };
    writeBoard(projectId, next);
    setBoard(next);
    showToast('Milestone removed', 'info');
  };

  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: 20, width: '100%' }}>
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{ border: 'none', background: 'none', color: 'var(--color-text-3)', fontSize: 13, cursor: 'pointer', padding: 0 }}
      >
        ← Back
      </button>

      <h1 style={{ margin: '10px 0 4px', fontSize: 22, fontWeight: 800 }}>Milestones</h1>
      <p style={{ margin: '0 0 18px', color: 'var(--color-text-3)', fontSize: 13 }}>
        Break the project into funded checkpoints. Move cards as work progresses.
      </p>

      <div
        style={{
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          background: 'var(--color-surface)',
          padding: 14,
          marginBottom: 18,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'flex-end',
        }}
      >
        <div style={{ flex: '1 1 280px' }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)', display: 'block', marginBottom: 4 }}>
            Milestone title
          </label>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="e.g. Homepage redesign v1"
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: 14,
            }}
          />
        </div>
        <div style={{ width: 120 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)', display: 'block', marginBottom: 4 }}>Amount</label>
          <input
            type="number"
            min={0}
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 14 }}
          />
        </div>
        <button
          type="button"
          onClick={addMilestone}
          style={{
            padding: '10px 18px',
            borderRadius: 10,
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Add milestone
        </button>
      </div>

      {board.milestones.length === 0 ? (
        <EmptyState
          title="No milestones yet"
          body="Add the first milestone to fund. Buttons on the card move it between columns."
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(220px, 1fr))`,
            gap: 14,
            overflowX: 'auto',
          }}
        >
          {COLUMNS.map((col, colIndex) => (
            <div
              key={col.id}
              style={{
                background: col.tone,
                border: '1px solid var(--color-border)',
                borderRadius: 12,
                padding: 12,
                minHeight: 220,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: col.color, marginBottom: 8 }}>
                {col.title} <span style={{ color: 'var(--color-text-3)', fontWeight: 600 }}>{grouped[col.id].length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {grouped[col.id].map((m) => (
                  <div
                    key={m.id}
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 10,
                      padding: 12,
                      boxShadow: '0 1px 0 rgba(15,22,35,0.04)',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{m.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-2)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                      ${Number(m.amount).toLocaleString()}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          type="button"
                          disabled={colIndex === 0}
                          onClick={() => move(m.id, -1)}
                          aria-label="Move left"
                          style={iconBtn(colIndex === 0)}
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          disabled={colIndex === COLUMNS.length - 1}
                          onClick={() => move(m.id, 1)}
                          aria-label="Move right"
                          style={iconBtn(colIndex === COLUMNS.length - 1)}
                        >
                          →
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(m.id)}
                        style={{ border: 'none', background: 'none', color: 'var(--color-danger)', fontSize: 12, cursor: 'pointer', padding: 0 }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function iconBtn(disabled) {
  return {
    padding: '4px 10px',
    borderRadius: 6,
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    fontSize: 12,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
  };
}
