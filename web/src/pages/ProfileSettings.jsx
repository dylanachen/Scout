import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import PasswordField from '../components/PasswordField';
import { useAuth } from '../hooks/useAuth';
import { formatAuthError } from '../utils/authErrors';

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());
}

export default function ProfileSettings() {
  const { user, updateProfile, changePassword, deleteAccount } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarDataUrl, setAvatarDataUrl] = useState(null);
  const baseline = useRef({ name: '', email: '', avatar: null });

  const nameRef = useRef(null);
  const emailRef = useRef(null);

  const [nameTouched, setNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');

  const [expandPw, setExpandPw] = useState(false);
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confPw, setConfPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwOk, setPwOk] = useState('');

  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const n = user.name ?? '';
    const e = user.email ?? '';
    const a = user.avatar_url ?? null;
    setName(n);
    setEmail(e);
    setAvatarDataUrl(a);
    baseline.current = { name: n, email: e, avatar: a };
  }, [user]);

  useEffect(() => {
    if (searchParams.get('expand') === 'password') {
      setExpandPw(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const focus = location.state?.focus;
    if (focus === 'name') nameRef.current?.focus();
    if (focus === 'email') emailRef.current?.focus();
  }, [location.state]);

  const dirty =
    name.trim() !== baseline.current.name.trim() ||
    email.trim() !== baseline.current.email.trim() ||
    avatarDataUrl !== baseline.current.avatar;

  const blurName = () => {
    setNameTouched(true);
    setNameError(!name.trim() ? 'Enter your name.' : '');
  };
  const blurEmail = () => {
    setEmailTouched(true);
    setEmailError(!email.trim() ? 'Enter your email.' : !isValidEmail(email) ? 'Enter a valid email.' : '');
  };

  const onPickPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setAvatarDataUrl(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaveError('');
    blurName();
    blurEmail();
    const ne = !name.trim() ? 'Enter your name.' : '';
    const ee = !email.trim() ? 'Enter your email.' : !isValidEmail(email) ? 'Enter a valid email.' : '';
    setNameError(ne);
    setEmailError(ee);
    if (ne || ee) return;

    setSaveLoading(true);
    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim(),
        avatar_url: avatarDataUrl,
      });
      baseline.current = {
        name: name.trim(),
        email: email.trim(),
        avatar: avatarDataUrl,
      };
    } catch (err) {
      setSaveError(formatAuthError(err) ?? 'Could not save changes.');
    } finally {
      setSaveLoading(false);
    }
  };

  const submitPw = async () => {
    setPwError('');
    setPwOk('');
    if (newPw.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    if (newPw !== confPw) {
      setPwError('New passwords do not match.');
      return;
    }
    setPwLoading(true);
    try {
      await changePassword({ currentPassword: curPw, newPassword: newPw });
      setCurPw('');
      setNewPw('');
      setConfPw('');
      setPwOk('Password updated.');
    } catch (err) {
      setPwError(formatAuthError(err) ?? 'Could not update password.');
    } finally {
      setPwLoading(false);
    }
  };

  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteAccount();
    } catch {
      setDeleteLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 20px 48px' }}>
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

      <h1 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 8px' }}>Account Settings</h1>
      <p style={{ fontSize: 14, color: 'var(--color-text-3)', marginBottom: 28 }}>
        Update your profile photo, name, email, and password.
      </p>

      <form onSubmit={saveProfile}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <label style={{ position: 'relative', cursor: 'pointer' }}>
            <input type="file" accept="image/*" onChange={onPickPhoto} style={{ display: 'none' }} />
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                background: 'var(--color-surface-3)',
                backgroundImage: avatarDataUrl ? `url(${avatarDataUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid var(--color-border)',
                overflow: 'hidden',
              }}
            >
              {!avatarDataUrl ? (
                <span style={{ fontSize: 28, color: 'var(--color-text-3)' }} aria-hidden>
                  ◎
                </span>
              ) : null}
            </div>
            <span
              style={{
                position: 'absolute',
                right: 0,
                bottom: 0,
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: 'var(--color-primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                border: '2px solid var(--color-surface)',
              }}
              aria-hidden
            >
              ✎
            </span>
          </label>
        </div>

        <label
          htmlFor="ps-name"
          style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-2)', display: 'block', marginBottom: 6 }}
        >
          Full name
        </label>
        <input
          ref={nameRef}
          id="ps-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={blurName}
          autoComplete="name"
          style={{
            width: '100%',
            padding: '10px 12px',
            border: `1px solid ${nameTouched && nameError ? 'var(--color-danger)' : 'var(--color-border)'}`,
            borderRadius: 9,
            fontSize: 13,
            fontFamily: 'var(--font-sans)',
            marginBottom: nameTouched && nameError ? 6 : 14,
            color: 'var(--color-text)',
            background: 'var(--color-surface)',
          }}
        />
        {nameTouched && nameError ? (
          <p style={{ fontSize: 12, color: 'var(--color-danger)', margin: '0 0 14px' }}>{nameError}</p>
        ) : null}

        <label
          htmlFor="ps-email"
          style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-2)', display: 'block', marginBottom: 6 }}
        >
          Email
        </label>
        <input
          ref={emailRef}
          id="ps-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={blurEmail}
          autoComplete="email"
          style={{
            width: '100%',
            padding: '10px 12px',
            border: `1px solid ${emailTouched && emailError ? 'var(--color-danger)' : 'var(--color-border)'}`,
            borderRadius: 9,
            fontSize: 13,
            fontFamily: 'var(--font-sans)',
            marginBottom: emailTouched && emailError ? 6 : 20,
            color: 'var(--color-text)',
            background: 'var(--color-surface)',
          }}
        />
        {emailTouched && emailError ? (
          <p style={{ fontSize: 12, color: 'var(--color-danger)', margin: '0 0 20px' }}>{emailError}</p>
        ) : null}

        <div
          style={{
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            overflow: 'hidden',
            marginBottom: 20,
          }}
        >
          <button
            type="button"
            onClick={() => setExpandPw((x) => !x)}
            style={{
              width: '100%',
              padding: '14px 16px',
              border: 'none',
              background: 'var(--color-surface-2)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              color: 'var(--color-text)',
            }}
          >
            Change password
            <span aria-hidden style={{ color: 'var(--color-text-3)' }}>
              {expandPw ? '▾' : '▸'}
            </span>
          </button>
          {expandPw ? (
            <div style={{ padding: '16px', borderTop: '1px solid var(--color-border)' }}>
              <PasswordField
                label="Current password"
                value={curPw}
                onChange={setCurPw}
                autoComplete="current-password"
                id="ps-cur-pw"
              />
              <PasswordField
                label="New password"
                value={newPw}
                onChange={setNewPw}
                autoComplete="new-password"
                id="ps-new-pw"
              />
              <PasswordField
                label="Confirm new password"
                value={confPw}
                onChange={setConfPw}
                autoComplete="new-password"
                id="ps-conf-pw"
              />
              {pwError ? <p style={{ fontSize: 12, color: 'var(--color-danger)', marginBottom: 10 }}>{pwError}</p> : null}
              {pwOk ? <p style={{ fontSize: 12, color: '#15803d', marginBottom: 10 }}>{pwOk}</p> : null}
              <button
                type="button"
                onClick={() => void submitPw()}
                disabled={pwLoading}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 9,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: pwLoading ? 'wait' : 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {pwLoading ? 'Updating…' : 'Update password'}
              </button>
            </div>
          ) : null}
        </div>

        {saveError ? (
          <p style={{ fontSize: 13, color: 'var(--color-danger)', marginBottom: 12 }}>{saveError}</p>
        ) : null}

        <button
          type="submit"
          disabled={!dirty || saveLoading}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: 9,
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            cursor: !dirty || saveLoading ? 'not-allowed' : 'pointer',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'var(--font-sans)',
            opacity: !dirty || saveLoading ? 0.55 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 44,
          }}
        >
          {saveLoading ? <span className="scout-spinner" aria-hidden /> : 'Save Changes'}
        </button>
      </form>

      <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 32, paddingTop: 24 }}>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--color-danger)',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          Delete Account
        </button>
      </div>

      {deleteOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-del-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,22,35,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              borderRadius: 12,
              padding: 24,
              maxWidth: 400,
              width: '100%',
              border: '1px solid var(--color-border)',
            }}
          >
            <h2 id="profile-del-title" style={{ margin: '0 0 8px', fontSize: 18 }}>
              Delete account?
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
              Are you sure? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-2)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteLoading}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--color-danger)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: deleteLoading ? 'wait' : 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {deleteLoading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
