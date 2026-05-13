import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import AuthPageLayout, { ScoutLogo } from '../components/AuthPageLayout';
import { useAuth } from '../hooks/useAuth';
import { formatAuthError } from '../utils/authErrors';

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());
}

export default function ForgotPassword() {
  const { user, forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const validateEmail = () => {
    const t = email.trim();
    if (!t) return 'Enter your email.';
    if (!isValidEmail(t)) return 'Enter a valid email address.';
    return '';
  };

  const onBlurEmail = () => {
    setTouched(true);
    setEmailError(validateEmail());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    const err = validateEmail();
    setTouched(true);
    setEmailError(err);
    if (err) return;

    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSuccess(true);
    } catch (err2) {
      const apiMsg = formatAuthError(err2);
      const status = err2?.response?.status;
      setSubmitError(
        apiMsg ||
          (status === 404 ? 'No account found for that email.' : null) ||
          'Something went wrong.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageLayout>
      <Link
        to="/login"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: 'var(--color-text-2)',
          textDecoration: 'none',
          marginBottom: 20,
          fontWeight: 500,
        }}
      >
        <span aria-hidden style={{ fontSize: 18 }}>
          ←
        </span>
        Back to log in
      </Link>

      <div style={{ textAlign: 'center' }}>
        <ScoutLogo centered />
      </div>

      {success ? (
        <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(22, 163, 74, 0.12)',
              color: '#15803d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: 28,
            }}
            aria-hidden
          >
            ✓
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 8px' }}>Check your inbox</h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-3)', lineHeight: 1.5, margin: 0 }}>
            If an account exists for that email, we&apos;ve sent reset instructions.
          </p>
          <Link
            to="/login"
            style={{
              display: 'inline-block',
              marginTop: 24,
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--color-primary)',
              textDecoration: 'none',
            }}
          >
            Return to log in
          </Link>
        </div>
      ) : (
        <>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.3px', marginBottom: 8, marginTop: 0 }}>
            Reset your password
          </h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-3)', marginBottom: 22, lineHeight: 1.5 }}>
            We&apos;ll send a reset link to your email.
          </p>

          <form onSubmit={handleSubmit}>
            <label
              htmlFor="fp-email"
              style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-2)', display: 'block', marginBottom: 6 }}
            >
              Email
            </label>
            <input
              id="fp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={onBlurEmail}
              autoComplete="email"
              aria-invalid={touched && emailError ? 'true' : undefined}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${touched && emailError ? 'var(--color-danger)' : 'var(--color-border)'}`,
                borderRadius: 9,
                fontSize: 13,
                fontFamily: 'var(--font-sans)',
                outline: 'none',
                marginBottom: 6,
                color: 'var(--color-text)',
                background: 'var(--color-surface)',
              }}
            />
            {touched && emailError ? (
              <p style={{ fontSize: 12, color: 'var(--color-danger)', margin: '0 0 10px' }}>{emailError}</p>
            ) : null}
            {submitError ? (
              <p style={{ fontSize: 12, color: 'var(--color-danger)', margin: '0 0 12px' }}>{submitError}</p>
            ) : null}

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
              {loading ? <span className="scout-spinner" aria-hidden /> : 'Send Reset Link'}
            </button>
          </form>
        </>
      )}
    </AuthPageLayout>
  );
}
