import { useNavigate } from 'react-router-dom';
import OnboardingChatScreen from '../components/onboarding/OnboardingChatScreen';
import { FREELANCER_STEPS } from '../data/onboardingFlows';
import { useAuth } from '../hooks/useAuth';
import { setProfileExtras } from '../utils/profileExtrasStorage';
import { api } from '../api/client';
import { isDemoMode } from '../api/demoAdapter';

function parseRateCents(rawAmount) {
  const digits = String(rawAmount ?? '').replace(/[^0-9.]/g, '');
  const n = parseFloat(digits);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export default function OnboardingFreelancer() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const firstName = (user?.full_name || user?.name || '').split(' ')[0];

  const handleComplete = async (answers) => {
    if (user?.id != null) {
      const patch = {};
      if (answers.specialty) patch.specialty = answers.specialty;
      if (answers.tools) patch.skills = answers.tools.split('; ');
      if (answers.availability) patch.availability = answers.availability;
      if (answers.rate_structure) patch.rateStructure = answers.rate_structure;
      if (answers.rate_amount) patch.rateAmount = answers.rate_amount;
      setProfileExtras(user.id, patch);
    }

    if (!isDemoMode()) {
      const body = {};
      if (answers.specialty) body.specialty = answers.specialty;
      if (answers.tools) body.skills = answers.tools.split('; ').map((s) => s.trim()).filter(Boolean);
      if (answers.rate_amount) {
        const cents = parseRateCents(answers.rate_amount);
        if (cents) body.hourly_rate = cents;
      }
      if (answers.location) body.location = answers.location;
      if (answers.bio) body.bio = answers.bio;
      if (answers.availability === 'Yes' || answers.availability === 'Available now') {
        body.available = true;
      } else if (answers.availability && String(answers.availability).startsWith('Yes, starting')) {
        body.available = false;
        const m = String(answers.availability).match(/starting (.+)$/);
        if (m) body.available_from = m[1];
      }
      try {
        if (Object.keys(body).length) await api.patch('/profile', body);
        await refreshUser?.();
      } catch { /* non-fatal */ }
    }

    navigate('/', { replace: true });
  };

  return (
    <OnboardingChatScreen
      steps={FREELANCER_STEPS}
      storageKey="scout_onboarding_freelancer"
      firstName={firstName}
      showBuildProfileFinale
      buildProfileMessage={`Perfect, ${firstName || 'friend'} — I've got everything I need. Building your profile now…`}
      onComplete={handleComplete}
    />
  );
}
