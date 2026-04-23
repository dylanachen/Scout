import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function FeatureStub() {
  const { t } = useTranslation();
  const location = useLocation();
  const title = location.state?.title ?? t('featureStub.title');
  const description = location.state?.description ?? t('featureStub.description');
  const profile = location.state?.profile;
  const initial = String(profile?.name || '?').trim().slice(0, 1).toUpperCase();

  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>{title}</h1>
      <p style={{ color: 'var(--color-text-2)' }}>{description}</p>
      {profile ? (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 12, background: 'var(--color-surface)', padding: 14, marginBottom: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={`${profile.name} avatar`} style={{ width: 58, height: 58, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 58, height: 58, borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 24 }}>
              {initial}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 700 }}>{profile.name || t('featureStub.profileName')}</div>
            <div style={{ color: 'var(--color-text-2)', fontSize: 13 }}>{profile.role || t('featureStub.profileRole')}</div>
          </div>
        </div>
      ) : null}
      <div style={{ border: '1px solid var(--color-border)', borderRadius: 12, background: 'var(--color-surface)', padding: 14 }}>
        <h3 style={{ marginTop: 0 }}>{t('featureStub.previewTitle')}</h3>
        <p style={{ marginBottom: 0 }}>{t('featureStub.todo')}</p>
      </div>
    </div>
  );
}
