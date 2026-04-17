import { useNavigate } from 'react-router-dom';
import OnboardingChatScreen from '../components/onboarding/OnboardingChatScreen';
import { FREELANCER_STEPS } from '../data/onboardingFlows';
import { useAuth } from '../hooks/useAuth';
import { setProfileExtras } from '../utils/profileExtrasStorage';

export default function OnboardingFreelancer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const firstName = (user?.full_name || user?.name || '').split(' ')[0];

  const handleComplete = (answers) => {
    if (user?.id != null) {
      const patch = {};
      if (answers.specialty) patch.specialty = answers.specialty;
      if (answers.tools) patch.skills = answers.tools.split('; ');
      if (answers.availability) patch.availability = answers.availability;
      if (answers.rate_structure) patch.rateStructure = answers.rate_structure;
      if (answers.rate_amount) patch.rateAmount = answers.rate_amount;
      setProfileExtras(user.id, patch);
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
