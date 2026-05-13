import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getUserSettings, setUserSettings } from '../../utils/userSettingsStorage';

const GROUPS = [
  {
    key: 'responseTime',
    title: 'Response time preference',
    subtitle: 'How quickly clients can usually expect a reply',
    options: [
      { value: 'within_hours', label: 'Within hours' },
      { value: 'same_day', label: 'Same day' },
      { value: 'few_days', label: 'Within a few days' },
    ],
  },
  {
    key: 'meeting',
    title: 'Meeting preference',
    subtitle: 'How you prefer to collaborate live vs async',
    options: [
      { value: 'calls', label: 'Love calls' },
      { value: 'async', label: 'Prefer async' },
      { value: 'mix', label: 'Mix of both' },
    ],
  },
  {
    key: 'feedback',
    title: 'Feedback style',
    subtitle: 'How you like review cycles to run',
    options: [
      { value: 'detailed', label: 'Detailed and structured' },
      { value: 'high_level', label: 'High level and quick' },
    ],
  },
];

function CardOption({ selected, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '12px 10px',
        borderRadius: 10,
        border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
        background: selected ? 'rgba(29, 110, 205, 0.08)' : 'var(--color-surface)',
        fontWeight: 600,
        fontSize: 13,
        lineHeight: 1.35,
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-text)',
        textAlign: 'center',
      }}
    >
      {label}
    </button>
  );
}

export default function CommunicationPreferences() {
  const { user } = useAuth();
  const userId = user?.id;

  const initial = getUserSettings(userId).communication;
  const [responseTime, setResponseTime] = useState(initial.responseTime);
  const [meeting, setMeeting] = useState(initial.meeting);
  const [feedback, setFeedback] = useState(initial.feedback);
  const [savedOk, setSavedOk] = useState(false);

  useEffect(() => {
    const c = getUserSettings(userId).communication;
    setResponseTime(c.responseTime);
    setMeeting(c.meeting);
    setFeedback(c.feedback);
  }, [userId]);

  const values = { responseTime, meeting, feedback };
  const setters = {
    responseTime: setResponseTime,
    meeting: setMeeting,
    feedback: setFeedback,
  };

  const dirty = responseTime !== initial.responseTime || meeting !== initial.meeting || feedback !== initial.feedback;

  const save = (e) => {
    e.preventDefault();
    setUserSettings(userId, {
      communication: {
        responseTime,
        meeting,
        feedback,
      },
    });
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

      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 8px' }}>Communication style</h1>
      <p style={{ fontSize: 15, fontWeight: 500, margin: '0 0 6px' }}>How do you like to work?</p>
      <p style={{ fontSize: 14, color: 'var(--color-text-3)', margin: '0 0 28px', lineHeight: 1.5 }}>
        These preferences are shown to matched clients so they know what to expect.
      </p>

      <form onSubmit={save}>
        {GROUPS.map((g) => {
          const gridCols = g.options.length === 2 ? '1fr 1fr' : 'repeat(3, 1fr)';
          return (
            <div key={g.key} style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{g.title}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-3)', marginBottom: 12 }}>{g.subtitle}</div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: gridCols,
                  gap: 10,
                }}
              >
                {g.options.map((opt) => (
                  <CardOption
                    key={opt.value}
                    label={opt.label}
                    selected={values[g.key] === opt.value}
                    onClick={() => setters[g.key](opt.value)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {savedOk ? (
          <p style={{ fontSize: 13, color: '#15803d', marginBottom: 12 }}>Saved.</p>
        ) : null}

        <button
          type="submit"
          disabled={!dirty}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: 9,
            background: dirty ? 'var(--color-primary)' : 'var(--color-surface-3)',
            color: dirty ? '#fff' : 'var(--color-text-3)',
            border: 'none',
            cursor: dirty ? 'pointer' : 'default',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'var(--font-sans)',
            minHeight: 44,
          }}
        >
          Save
        </button>
      </form>
    </div>
  );
}
