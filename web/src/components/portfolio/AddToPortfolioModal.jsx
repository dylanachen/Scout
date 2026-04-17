import { useEffect, useState } from 'react';
import { buildPortfolioDraftFromMessages } from '../../utils/portfolioDraft';
import { addPortfolioItem, addPermissionRequest } from '../../utils/portfolioStorage';
import { useAuth } from '../../hooks/useAuth';
import { isDemoMode } from '../../api/demoAdapter';
import ToggleSwitch from '../settings/ToggleSwitch';

const DELIVERABLE_TYPES = ['UI Design', 'Web App', 'Video', 'Brand Identity', 'Copy', 'Other'];

const SKILL_POOL = [
  'Figma',
  'React',
  'Vue',
  'Design systems',
  'Prototyping',
  'Accessibility',
  'After Effects',
  'Premiere',
  'Motion',
  'Illustration',
  'Node.js',
  'Copywriting',
];

const DEMO_PROJECT_FILES = [
  { name: 'hero-mockup.png', thumb: null },
  { name: 'dashboard-v2.png', thumb: null },
  { name: 'logo-final.png', thumb: null },
];

function getProjectFiles(projectId) {
  if (isDemoMode()) return DEMO_PROJECT_FILES;
  return [];
}

export default function AddToPortfolioModal({ open, project, messages, onClose, onSkip, clientName }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deliverableType, setDeliverableType] = useState('Web App');
  const [thumbnail, setThumbnail] = useState(null);
  const [skills, setSkills] = useState([]);
  const [sharePublicly, setSharePublicly] = useState(true);
  const [askPermission, setAskPermission] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState('');
  const [showProjectFiles, setShowProjectFiles] = useState(false);

  useEffect(() => {
    if (!open || !project) return;
    setTitle(project.name || '');
    setDescription(buildPortfolioDraftFromMessages(messages, project.name || 'Project'));
    setDeliverableType(project.deliverableType || (isDemoMode() ? 'Web App' : ''));
    setThumbnail(null);
    setSkills(project.skills ?? (isDemoMode() ? ['React', 'Figma'] : []));
    setSharePublicly(true);
    setAskPermission(false);
    setPermissionMessage(
      `Hi ${clientName || project.client_name || 'there'},\n\nI'd love to feature our project "${project.name || 'this project'}" in my portfolio. Would that be okay with you?\n\nThanks!`
    );
    setShowProjectFiles(false);
  }, [open, project?.id, project?.name]);

  if (!open || !project) return null;

  const toggleSkill = (s) => {
    setSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setThumbnail(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const pickProjectFile = (f) => {
    const placeholder = `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144"><rect width="144" height="144" fill="#e8ecf2"/><text x="72" y="78" text-anchor="middle" fill="#9aa0ae" font-size="12" font-family="sans-serif">${f.name}</text></svg>`
    )}`;
    setThumbnail(placeholder);
    setShowProjectFiles(false);
  };

  const handleAdd = () => {
    const fid = user?.id ?? 'demo';
    const row = addPortfolioItem({
      freelancerId: String(fid),
      projectId: String(project.id),
      title: title.trim() || project.name,
      description: description.trim(),
      deliverableType,
      skills,
      thumbnailDataUrl: thumbnail,
      sharePublicly,
    });
    if (askPermission) {
      addPermissionRequest({
        portfolioItemId: row.id,
        projectId: String(project.id),
        clientName: clientName || project.client_name,
        freelancerId: String(fid),
        message: permissionMessage,
      });
      try {
        const key = `scout_perm_msg_${row.id}`;
        localStorage.setItem(key, JSON.stringify({ message: permissionMessage, sentAt: new Date().toISOString() }));
      } catch {}
    }
    onClose?.();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-pf-heading"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 220,
        background: 'rgba(15, 22, 35, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          width: 'min(520px, 100%)',
          maxHeight: '90vh',
          overflow: 'auto',
          background: 'var(--color-surface)',
          borderRadius: 16,
          border: '1px solid var(--color-border)',
          boxShadow: '0 24px 48px rgba(15, 22, 35, 0.2)',
          padding: '22px 22px 20px',
        }}
      >
        <h2 id="add-pf-heading" style={{ margin: '0 0 6px', fontSize: 20, letterSpacing: '-0.03em' }}>
          Add this to your portfolio?
        </h2>
        <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--color-text-2)' }}>
          We pre-filled a short draft from your project chat. Adjust anything before publishing.
        </p>

        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Project name</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid var(--color-border)',
            fontSize: 14,
            marginBottom: 14,
            fontFamily: 'var(--font-sans)',
          }}
        />

        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid var(--color-border)',
            fontSize: 13,
            lineHeight: 1.5,
            resize: 'vertical',
            marginBottom: 14,
            fontFamily: 'var(--font-sans)',
          }}
        />

        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Thumbnail</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 10,
              background: thumbnail ? `url(${thumbnail}) center/cover` : 'var(--color-surface-3)',
              border: '1px dashed var(--color-border)',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ cursor: 'pointer' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--color-border)',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Upload image
              </span>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
            </label>
            <button
              type="button"
              onClick={() => setShowProjectFiles((v) => !v)}
              style={{
                display: 'inline-block',
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface-2)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              From project
            </button>
          </div>
        </div>
        {showProjectFiles && (
          <div
            style={{
              marginBottom: 14,
              padding: 10,
              borderRadius: 10,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface-2)',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-2)' }}>
              Pick from project files
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {getProjectFiles(project?.id).map((f) => (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => pickProjectFile(f)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Deliverable type</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {DELIVERABLE_TYPES.map((d) => {
            const on = deliverableType === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDeliverableType(d)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 999,
                  border: on ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: on ? 'rgba(29, 110, 205, 0.1)' : 'var(--color-surface-2)',
                  color: on ? 'var(--color-primary)' : 'var(--color-text-2)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {d}
              </button>
            );
          })}
        </div>

        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Skills (tap to toggle)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {SKILL_POOL.map((s) => {
            const on = skills.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSkill(s)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: on ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: on ? 'rgba(29, 110, 205, 0.1)' : 'var(--color-surface-2)',
                  color: on ? 'var(--color-primary)' : 'var(--color-text-2)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {s}
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: 10,
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface-2)',
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600 }}>Share this publicly?</span>
          <ToggleSwitch checked={sharePublicly} onChange={setSharePublicly} label="Share publicly" />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              fontSize: 13,
              color: 'var(--color-text-2)',
              cursor: 'pointer',
              marginBottom: askPermission ? 10 : 0,
            }}
          >
            <input
              type="checkbox"
              checked={askPermission}
              onChange={(e) => setAskPermission(e.target.checked)}
              style={{ marginTop: 3 }}
            />
            <span>Ask client for permission to showcase this work</span>
          </label>
          {askPermission && (
            <div
              style={{
                padding: 12,
                borderRadius: 10,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface-2)',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', marginBottom: 6 }}>
                Message preview
              </div>
              <textarea
                value={permissionMessage}
                onChange={(e) => setPermissionMessage(e.target.value)}
                rows={4}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--color-border)',
                  fontSize: 13,
                  lineHeight: 1.5,
                  resize: 'vertical',
                  fontFamily: 'var(--font-sans)',
                  background: 'var(--color-surface)',
                }}
              />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onSkip}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'transparent',
              color: 'var(--color-text-3)',
              fontWeight: 500,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              textDecoration: 'underline',
              textUnderlineOffset: 2,
            }}
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={handleAdd}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--color-primary)',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Add to Portfolio
          </button>
        </div>
      </div>
    </div>
  );
}
