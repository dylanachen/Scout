import { useNavigate } from 'react-router-dom';
import OnboardingChatScreen from '../components/onboarding/OnboardingChatScreen';
import { CLIENT_STEPS } from '../data/onboardingFlows';
import { useAuth } from '../hooks/useAuth';

export default function OnboardingClient() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const firstName = (user?.full_name || user?.name || '').split(' ')[0];

  return (
    <OnboardingChatScreen
      steps={CLIENT_STEPS}
      storageKey="scout_onboarding_client"
      firstName={firstName}
      showBuildProfileFinale
      buildProfileMessage="Great — I have everything I need. Finding your best freelancer matches now…"
      onComplete={() => navigate('/onboarding/matching?role=client', { replace: true })}
    />
  );
}
