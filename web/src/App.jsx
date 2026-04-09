import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { TimeTrackingProvider, useTimeTracking } from './hooks/useTimeTracking';
import NavSidebar from './components/NavSidebar';
import MobileTabBar from './components/MobileTabBar';
import UserNavMenu from './components/UserNavMenu';
import NotificationBell from './components/NotificationBell';
import { NotificationsProvider } from './hooks/useNotifications';
import NavTimerIndicator from './components/time/NavTimerIndicator';
import StopTimerModal from './components/time/StopTimerModal';
import TimeTrackingFloatingPanel from './components/time/TimeTrackingFloatingPanel';
import RequireAuth from './components/RequireAuth';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import PipelineView from './pages/PipelineView';
import Notifications from './pages/Notifications';
import ProjectChat from './pages/ProjectChat';
import Onboarding from './pages/Onboarding';
import OnboardingFreelancer from './pages/OnboardingFreelancer';
import OnboardingClient from './pages/OnboardingClient';
import AssetChecklist from './pages/AssetChecklist';
import MatchTransition from './pages/MatchTransition';
import MatchResults from './pages/MatchResults';
import MatchConfirmation from './pages/MatchConfirmation';
import Invoices from './pages/Invoices';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import SettingsLayout from './pages/settings/SettingsLayout';
import SettingsHome from './pages/settings/SettingsHome';
import NotificationPreferences from './pages/settings/NotificationPreferences';
import ScopeGuardianSettings from './pages/settings/ScopeGuardianSettings';
import RatesPricingSettings from './pages/settings/RatesPricingSettings';
import CommunicationPreferences from './pages/settings/CommunicationPreferences';
import AccountScreen from './pages/settings/AccountScreen';
import ProfileSettings from './pages/ProfileSettings';
import ContractUpload from './pages/ContractUpload';
import ChangeOrderPreview from './pages/ChangeOrderPreview';
import InvoiceDraft from './pages/InvoiceDraft';
import ScopeDriftReport from './pages/ScopeDriftReport';
import MeetingSummary from './pages/MeetingSummary';
import WeeklyTimeSummary from './pages/WeeklyTimeSummary';
import PublicFreelancerProfile from './pages/PublicFreelancerProfile';
import RateClient from './pages/RateClient';
import Splash from './pages/Splash';
import OnboardingCarousel from './pages/OnboardingCarousel';
import { isDemoMode } from './api/demoAdapter';
import './styles/tokens.css';

function TimeTrackingModals() {
  const { stopModalOpen, session, elapsedMs, cancelStopModal, confirmStop, discardSession } = useTimeTracking();
  return (
    <StopTimerModal
      open={stopModalOpen}
      projectName={session?.projectName}
      elapsedMs={elapsedMs}
      onConfirm={confirmStop}
      onCancel={cancelStopModal}
      onDiscard={discardSession}
    />
  );
}

function Layout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--color-text-3)' }}>
        Loading…
      </div>
    );
  }

  if (!user) return <Navigate to="/splash" replace />;

  return (
    <NotificationsProvider>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <NavSidebar />

        <div className="layout-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <header
            style={{
              height: 54,
              padding: '0 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              flexShrink: 0,
              /* Popovers (bell, profile) extend below header; next sibling would paint over them without this */
              position: 'relative',
              zIndex: 30,
            }}
          >
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-.2px' }}>FreelanceOS</div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <NavTimerIndicator />
            <NotificationBell />
            {isDemoMode() ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#92400e',
                  background: '#fef3c7',
                  padding: '4px 8px',
                  borderRadius: 6,
                }}
              >
                Demo mode
              </span>
            ) : null}
            <div className="mobile-header-user">
              <UserNavMenu variant="compact" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} className="desktop-header-status">
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} />
              <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{isDemoMode() ? 'Local' : 'Live'}</span>
            </div>
          </div>
        </header>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/pipeline" element={<PipelineView />} />
            <Route path="/matches" element={<MatchResults />} />
            <Route path="/matches/confirm" element={<MatchConfirmation />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/chat" element={<ProjectChat />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/settings" element={<SettingsLayout />}>
              <Route index element={<SettingsHome />} />
              <Route path="notifications" element={<NotificationPreferences />} />
              <Route path="scope-guardian" element={<ScopeGuardianSettings />} />
              <Route path="rates-pricing" element={<RatesPricingSettings />} />
              <Route path="communication" element={<CommunicationPreferences />} />
              <Route path="account" element={<AccountScreen />} />
              <Route path="profile" element={<ProfileSettings />} />
            </Route>
            <Route path="/projects/:projectId/contract" element={<ContractUpload />} />
            <Route path="/projects/:projectId/change-order" element={<ChangeOrderPreview />} />
            <Route path="/projects/:projectId/invoice-draft" element={<InvoiceDraft />} />
            <Route path="/projects/:projectId/scope-drift" element={<ScopeDriftReport />} />
            <Route path="/projects/:projectId/meeting-summary" element={<MeetingSummary />} />
            <Route path="/projects/:projectId/rate-client" element={<RateClient />} />
            <Route path="/time/week" element={<WeeklyTimeSummary />} />
          </Routes>
        </div>

        <MobileTabBar />
        <TimeTrackingFloatingPanel />
        <TimeTrackingModals />
        </div>
      </div>
    </NotificationsProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/splash" element={<Splash />} />
          <Route path="/welcome" element={<OnboardingCarousel />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/profile/:username" element={<PublicFreelancerProfile />} />
          <Route
            path="/onboarding/freelancer"
            element={
              <RequireAuth>
                <OnboardingFreelancer />
              </RequireAuth>
            }
          />
          <Route
            path="/onboarding/client"
            element={
              <RequireAuth>
                <OnboardingClient />
              </RequireAuth>
            }
          />
          <Route
            path="/onboarding/client/assets"
            element={
              <RequireAuth>
                <AssetChecklist />
              </RequireAuth>
            }
          />
          <Route
            path="/onboarding/matching"
            element={
              <RequireAuth>
                <MatchTransition />
              </RequireAuth>
            }
          />
          <Route
            path="/*"
            element={
              <TimeTrackingProvider>
                <Layout />
              </TimeTrackingProvider>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
