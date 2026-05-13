import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import i18n from '../../i18n';

const categories = [
  { to: '/settings/notifications', titleKey: 'settingsPage.categories.notificationsTitle', descriptionKey: 'settingsPage.categories.notificationsDescription' },
  { to: '/settings/scope-guardian', titleKey: 'settingsPage.categories.scopeGuardianTitle', descriptionKey: 'settingsPage.categories.scopeGuardianDescription' },
  { to: '/settings/rates-pricing', titleKey: 'settingsPage.categories.ratesTitle', descriptionKey: 'settingsPage.categories.ratesDescription' },
  { to: '/settings/communication', titleKey: 'settingsPage.categories.communicationTitle', descriptionKey: 'settingsPage.categories.communicationDescription' },
  { to: '/settings/account', titleKey: 'settingsPage.categories.accountTitle', descriptionKey: 'settingsPage.categories.accountDescription' },
];

const workspaceLinks = [
  { to: '/proposals', label: 'Proposals' },
  { to: '/earnings', label: 'Earnings' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/inbox', label: 'Unified Inbox' },
  { to: '/search', label: 'Global Search' },
  { to: '/referrals', label: 'Referrals' },
  { to: '/disputes', label: 'Disputes' },
  { to: '/payment-methods', label: 'Payment methods' },
];

const securityLinks = [
  { to: '/settings/two-factor', label: 'Two-factor authentication' },
  { to: '/settings/sessions', label: 'Active sessions' },
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'zh', label: '中文' },
];

function rowStyle() {
  return {
    display: 'block',
    padding: '16px 18px',
    borderRadius: 12,
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'background 0.12s ease',
  };
}

export default function SettingsHome() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const name = user?.name?.trim() || '—';
  const email = user?.email?.trim() || '—';
  const initial = (name && name !== '—') ? name[0].toUpperCase() : '?';

  const [language, setLanguage] = useState(() => localStorage.getItem('scout_language') || 'en');
  const [density, setDensity] = useState(() => localStorage.getItem('scout_density') || 'comfortable');

  useEffect(() => {
    if (i18n.language !== language) i18n.changeLanguage(language);
    localStorage.setItem('scout_language', language);
  }, [language]);

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
    localStorage.setItem('scout_density', density);
  }, [density]);

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 20px 48px' }}>
      <div style={{ marginBottom: 20 }}>
        <Link
          to="/"
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
          <span aria-hidden>←</span> {t('settingsPage.backToDashboard')}
        </Link>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 8px' }}>{t('common.settings')}</h1>
      <p style={{ fontSize: 14, color: 'var(--color-text-3)', marginBottom: 28 }}>
        {t('settingsPage.subtitle')}
      </p>

      <button
        type="button"
        onClick={toggleTheme}
        style={{
          width: '100%',
          marginBottom: 10,
          borderRadius: 10,
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
          padding: '12px 14px',
          textAlign: 'left',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        {t('settingsPage.theme')}: {theme === 'dark' ? t('settingsPage.dark') : t('settingsPage.light')}
      </button>

      <div style={{ ...rowStyle(), display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 600 }}>Language</span>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
      </div>

      <div style={{ ...rowStyle(), display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span style={{ fontWeight: 600 }}>Density</span>
        <div style={{ display: 'inline-flex', gap: 4 }}>
          {['comfortable', 'compact'].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setDensity(opt)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                background: density === opt ? 'var(--color-primary)' : 'var(--color-surface)',
                color: density === opt ? '#fff' : 'var(--color-text-2)',
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'capitalize',
                cursor: 'pointer',
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <Link
        to="/settings/account"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '16px 18px',
          borderRadius: 12,
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          textDecoration: 'none',
          color: 'inherit',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'var(--color-primary)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{name}</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-3)', wordBreak: 'break-all' }}>{email}</div>
        </div>
        <span style={{ color: 'var(--color-text-3)', flexShrink: 0 }} aria-hidden>→</span>
      </Link>

      <Section title="Preferences">
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {categories.map((c) => (
            <Link key={c.to} to={c.to} style={rowStyle()}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{t(c.titleKey)}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-3)', lineHeight: 1.4 }}>{t(c.descriptionKey)}</div>
                </div>
                <span style={{ color: 'var(--color-text-3)', flexShrink: 0 }} aria-hidden>→</span>
              </div>
            </Link>
          ))}
        </nav>
      </Section>

      <Section title="Security">
        {securityLinks.map((l) => (
          <Link key={l.to} to={l.to} style={rowStyle()}>{l.label}</Link>
        ))}
      </Section>

      <Section title="Workspace">
        {workspaceLinks.map((l) => (
          <Link key={l.to} to={l.to} style={rowStyle()}>{l.label}</Link>
        ))}
      </Section>

      <Section title="Support">
        <Link to="/help" style={rowStyle()}>{t('legal.helpTitle')}</Link>
        <Link to="/whats-new" style={rowStyle()}>What&apos;s new</Link>
        <Link to="/settings/feature-flags" style={rowStyle()}>Feature flags (dev)</Link>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-3)', letterSpacing: '0.05em' }}>
        {title}
      </h2>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</nav>
    </div>
  );
}
