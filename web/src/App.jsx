import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import NavSidebar from './components/NavSidebar';
import Dashboard from './pages/Dashboard';
import ProjectChat from './pages/ProjectChat';
import Onboarding from './pages/Onboarding';
import Invoices from './pages/Invoices';
import { isDemoMode } from './api/demoAdapter';
import './styles/tokens.css';

function Layout() {
  const { user, loading } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-text-3)' }}>
        Loading…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <NavSidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="layout-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div
          style={{
            height: 54,
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            style={{
              width: 30,
              height: 30,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              color: 'var(--color-text-2)',
            }}
            className="hamburger"
            aria-label="Open menu"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-.2px' }}>FreelanceOS</div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {isDemoMode() ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#92400e',
                  background: '#fef3c7',
                  padding: '4px 8px',
                  borderRadius: 6,
                }}
              >
                Demo mode
              </span>
            ) : null}
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} />
            <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{isDemoMode() ? 'Local' : 'Live'}</span>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/chat" element={<ProjectChat />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/invoices" element={<Invoices />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function formatAuthError(err) {
  const d = err?.response?.data?.detail;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return d.map((x) => x.msg ?? JSON.stringify(x)).join(' ');
  return null;
}

function LoginPage() {
  const { login, register, user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const demo = isDemoMode();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const isSignUp = mode === 'signup';

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isSignUp) await register(email, password);
      else await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(
        formatAuthError(err) ?? (isSignUp ? 'Could not create account.' : 'Invalid email or password.'),
      );
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-surface-2)' }}>
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 14,
          padding: '32px 28px',
          width: '100%',
          maxWidth: 380,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div
            style={{
              width: 32,
              height: 32,
              background: 'var(--color-primary)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: 13,
              color: '#fff',
            }}
          >
            FO
          </div>
          <div style={{ fontWeight: 600, fontSize: 16 }}>FreelanceOS</div>
        </div>
        {demo ? (
          <div
            style={{
              marginBottom: 20,
              padding: '12px 14px',
              borderRadius: 10,
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              fontSize: 12,
              lineHeight: 1.5,
              color: '#1e3a5f',
            }}
          >
            <strong>Demo mode</strong> — no backend required. Use any email and password, or skip typing:
            <button
              type="button"
              onClick={async () => {
                setError('');
                try {
                  await login('demo@freelanceos.local', 'demo');
                  navigate('/', { replace: true });
                } catch (e) {
                  setError(formatAuthError(e) ?? 'Demo login failed.');
                }
              }}
              style={{
                display: 'block',
                width: '100%',
                marginTop: 10,
                padding: '8px 12px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--color-primary)',
                color: '#fff',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Explore signed-in UI
            </button>
          </div>
        ) : null}
        <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-.3px', marginBottom: 6 }}>
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginBottom: 24 }}>
          {isSignUp ? 'Sign up, then continue to your workspace' : 'Sign in to your workspace'}
        </p>
        {error && <p style={{ fontSize: 13, color: 'var(--color-danger)', marginBottom: 16 }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-2)', display: 'block', marginBottom: 6 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: 9,
              fontSize: 13,
              fontFamily: 'var(--font-sans)',
              outline: 'none',
              marginBottom: 14,
              color: 'var(--color-text)',
              background: 'var(--color-surface)',
            }}
          />
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-2)', display: 'block', marginBottom: 6 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={isSignUp ? 8 : undefined}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: 9,
              fontSize: 13,
              fontFamily: 'var(--font-sans)',
              outline: 'none',
              marginBottom: 20,
              color: 'var(--color-text)',
              background: 'var(--color-surface)',
            }}
          />
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: 9,
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
            }}
          >
            {isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 20, textAlign: 'center' }}>
          {isSignUp ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              New here?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Create an account
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<Layout />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
