import React, { useEffect, useState, useCallback, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ActivityIndicator, DevSettings } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from './api/client';
import { AuthProvider } from './context/AuthContext';
import SignOutHeaderButton from './components/SignOutHeaderButton';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import ChatScreen from './screens/ChatScreen';
import OnboardingScreen from './screens/OnboardingScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const headerSignOut = () => <SignOutHeaderButton />;

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#e2e6ed', borderTopWidth: 1 },
        tabBarActiveTintColor: '#1d6ecd',
        tabBarInactiveTintColor: '#9aa0ae',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        headerStyle: { backgroundColor: '#0f1623' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600', fontSize: 15 },
        headerRight: headerSignOut,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <TabIcon name="grid" color={color} />,
          headerTitle: 'FreelanceOS',
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          title: 'Project Chat',
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color }) => <TabIcon name="chat" color={color} />,
        }}
      />
      <Tab.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{
          title: 'Onboarding',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon name="user" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [authState, setAuthState] = useState<'loading' | 'authed' | 'unauthed'>('loading');

  const signOut = useCallback(async () => {
    await AsyncStorage.multiRemove(['fos_token', 'fos_user_id']);
    setAuthState('unauthed');
  }, []);

  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;

  useEffect(() => {
    if (!__DEV__) return;
    DevSettings.addMenuItem('FreelanceOS: Sign out', () => {
      void signOutRef.current();
    });
  }, []);

  const refreshAuth = useCallback(async () => {
    const token = await AsyncStorage.getItem('fos_token');
    if (!token) {
      setAuthState('unauthed');
      return;
    }
    try {
      const res = await authApi.me();
      await AsyncStorage.setItem('fos_user_id', String(res.data.id));
      setAuthState('authed');
    } catch {
      await AsyncStorage.removeItem('fos_token');
      setAuthState('unauthed');
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  if (authState === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f1623' }}>
        <View
          style={{
            width: 48,
            height: 48,
            backgroundColor: '#1d6ecd',
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>FO</Text>
        </View>
        <ActivityIndicator color="#1d6ecd" style={{ marginTop: 8 }} />
      </View>
    );
  }

  return (
    <AuthProvider signOut={signOut}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {authState === 'authed' ? (
            <Stack.Screen name="Main" component={MainTabs} />
          ) : (
            <Stack.Screen name="Login">
              {() => <LoginScreen onAuthed={() => setAuthState('authed')} />}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}

function TabIcon({ name, color }: { name: string; color: string }) {
  const icons: Record<string, string> = { grid: '⊞', chat: '◉', user: '⊙' };
  return <Text style={{ fontSize: 18, color }}>{icons[name] ?? '●'}</Text>;
}
