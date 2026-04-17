import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const HAS_VISITED_KEY = 'scout_has_visited';

export default function Splash() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));

    const timer = setTimeout(() => {
      const hasVisited = localStorage.getItem(HAS_VISITED_KEY);
      const hasToken = localStorage.getItem('scout_token');

      if (hasToken) {
        navigate('/', { replace: true });
      } else if (hasVisited) {
        navigate('/login', { replace: true });
      } else {
        localStorage.setItem(HAS_VISITED_KEY, '1');
        navigate('/welcome', { replace: true });
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-primary)',
        transition: 'opacity 0.4s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.88)',
          transition: 'opacity 0.7s ease, transform 0.7s ease',
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 26,
            color: '#fff',
            letterSpacing: '-0.5px',
          }}
        >
          S
        </div>
        <div style={{ fontWeight: 700, fontSize: 22, color: '#fff', letterSpacing: '-0.4px' }}>
          Scout
        </div>
      </div>
    </div>
  );
}
