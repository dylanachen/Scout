import React, { useEffect, useState, useCallback, useRef } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, Animated, DevSettings, BackHandler, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SystemUI from 'expo-system-ui';
import { authApi, type MeUser } from './api/client';
import { AuthProvider } from './context/AuthContext';
import { AppThemeProvider, useAppTheme } from './context/ThemeContext';
import { ToastProvider, showGlobalToast } from './context/ToastContext';
import SignOutHeaderButton from './components/SignOutHeaderButton';
import ErrorBoundary from './components/ErrorBoundary';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import OnboardingCarouselScreen from './screens/OnboardingCarouselScreen';
import AccountSettingsScreen from './screens/AccountSettingsScreen';
import DashboardScreen from './screens/DashboardScreen';
import ProjectsScreen from './screens/ProjectsScreen';
import ChatScreen from './screens/ChatScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import MatchResultsScreen from './screens/MatchResultsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import SettingsScreen from './screens/SettingsScreen';
import TimeTrackingScreen from './screens/TimeTrackingScreen';
import InvoiceListScreen from './screens/InvoiceListScreen';
import PortfolioScreen from './screens/PortfolioScreen';
import RateClientScreen from './screens/RateClientScreen';
import FeatureStubScreen from './screens/FeatureStubScreen';
import HelpFaqScreen from './screens/HelpFaqScreen';
import './i18n';

const HAS_VISITED_KEY = 'scout_has_visited';
const NEEDS_ONBOARDING_KEY = 'scout_needs_onboarding';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();
const DOUBLE_BACK_TIMEOUT_MS = 1800;

const linking = {
  prefixes: ['scout://'],
  config: {
    screens: {
      Tabs: {
        screens: {
          Dashboard: 'dashboard',
          Projects: 'projects',
          Matches: 'matches',
          Notifications: 'notifications',
          Settings: 'settings',
        },
      },
      ProjectChat: 'chat/:projectId',
      AccountSettings: 'account',
      ContractDetails: 'contract/:projectId',
    },
  },
};

const headerSignOut = () => <SignOutHeaderButton />;

/* ── View-based tab icons ─────────────────────────────── */

function TabIconGrid({ color }: { color: string }) {
  const s = 9;
  return (
    <View style={{ width: 22, height: 22, flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ width: s, height: s, borderRadius: 2.5, backgroundColor: color }} />
      ))}
    </View>
  );
}

function TabIconList({ color }: { color: string }) {
  return (
    <View style={{ width: 22, height: 22, justifyContent: 'center', gap: 4 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: color }} />
          <View style={{ flex: 1, height: 2, borderRadius: 1, backgroundColor: color }} />
        </View>
      ))}
    </View>
  );
}

function TabIconMatch({ color }: { color: string }) {
  return (
    <View style={{ width: 26, height: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: color, marginRight: -4 }} />
      <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: color }} />
    </View>
  );
}

function TabIconBell({ color }: { color: string }) {
  return (
    <View style={{ width: 22, height: 24, alignItems: 'center', justifyContent: 'flex-end' }}>
      <View style={{ width: 4, height: 3, borderRadius: 2, backgroundColor: color, marginBottom: 1 }} />
      <View style={{ width: 16, height: 13, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: color }} />
      <View style={{ width: 20, height: 3, borderRadius: 1.5, backgroundColor: color }} />
      <View style={{ width: 6, height: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: color, marginTop: 1 }} />
    </View>
  );
}

function TabIconGear({ color }: { color: string }) {
  return (
    <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: color }} />
      <View style={{ position: 'absolute', width: 22, height: 2.5, borderRadius: 1.5, backgroundColor: color }} />
      <View style={{ position: 'absolute', width: 2.5, height: 22, borderRadius: 1.5, backgroundColor: color }} />
      <View style={{ position: 'absolute', width: 17, height: 2.5, borderRadius: 1.5, backgroundColor: color, transform: [{ rotate: '45deg' }] }} />
      <View style={{ position: 'absolute', width: 2.5, height: 17, borderRadius: 1.5, backgroundColor: color, transform: [{ rotate: '45deg' }] }} />
    </View>
  );
}

/* ── Main tab navigator ───────────────────────────────── */

function MainTabs({ initialTab }: { initialTab?: string }) {
  const [notifBadge, setNotifBadge] = useState<number | undefined>(3);
  const { colors } = useAppTheme();

  return (
    <Tab.Navigator
      initialRouteName={initialTab || 'Dashboard'}
      screenOptions={{
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600', fontSize: 15 },
        headerRight: headerSignOut,
        tabBarAccessibilityLabel: 'Bottom tabs',
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => <TabIconGrid color={color} />,
          headerTitle: 'Scout',
        }}
      />
      <Tab.Screen
        name="Projects"
        component={ProjectsScreen}
        options={{
          tabBarLabel: 'Projects',
          tabBarIcon: ({ color }) => <TabIconList color={color} />,
          headerTitle: 'Projects',
        }}
      />
      <Tab.Screen
        name="Matches"
        component={MatchResultsScreen}
        options={{
          tabBarLabel: 'Matches',
          tabBarIcon: ({ color }) => <TabIconMatch color={color} />,
          headerTitle: 'Matches',
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarLabel: 'Notifications',
          tabBarIcon: ({ color }) => <TabIconBell color={color} />,
          headerTitle: 'Notifications',
          tabBarBadge: notifBadge,
          tabBarBadgeStyle: { backgroundColor: '#dc2626', fontSize: 10, minWidth: 18, height: 18, lineHeight: 18 },
        }}
        listeners={{ tabPress: () => setNotifBadge(undefined) }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => <TabIconGear color={color} />,
          headerTitle: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
}

/* ── Splash ────────────────────────────────────────────── */

function SplashScreen({ onComplete }: { onComplete: (target: 'carousel' | 'login') => void }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(async () => {
      const hasVisited = await AsyncStorage.getItem(HAS_VISITED_KEY);
      const hasToken = await AsyncStorage.getItem('scout_token');
      if (hasToken || hasVisited) {
        onComplete('login');
      } else {
        await AsyncStorage.setItem(HAS_VISITED_KEY, '1');
        onComplete('carousel');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, onComplete]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1d6ecd' }}>
      <Animated.View style={{ alignItems: 'center', opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
        <View style={{ width: 72, height: 72, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800' }}>S</Text>
        </View>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: -0.4 }}>Scout</Text>
      </Animated.View>
    </View>
  );
}

/* ── Root App ──────────────────────────────────────────── */

export default function App() {
  const [authState, setAuthState] = useState<'splash' | 'carousel' | 'loading' | 'authed' | 'unauthed'>('splash');
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [user, setUser] = useState<MeUser | null>(null);
  const [initialTab, setInitialTab] = useState('Dashboard');
  const lastBackPress = useRef(0);
  const routeRef = useRef<string | undefined>(undefined);

  const signOut = useCallback(async () => {
    await AsyncStorage.multiRemove(['scout_token', 'scout_user_id', 'scout_demo_session', NEEDS_ONBOARDING_KEY]);
    setUser(null);
    setNeedsOnboarding(false);
    setAuthState('unauthed');
  }, []);

  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;

  useEffect(() => {
    if (!__DEV__) return;
    DevSettings.addMenuItem('Scout: Sign out', () => {
      void signOutRef.current();
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    SystemUI.setBackgroundColorAsync('#000000').catch(() => undefined);
  }, []);

  const refreshAuth = useCallback(async () => {
    const token = await AsyncStorage.getItem('scout_token');
    if (!token) {
      setAuthState('unauthed');
      return;
    }
    const biometricEnabled = (await AsyncStorage.getItem('scout_biometric_enabled')) === '1';
    if (biometricEnabled) {
      const canUse = await LocalAuthentication.hasHardwareAsync();
      if (canUse) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Unlock Scout',
          fallbackLabel: 'Use passcode',
        });
        if (!result.success) {
          setAuthState('unauthed');
          showGlobalToast('Biometric unlock was cancelled');
          return;
        }
      }
    }
    try {
      const res = await authApi.me();
      await AsyncStorage.setItem('scout_user_id', String(res.data.id));
      setUser(res.data);
      const onboard = await AsyncStorage.getItem(NEEDS_ONBOARDING_KEY);
      setNeedsOnboarding(onboard === '1');
      setAuthState('authed');
    } catch {
      await AsyncStorage.multiRemove(['scout_token', 'scout_demo_session']);
      setAuthState('unauthed');
    }
  }, []);

  const handleSplashComplete = useCallback(
    (target: 'carousel' | 'login') => {
      if (target === 'carousel') {
        setAuthState('carousel');
      } else {
        setAuthState('loading');
        refreshAuth();
      }
    },
    [refreshAuth],
  );

  const handleSignedUp = useCallback(async () => {
    await AsyncStorage.setItem(NEEDS_ONBOARDING_KEY, '1');
    try {
      const res = await authApi.me();
      setUser(res.data);
    } catch { /* user will load later */ }
    setNeedsOnboarding(true);
    setAuthState('authed');
  }, []);

  const handleLoggedIn = useCallback(async () => {
    try {
      const res = await authApi.me();
      setUser(res.data);
    } catch { /* user will load later */ }
    const onboard = await AsyncStorage.getItem(NEEDS_ONBOARDING_KEY);
    setNeedsOnboarding(onboard === '1');
    setAuthState('authed');
  }, []);

  const handleOnboardingComplete = useCallback(async (role?: string) => {
    if (role === 'client') setInitialTab('Matches');
    // Switch out of onboarding immediately, then clean up persisted flag.
    setNeedsOnboarding(false);
    await AsyncStorage.removeItem(NEEDS_ONBOARDING_KEY);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const currentRoute = routeRef.current;
      if (currentRoute === 'ProjectChat' || currentRoute === 'ProfileOnboarding') {
        Alert.alert('Leave this screen?', 'Unsaved progress may be lost.', [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: () => {
              if (navigationRef.isReady() && navigationRef.canGoBack()) {
                navigationRef.goBack();
              }
            },
          },
        ]);
        return true;
      }
      if (currentRoute === 'Dashboard') {
        const now = Date.now();
        if (now - lastBackPress.current < DOUBLE_BACK_TIMEOUT_MS) {
          BackHandler.exitApp();
          return true;
        }
        lastBackPress.current = now;
        showGlobalToast('Press back again to exit');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  if (authState === 'splash') {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (authState === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f1623' }}>
        <View style={{ width: 48, height: 48, backgroundColor: '#1d6ecd', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>S</Text>
        </View>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <AppThemeProvider>
        <ToastProvider>
          <SafeAreaProvider>
            <AuthProvider signOut={signOut} user={user}>
              <NavigationContainer
                ref={navigationRef}
                linking={linking}
                onReady={() => {
                  routeRef.current = navigationRef.getCurrentRoute()?.name;
                }}
                onStateChange={() => {
                  routeRef.current = navigationRef.getCurrentRoute()?.name;
                }}
              >
                <StatusBar style="auto" />
                <Stack.Navigator
                  key={authState === 'authed' ? (needsOnboarding ? 'onboard' : 'in') : 'out'}
                  screenOptions={{ headerShown: false }}
                  initialRouteName={
                    authState === 'authed'
                      ? needsOnboarding ? 'ProfileOnboarding' : 'Tabs'
                      : authState === 'carousel' ? 'OnboardingCarousel' : 'Login'
                  }
                >
                  {authState === 'authed' ? (
                    <>
                      <Stack.Screen name="Tabs">
                        {() => <MainTabs initialTab={initialTab} />}
                      </Stack.Screen>
                      <Stack.Screen name="ProfileOnboarding">
                        {(props) => (
                          <OnboardingScreen
                            navigation={props.navigation}
                            onComplete={handleOnboardingComplete}
                          />
                        )}
                      </Stack.Screen>
                      <Stack.Screen
                        name="AccountSettings"
                        options={{
                          headerShown: true,
                          title: 'Account Settings',
                          headerStyle: { backgroundColor: '#fff' },
                          headerTintColor: '#0f1623',
                          headerShadowVisible: false,
                        }}
                      >
                        {(props) => <AccountSettingsScreen navigation={props.navigation} onSignedOut={signOut} />}
                      </Stack.Screen>
                      <Stack.Screen name="ProjectChat" options={{ headerShown: false }}>
                        {(props) => <ChatScreen navigation={props.navigation} route={props.route} />}
                      </Stack.Screen>
                      <Stack.Screen
                        name="TimeTracking"
                        component={TimeTrackingScreen}
                        options={{
                          headerShown: true,
                          title: 'Time Tracking',
                          headerStyle: { backgroundColor: '#fff' },
                          headerTintColor: '#0f1623',
                          headerShadowVisible: false,
                        }}
                      />
                      <Stack.Screen
                        name="InvoiceList"
                        component={InvoiceListScreen}
                        options={{
                          headerShown: true,
                          title: 'Invoices',
                          headerStyle: { backgroundColor: '#fff' },
                          headerTintColor: '#0f1623',
                          headerShadowVisible: false,
                        }}
                      />
                      <Stack.Screen
                        name="Portfolio"
                        component={PortfolioScreen}
                        options={{
                          headerShown: true,
                          title: 'Portfolio',
                          headerStyle: { backgroundColor: '#fff' },
                          headerTintColor: '#0f1623',
                          headerShadowVisible: false,
                        }}
                      />
                      <Stack.Screen
                        name="RateClient"
                        component={RateClientScreen}
                        options={{
                          headerShown: true,
                          title: 'Rate Client',
                          headerStyle: { backgroundColor: '#fff' },
                          headerTintColor: '#0f1623',
                          headerShadowVisible: false,
                        }}
                      />
                      <Stack.Screen
                        name="PublicProfile"
                        component={FeatureStubScreen}
                        options={{ headerShown: true, title: 'Public Profile' }}
                        initialParams={{
                          title: 'Public Profile',
                          description: 'Freelancer/client public profile with portfolio and bio.',
                          profile: { name: 'Jordan Kim', role: 'Marketing Director', avatarUrl: null },
                        }}
                      />
                      <Stack.Screen name="Reviews" component={FeatureStubScreen} options={{ headerShown: true, title: 'Reviews' }} initialParams={{ title: 'Reviews', description: 'Aggregated rating and review list with mock data.' }} />
                      <Stack.Screen name="ProposalForm" component={FeatureStubScreen} options={{ headerShown: true, title: 'Send Proposal' }} initialParams={{ title: 'Proposal Form', description: 'Proposal sheet scaffold. TODO: hook up endpoint.' }} />
                      <Stack.Screen name="ContractDetails" component={FeatureStubScreen} options={{ headerShown: true, title: 'Contract' }} initialParams={{ title: 'Contract & Agreement', description: 'Scope and terms accept flow scaffold.' }} />
                      <Stack.Screen name="Milestones" component={FeatureStubScreen} options={{ headerShown: true, title: 'Milestones' }} initialParams={{ title: 'Milestones', description: 'Milestones list with disabled fund/release controls.' }} />
                      <Stack.Screen name="GlobalSearch" component={FeatureStubScreen} options={{ headerShown: true, title: 'Search' }} initialParams={{ title: 'Global Search', description: 'Projects/Freelancers/Skills tab search UI.' }} />
                      <Stack.Screen name="Inbox" component={FeatureStubScreen} options={{ headerShown: true, title: 'Inbox' }} initialParams={{ title: 'Unified Inbox', description: 'Conversation list that routes into chat.' }} />
                      <Stack.Screen name="NotificationPreferences" component={FeatureStubScreen} options={{ headerShown: true, title: 'Notification Preferences' }} initialParams={{ title: 'Notification Preferences', description: 'Toggle preferences stored in AsyncStorage.' }} />
                      <Stack.Screen name="PaymentMethods" component={FeatureStubScreen} options={{ headerShown: true, title: 'Payments & Payouts' }} initialParams={{ title: 'Payment Methods', description: 'Payment/payout screen scaffold (Stripe integration later).' }} />
                      <Stack.Screen name="EarningsDashboard" component={FeatureStubScreen} options={{ headerShown: true, title: 'Earnings' }} initialParams={{ title: 'Earnings Dashboard', description: 'Chart and CSV export UI scaffold.' }} />
                      <Stack.Screen name="Referrals" component={FeatureStubScreen} options={{ headerShown: true, title: 'Referrals' }} initialParams={{ title: 'Invite a Friend', description: 'Share referral code UI scaffold.' }} />
                      <Stack.Screen name="CalendarScheduling" component={FeatureStubScreen} options={{ headerShown: true, title: 'Calendar' }} initialParams={{ title: 'Calendar & Scheduling', description: 'Local events and scheduling UI scaffold.' }} />
                      <Stack.Screen name="DisputeReport" component={FeatureStubScreen} options={{ headerShown: true, title: 'Dispute / Report' }} initialParams={{ title: 'Dispute / Report User', description: 'Form submission stub.' }} />
                      <Stack.Screen name="EmailVerification" component={FeatureStubScreen} options={{ headerShown: true, title: 'Email Verification' }} initialParams={{ title: 'Check your email', description: 'Verification prompt and resend button.' }} />
                      <Stack.Screen name="TwoFactorEntry" component={FeatureStubScreen} options={{ headerShown: true, title: '2FA' }} initialParams={{ title: '2FA Code Entry', description: 'Six-digit verification input scaffold.' }} />
                      <Stack.Screen name="SocialLogin" component={FeatureStubScreen} options={{ headerShown: true, title: 'Social Login' }} initialParams={{ title: 'Social Login Setup', description: 'Google sign-in setup placeholder and TODO.' }} />
                      <Stack.Screen name="HelpFaq" component={HelpFaqScreen} options={{ headerShown: true, title: 'Help & FAQ' }} />
                    </>
                  ) : (
                    <>
                      {authState === 'carousel' ? (
                        <Stack.Screen name="OnboardingCarousel" component={OnboardingCarouselScreen} />
                      ) : null}
                      <Stack.Screen name="Login">
                        {() => <LoginScreen onAuthed={handleLoggedIn} />}
                      </Stack.Screen>
                      <Stack.Screen name="SignUp">
                        {() => <SignUpScreen onAuthed={handleSignedUp} />}
                      </Stack.Screen>
                      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                    </>
                  )}
                </Stack.Navigator>
              </NavigationContainer>
            </AuthProvider>
          </SafeAreaProvider>
        </ToastProvider>
      </AppThemeProvider>
    </ErrorBoundary>
  );
}
