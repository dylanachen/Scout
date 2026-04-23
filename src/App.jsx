import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { TimeTrackingProvider, useTimeTracking } from './hooks/useTimeTracking';
import NavSidebar from './components/NavSidebar';
import MobileTabBar from './components/MobileTabBar';
import UserNavMenu from './components/UserNavMenu';
import NotificationBell from './components/NotificationBell';
import { NotificationsProvider } from './hooks/useNotifications';
import { UnreadMessagesProvider } from './hooks/useUnreadMessages';
import NavTimerIndicator from './components/time/NavTimerIndicator';
import StopTimerModal from './components/time/StopTimerModal';
import TimeTrackingFloatingPanel from './components/time/TimeTrackingFloatingPanel';
import RequireAuth from './components/RequireAuth';
import ThemeToggle from './components/ThemeToggle';
import OfflineBanner from './components/OfflineBanner';
import CommandPalette from './components/CommandPalette';
import ShortcutsModal from './components/ShortcutsModal';
import { SkeletonBlock } from './components/Skeleton';
import { useHotkeys } from './hooks/useHotkeys';
import { useIdleLogout } from './hooks/useIdleLogout';
import { initAnalytics, trackPage } from './utils/analytics';
import Splash from './pages/Splash';
import OnboardingCarousel from './pages/OnboardingCarousel';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import { isDemoMode } from './api/demoAdapter';
import './styles/tokens.css';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Projects = lazy(() => import('./pages/Projects'));
const CreateProject = lazy(() => import('./pages/CreateProject'));
const ProjectTasks = lazy(() => import('./pages/ProjectTasks'));
const Interests = lazy(() => import('./pages/Interests'));
const Invitations = lazy(() => import('./pages/Invitations'));
const PipelineView = lazy(() => import('./pages/PipelineView'));
const Notifications = lazy(() => import('./pages/Notifications'));
const ProjectChat = lazy(() => import('./pages/ProjectChat'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const OnboardingFreelancer = lazy(() => import('./pages/OnboardingFreelancer'));
const OnboardingClient = lazy(() => import('./pages/OnboardingClient'));
const AssetChecklist = lazy(() => import('./pages/AssetChecklist'));
const MatchTransition = lazy(() => import('./pages/MatchTransition'));
const MatchResults = lazy(() => import('./pages/MatchResults'));
const MatchConfirmation = lazy(() => import('./pages/MatchConfirmation'));
const Invoices = lazy(() => import('./pages/Invoices'));
const SettingsLayout = lazy(() => import('./pages/settings/SettingsLayout'));
const SettingsHome = lazy(() => import('./pages/settings/SettingsHome'));
const NotificationPreferences = lazy(() => import('./pages/settings/NotificationPreferences'));
const ScopeGuardianSettings = lazy(() => import('./pages/settings/ScopeGuardianSettings'));
const RatesPricingSettings = lazy(() => import('./pages/settings/RatesPricingSettings'));
const CommunicationPreferences = lazy(() => import('./pages/settings/CommunicationPreferences'));
const AccountScreen = lazy(() => import('./pages/settings/AccountScreen'));
const ProfileSettings = lazy(() => import('./pages/ProfileSettings'));
const ContractUpload = lazy(() => import('./pages/ContractUpload'));
const ChangeOrderPreview = lazy(() => import('./pages/ChangeOrderPreview'));
const InvoiceDraft = lazy(() => import('./pages/InvoiceDraft'));
const ScopeDriftReport = lazy(() => import('./pages/ScopeDriftReport'));
const MeetingSummary = lazy(() => import('./pages/MeetingSummary'));
const WeeklyTimeSummary = lazy(() => import('./pages/WeeklyTimeSummary'));
const PublicFreelancerProfile = lazy(() => import('./pages/PublicFreelancerProfile'));
const RateClient = lazy(() => import('./pages/RateClient'));
const HelpFaq = lazy(() => import('./pages/HelpFaq'));
const FeatureStub = lazy(() => import('./pages/FeatureStub'));
const Proposals = lazy(() => import('./pages/Proposals'));
const ProposalDraft = lazy(() => import('./pages/ProposalDraft'));
const ProjectMilestones = lazy(() => import('./pages/ProjectMilestones'));
const Inbox = lazy(() => import('./pages/Inbox'));
const Earnings = lazy(() => import('./pages/Earnings'));
const CalendarPage = lazy(() => import('./pages/Calendar'));
const Referrals = lazy(() => import('./pages/Referrals'));
const Disputes = lazy(() => import('./pages/Disputes'));
const PaymentMethods = lazy(() => import('./pages/PaymentMethods'));
const SearchPage = lazy(() => import('./pages/Search'));
const Offline = lazy(() => import('./pages/Offline'));
const WhatsNew = lazy(() => import('./pages/WhatsNew'));
const TwoFactor = lazy(() => import('./pages/settings/TwoFactor'));
const Sessions = lazy(() => import('./pages/settings/Sessions'));
const FeatureFlagsPage = lazy(() => import('./pages/settings/FeatureFlagsPage'));

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

function RouteFallback() {
  return (
    <div style={{ padding: 24, flex: 1, maxWidth: 700, margin: '0 auto', width: '100%' }}>
      <SkeletonBlock lines={6} />
    </div>
  );
}

function RouteAnalytics() {
  useEffect(() => {
    initAnalytics();
    trackPage(window.location.pathname);
    const handler = () => trackPage(window.location.pathname);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);
  return null;
}

function GlobalHotkeys() {
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const handler = useCallback(
    ({ combo, sequence, event }) => {
      if (combo === 'mod+k') {
        setPaletteOpen(true);
        return true;
      }
      if (combo === '?') {
        setShortcutsOpen(true);
        return true;
      }
      if (combo === '/') {
        const el = document.querySelector('input[type="search"], [data-search-input]');
        if (el) {
          el.focus();
          return true;
        }
      }
      if (combo === 'Escape') {
        if (paletteOpen) {
          setPaletteOpen(false);
          return true;
        }
        if (shortcutsOpen) {
          setShortcutsOpen(false);
          return true;
        }
      }
      if (sequence.endsWith('gd')) {
        navigate('/');
        return true;
      }
      if (sequence.endsWith('gp')) {
        navigate('/projects');
        return true;
      }
      if (sequence.endsWith('gm')) {
        navigate('/matches');
        return true;
      }
      if (sequence.endsWith('gi')) {
        navigate('/invoices');
        return true;
      }
      if (sequence.endsWith('gn')) {
        navigate('/notifications');
        return true;
      }
      if (sequence.endsWith('gs')) {
        navigate('/settings');
        return true;
      }
      void event;
      return false;
    },
    [navigate, paletteOpen, shortcutsOpen],
  );

  useHotkeys(handler);

  return (
    <>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </>
  );
}

function IdleLogoutGuard() {
  useIdleLogout({ minutes: 15 });
  return null;
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
      <UnreadMessagesProvider>
        <a href="#main-content" className="scout-skip-link">Skip to main content</a>
        <OfflineBanner />
        <IdleLogoutGuard />
        <GlobalHotkeys />
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
                position: 'relative',
                zIndex: 30,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-.2px' }}>Scout</div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <NavTimerIndicator />
                <ThemeToggle />
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

            <main id="main-content" style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/projects/new" element={<CreateProject />} />
                  <Route path="/pipeline" element={<PipelineView />} />
                  <Route path="/matches" element={<MatchResults />} />
                  <Route path="/matches/confirm" element={<MatchConfirmation />} />
                  <Route path="/interests" element={<Interests />} />
                  <Route path="/invitations" element={<Invitations />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/chat" element={<ProjectChat />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/invoices" element={<Invoices />} />
                  <Route path="/proposals" element={<Proposals />} />
                  <Route path="/proposals/:proposalId" element={<ProposalDraft />} />
                  <Route path="/inbox" element={<Inbox />} />
                  <Route path="/earnings" element={<Earnings />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/referrals" element={<Referrals />} />
                  <Route path="/disputes" element={<Disputes />} />
                  <Route path="/payment-methods" element={<PaymentMethods />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/offline" element={<Offline />} />
                  <Route path="/whats-new" element={<WhatsNew />} />
                  <Route path="/settings" element={<SettingsLayout />}>
                    <Route index element={<SettingsHome />} />
                    <Route path="notifications" element={<NotificationPreferences />} />
                    <Route path="scope-guardian" element={<ScopeGuardianSettings />} />
                    <Route path="rates-pricing" element={<RatesPricingSettings />} />
                    <Route path="communication" element={<CommunicationPreferences />} />
                    <Route path="account" element={<AccountScreen />} />
                    <Route path="profile" element={<ProfileSettings />} />
                    <Route path="two-factor" element={<TwoFactor />} />
                    <Route path="sessions" element={<Sessions />} />
                    <Route path="feature-flags" element={<FeatureFlagsPage />} />
                  </Route>
                  <Route path="/projects/:projectId/tasks" element={<ProjectTasks />} />
                  <Route path="/projects/:projectId/contract" element={<ContractUpload />} />
                  <Route path="/projects/:projectId/change-order" element={<ChangeOrderPreview />} />
                  <Route path="/projects/:projectId/invoice-draft" element={<InvoiceDraft />} />
                  <Route path="/projects/:projectId/scope-drift" element={<ScopeDriftReport />} />
                  <Route path="/projects/:projectId/meeting-summary" element={<MeetingSummary />} />
                  <Route path="/projects/:projectId/rate-client" element={<RateClient />} />
                  <Route path="/projects/:projectId/milestones" element={<ProjectMilestones />} />
                  <Route path="/time/week" element={<WeeklyTimeSummary />} />
                  <Route path="/help" element={<HelpFaq />} />
                  <Route path="/feature/public-profile" element={<PublicFreelancerProfile />} />
                  <Route path="/feature/proposal" element={<Navigate to="/proposals" replace />} />
                  <Route path="/feature/milestones" element={<Navigate to="/projects" replace />} />
                  <Route path="/feature/search" element={<Navigate to="/search" replace />} />
                  <Route path="/feature/inbox" element={<Navigate to="/inbox" replace />} />
                  <Route path="/feature/payment-methods" element={<Navigate to="/payment-methods" replace />} />
                  <Route path="/feature/earnings" element={<Navigate to="/earnings" replace />} />
                  <Route path="/feature/referrals" element={<Navigate to="/referrals" replace />} />
                  <Route path="/feature/calendar" element={<Navigate to="/calendar" replace />} />
                  <Route path="/feature/dispute" element={<Navigate to="/disputes" replace />} />
                  <Route path="/feature/two-factor" element={<Navigate to="/settings/two-factor" replace />} />
                  <Route path="/feature/reviews" element={<FeatureStub />} />
                  <Route path="/feature/contract" element={<FeatureStub />} />
                  <Route path="/feature/email-verification" element={<FeatureStub />} />
                  <Route path="/feature/social-login" element={<FeatureStub />} />
                </Routes>
              </Suspense>
            </main>

            <MobileTabBar />
            <TimeTrackingFloatingPanel />
            <TimeTrackingModals />
          </div>
        </div>
      </UnreadMessagesProvider>
    </NotificationsProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RouteAnalytics />
        <Suspense fallback={<RouteFallback />}>
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
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
