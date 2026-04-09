import { useState, useRef } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import AuthPageLayout, { FreelanceLogo } from '../components/AuthPageLayout';
import PasswordField from '../components/PasswordField';
import { useAuth } from '../hooks/useAuth';
import { formatAuthError } from '../utils/authErrors';

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());
}

function getPasswordStrength(pw) {
  if (!pw) return null;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: 'Weak', color: '#dc2626', pct: 33 };
  if (score <= 3) return { label: 'Fair', color: '#ca8a04', pct: 66 };
  return { label: 'Strong', color: '#16a34a', pct: 100 };
}

export default function SignUp() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const formRef = useRef(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [shaking, setShaking] = useState(false);

  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});

  if (user) return <Navigate to="/" replace />;

  const validateName = (v) => (!String(v).trim() ? 'Enter your full name.' : '');
  const validateEmail = (v) => {
    const t = String(v).trim();
    if (!t) return 'Enter your email.';
    if (!isValidEmail(t)) return 'Enter a valid email address.';
    return '';
  };
  const validatePassword = (v) => (!v || v.length < 8 ? 'Use at least 8 characters.' : '');
  const validateConfirm = (v) => (v !== password ? 'Passwords do not match.' : '');

  const blur = (field) => {
    setTouched((x) => ({ ...x, [field]: true }));
    if (field === 'fullName') setErrors((e) => ({ ...e, fullName: validateName(fullName) }));
    if (field === 'email') setErrors((e) => ({ ...e, email: validateEmail(email) }));
    if (field === 'password') setErrors((e) => ({ ...e, password: validatePassword(password) }));
    if (field === 'confirm') setErrors((e) => ({ ...e, confirm: validateConfirm(confirm) }));
  };

  const allFieldsFilled =
    fullName.trim() &&
    email.trim() &&
    password.length >= 8 &&
    confirm === password &&
    role &&
    termsAccepted;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const eName = validateName(fullName);
    const eEmail = validateEmail(email);
    const ePass = validatePassword(password);
    const eConf = validateConfirm(confirm);
    setErrors({ fullName: eName, email: eEmail, password: ePass, confirm: eConf });
    setTouched({ fullName: true, email: true, password: true, confirm: true });

    if (eName || eEmail || ePass || eConf || !role || !termsAccepted) {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      return;
    }

    setLoading(true);
    try {
      await register({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        role,
      });
      const onboardingPath =
        role === 'client' ? '/onboarding/client' : '/onboarding/freelancer';
      navigate(onboardingPath, { replace: true });
    } catch (err) {
      setFormError(formatAuthError(err) ?? 'Could not create account.');
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength(password);

  const inputBase = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 9,
    fontSize: 13,
    fontFamily: 'var(--font-sans)',
    outline: 'none',
    color: 'var(--color-text)',
    background: 'var(--color-surface)',
  };

  const cardBase = {
    flex: 1,
    minWidth: 0,
    padding: '14px 12px',
    borderRadius: 12,
    border: '2px solid var(--color-border)',
    background: 'var(--color-surface)',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'var(--font-sans)',
    transition: 'var(--transition)',
    position: 'relative',
  };

  return (
    <AuthPageLayout>
      <div style={{ textAlign: 'center' }}>
        <FreelanceLogo centered />
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.3px', marginBottom: 6, marginTop: 0 }}>
        Create your account
      </h1>
      <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 0, marginBottom: 22, textAlign: 'center' }}>
        Join 30 million+ freelancers building smarter client relationships
      </p>

      {formError ? (
        <p style={{ fontSize: 13, color: 'var(--color-danger)', marginBottom: 14 }}>{formError}</p>
      ) : null}

      <form ref={formRef} onSubmit={handleSubmit} className={shaking ? 'fos-shake' : ''}>
        {/* Full name */}
        <label
          htmlFor="su-name"
          style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-2)', display: 'block', marginBottom: 6 }}
        >
          Full name
        </label>
        <input
          id="su-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          onBlur={() => blur('fullName')}
          placeholder="Your full name"
          autoComplete="name"
          aria-invalid={touched.fullName && errors.fullName ? 'true' : undefined}
          style={{
            ...inputBase,
            border: `1px solid ${touched.fullName && errors.fullName ? 'var(--color-danger)' : 'var(--color-border)'}`,
            marginBottom: 6,
          }}
        />
        {touched.fullName && errors.fullName ? (
          <p style={{ fontSize: 12, color: 'var(--color-danger)', margin: '0 0 10px' }}>{errors.fullName}</p>
        ) : (
          <div style={{ marginBottom: 14 }} />
        )}

        {/* Email */}
        <label
          htmlFor="su-email"
          style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-2)', display: 'block', marginBottom: 6 }}
        >
          Email
        </label>
        <input
          id="su-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => blur('email')}
          placeholder="you@email.com"
          autoComplete="email"
          aria-invalid={touched.email && errors.email ? 'true' : undefined}
          style={{
            ...inputBase,
            border: `1px solid ${touched.email && errors.email ? 'var(--color-danger)' : 'var(--color-border)'}`,
            marginBottom: 6,
          }}
        />
        {touched.email && errors.email ? (
          <p style={{ fontSize: 12, color: 'var(--color-danger)', margin: '0 0 10px' }}>{errors.email}</p>
        ) : (
          <div style={{ marginBottom: 14 }} />
        )}

        {/* Password */}
        <PasswordField
          label="Password"
          value={password}
          placeholder="Create a password"
          onChange={(v) => {
            setPassword(v);
            if (touched.confirm)
              setErrors((e) => ({ ...e, confirm: v !== confirm ? 'Passwords do not match.' : '' }));
          }}
          error={touched.password ? errors.password : ''}
          onBlur={() => blur('password')}
          autoComplete="new-password"
          id="su-password"
        />

        {/* Password strength bar */}
        {password.length > 0 && strength && (
          <div style={{ marginTop: -8, marginBottom: 10 }}>
            <div style={{ height: 4, borderRadius: 2, background: 'var(--color-border)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${strength.pct}%`,
                  background: strength.color,
                  borderRadius: 2,
                  transition: 'width 0.3s ease, background 0.3s ease',
                }}
              />
            </div>
            <span style={{ fontSize: 11, color: strength.color, fontWeight: 500, marginTop: 3, display: 'inline-block' }}>
              {strength.label}
            </span>
          </div>
        )}

        {/* Confirm password */}
        <PasswordField
          label="Confirm password"
          value={confirm}
          placeholder="Confirm your password"
          onChange={(v) => {
            setConfirm(v);
            if (touched.confirm)
              setErrors((e) => ({ ...e, confirm: v !== password ? 'Passwords do not match.' : '' }));
          }}
          error={touched.confirm ? errors.confirm : ''}
          onBlur={() => blur('confirm')}
          autoComplete="new-password"
          id="su-confirm"
        />

        {/* Role selector */}
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 10 }}>
          Choose your role
        </div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => setRole('freelancer')}
            style={{
              ...cardBase,
              borderColor: role === 'freelancer' ? 'var(--color-primary)' : 'var(--color-border)',
              background: role === 'freelancer' ? 'rgba(29, 110, 205, 0.06)' : 'var(--color-surface)',
            }}
          >
            {role === 'freelancer' && (
              <div style={{
                position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: '50%',
                background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, color: '#fff',
              }}>
                ✓
              </div>
            )}
            <div style={{ fontSize: 22, marginBottom: 6 }} aria-hidden>💼</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)', marginBottom: 4 }}>
              I&apos;m a Freelancer
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', lineHeight: 1.4 }}>
              I find and work with clients
            </div>
          </button>
          <button
            type="button"
            onClick={() => setRole('client')}
            style={{
              ...cardBase,
              borderColor: role === 'client' ? 'var(--color-primary)' : 'var(--color-border)',
              background: role === 'client' ? 'rgba(29, 110, 205, 0.06)' : 'var(--color-surface)',
            }}
          >
            {role === 'client' && (
              <div style={{
                position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: '50%',
                background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, color: '#fff',
              }}>
                ✓
              </div>
            )}
            <div style={{ fontSize: 22, marginBottom: 6 }} aria-hidden>🏢</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)', marginBottom: 4 }}>
              I&apos;m a Client
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', lineHeight: 1.4 }}>
              I hire freelancers for projects
            </div>
          </button>
        </div>

        {/* Terms checkbox */}
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            fontSize: 13,
            color: 'var(--color-text-2)',
            cursor: 'pointer',
            marginBottom: 20,
            lineHeight: 1.45,
          }}
        >
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            style={{ marginTop: 3, accentColor: 'var(--color-primary)' }}
          />
          <span>
            I agree to the{' '}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); alert('Terms of Service — coming soon'); }}
              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 'inherit', fontFamily: 'inherit', textDecoration: 'underline' }}
            >
              Terms of Service
            </button>{' '}
            and{' '}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); alert('Privacy Policy — coming soon'); }}
              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 'inherit', fontFamily: 'inherit', textDecoration: 'underline' }}
            >
              Privacy Policy
            </button>
          </span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !allFieldsFilled}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: 9,
            background: allFieldsFilled ? 'var(--color-primary)' : '#a8c4e0',
            color: '#fff',
            border: 'none',
            cursor: loading || !allFieldsFilled ? 'not-allowed' : 'pointer',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'var(--font-sans)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 44,
            opacity: loading ? 0.85 : 1,
            transition: 'background 0.2s ease',
          }}
        >
          {loading ? (
            <>
              <span className="fos-spinner" aria-hidden style={{ marginRight: 8 }} />
              Creating your account…
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 22, textAlign: 'center' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
          Log in
        </Link>
      </p>
    </AuthPageLayout>
  );
}
