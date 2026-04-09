import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const SUBTEXTS = ['Analyzing your profile', 'Comparing communication styles', 'Checking availability'];

export default function MatchTransition() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const role = params.get('role') || 'freelancer';
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % SUBTEXTS.length), 2200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const done = setTimeout(() => {
      navigate('/matches', { replace: true });
    }, 4500);
    return () => clearTimeout(done);
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'var(--color-surface-2)',
        textAlign: 'center',
      }}
    >
      <div
        className="fos-match-logo"
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: 'linear-gradient(135deg, var(--color-primary) 0%, #6366f1 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 800,
          fontSize: 15,
          letterSpacing: '-0.03em',
          marginBottom: 20,
        }}
      >
        F
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
        Finding your best matches…
      </h1>
      <p style={{ fontSize: 14, color: 'var(--color-text-2)', margin: 0, minHeight: 22, transition: 'opacity 0.3s ease' }}>
        {SUBTEXTS[i]}
      </p>
      <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 16 }}>
        Role: {role === 'client' ? 'Client' : 'Freelancer'}
      </p>
    </div>
  );
}
