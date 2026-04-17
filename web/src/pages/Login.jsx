import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import AuthPageLayout, { ScoutLogo } from '../components/AuthPageLayout';
import PasswordField from '../components/PasswordField';
import { useAuth } from '../hooks/useAuth';
import { formatAuthError } from '../utils/authErrors';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [banner, setBanner] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBanner('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setBanner(formatAuthError(err) || 'Incorrect email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageLayout>
      <div style={{ textAlign: 'center' }}>
        <ScoutLogo centered />
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.3px', marginBottom: 22, marginTop: 0 }}>
        Welcome back
      </h1>

      {banner ? (
        <div
          role="alert"
          style={{
            marginBottom: 16,
            padding: '10px 12px',
            borderRadius: 9,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            fontSize: 13,
            color: '#991b1b',
          }}
        >
          {banner}
        </div>
      ) : null}

      <form onSubmit={handleSubmit}>
        <label
          htmlFor="login-email"
          style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-2)', display: 'block', marginBottom: 6 }}
        >
          Email or username
        </label>
        <input
          id="login-email"
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          required
          autoComplete="username"
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

        <PasswordField
          label="Password"
          value={password}
          onChange={setPassword}
          placeholder="Enter your password"
          autoComplete="current-password"
          id="login-password"
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -4, marginBottom: 16 }}>
          <Link
            to="/forgot-password"
            style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: 9,
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'var(--font-sans)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 44,
            opacity: loading ? 0.85 : 1,
          }}
        >
          {loading ? <span className="scout-spinner" aria-hidden /> : 'Log In'}
        </button>
      </form>

      <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 22, textAlign: 'center' }}>
        Don&apos;t have an account?{' '}
        <Link to="/signup" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
          Sign up
        </Link>
      </p>
    </AuthPageLayout>
  );
}
