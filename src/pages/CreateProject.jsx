import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

const DEFAULT_SKILLS = [
  'React', 'TypeScript', 'UI/UX', 'Figma', 'Branding',
  'Node.js', 'Python', 'Mobile', 'Copywriting', 'Marketing',
];

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 12px',
        borderRadius: 999,
        border: active ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
        background: active ? 'rgba(29,110,205,0.1)' : 'var(--color-surface)',
        color: active ? 'var(--color-primary)' : 'var(--color-text-2)',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {children}
    </button>
  );
}

export default function CreateProject() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [skills, setSkills] = useState([]);
  const [customSkill, setCustomSkill] = useState('');
  const [timelineWeeks, setTimelineWeeks] = useState('');

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const toggleSkill = (s) => {
    setSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const addCustomSkill = () => {
    const s = customSkill.trim();
    if (!s) return;
    if (!skills.includes(s)) setSkills([...skills, s]);
    setCustomSkill('');
  };

  const toCents = (v) => {
    const n = Number(String(v).replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setErr('Project name is required.'); return; }
    setSaving(true); setErr('');
    try {
      const { data } = await api.post('/projects', {
        name: name.trim(),
        client_name: clientName.trim() || null,
        description: description.trim() || null,
        budget_min: toCents(budgetMin),
        budget_max: toCents(budgetMax),
        required_skills: skills,
        timeline_weeks: timelineWeeks ? Number(timelineWeeks) : null,
      });
      navigate('/projects', { replace: true, state: { justCreated: data.id } });
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Failed to create project.');
    } finally {
      setSaving(false);
    }
  };

  const labelStyle = { fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)' };
  const inputStyle = {
    padding: '10px 12px', borderRadius: 8, fontSize: 14,
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface-2)',
    color: 'var(--color-text)',
    outline: 'none',
    fontFamily: 'var(--font-sans)',
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 88px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: 'none', padding: 0,
            color: 'var(--color-text-3)', fontSize: 13, cursor: 'pointer', marginBottom: 12,
          }}
        >
          ← Back
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.03em' }}>
          New project
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: '0 0 24px' }}>
          Describe your project so we can match you with the right freelancers.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Project name <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Brand refresh — spring 2026"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Client / company name <span style={{ fontWeight: 400, color: 'var(--color-text-3)' }}>(optional)</span></label>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Northwind LLC"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Project description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What needs to be done? Deliverables, constraints, goals…"
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>Budget min ($)</label>
              <input
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                placeholder="e.g. 5000"
                inputMode="numeric"
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>Budget max ($)</label>
              <input
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                placeholder="e.g. 12000"
                inputMode="numeric"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Timeline (weeks)</label>
            <input
              value={timelineWeeks}
              onChange={(e) => setTimelineWeeks(e.target.value)}
              placeholder="e.g. 6"
              inputMode="numeric"
              style={{ ...inputStyle, maxWidth: 180 }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={labelStyle}>Required skills</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {DEFAULT_SKILLS.map((s) => (
                <Chip key={s} active={skills.includes(s)} onClick={() => toggleSkill(s)}>{s}</Chip>
              ))}
              {skills.filter((s) => !DEFAULT_SKILLS.includes(s)).map((s) => (
                <Chip key={s} active onClick={() => toggleSkill(s)}>{s} ×</Chip>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <input
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addCustomSkill(); }
                }}
                placeholder="Add custom skill"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                type="button"
                onClick={addCustomSkill}
                style={{
                  padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                }}
              >
                Add
              </button>
            </div>
          </div>

          {err && (
            <div style={{ padding: 12, borderRadius: 8, background: '#fef2f2', color: '#991b1b', fontSize: 13 }}>{err}</div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                padding: '11px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '11px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
