import { useNavigate } from 'react-router-dom';
import OnboardingChatScreen from '../components/onboarding/OnboardingChatScreen';
import { CLIENT_STEPS } from '../data/onboardingFlows';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import { isDemoMode } from '../api/demoAdapter';

function parseUsdCents(raw) {
  const digits = String(raw ?? '').replace(/[^0-9.]/g, '');
  const n = parseFloat(digits);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export default function OnboardingClient() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const firstName = (user?.full_name || user?.name || '').split(' ')[0];

  const handleComplete = async (answers) => {
    if (!isDemoMode()) {
      const body = {};
      if (answers.project_summary) body.project_summary = answers.project_summary;
      if (answers.project_title) body.project_title = answers.project_title;
      if (answers.needs) body.required_skills = String(answers.needs).split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
      if (answers.budget) {
        const cents = parseUsdCents(answers.budget);
        if (cents) {
          body.budget_min = Math.round(cents * 0.8);
          body.budget_max = Math.round(cents * 1.2);
        }
      }
      if (answers.location) body.location = answers.location;
      if (answers.company) body.bio = `Company: ${answers.company}`;
      try {
        if (Object.keys(body).length) await api.patch('/profile', body);
        await refreshUser?.();
      } catch { /* non-fatal */ }
    }
    navigate('/onboarding/matching?role=client', { replace: true });
  };

  return (
    <OnboardingChatScreen
      steps={CLIENT_STEPS}
      storageKey="scout_onboarding_client"
      firstName={firstName}
      showBuildProfileFinale
      buildProfileMessage="Great — I have everything I need. Finding your best freelancer matches now…"
      onComplete={handleComplete}
    />
  );
}
