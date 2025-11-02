import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/context/AuthContext';
import { ToastProvider } from './src/context/ToastContext';
import { AlertProvider } from './src/components/CustomAlert';
import { colors } from './src/theme/colors';

// Screens
import SplashScreen from './src/screens/SplashScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import MainTabs from './src/navigation/MainTabs';
import PlaylistManagementScreen from './src/screens/PlaylistManagementScreen';
import AddPlaylistScreen from './src/screens/AddPlaylistScreen';
import EditPlaylistScreen from './src/screens/EditPlaylistScreen';
import EPGScreen from './src/screens/EPGScreen';
import VideoPlayerScreen from './src/screens/VideoPlayerScreen';
import MovieDetailScreen from './src/screens/MovieDetailScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <NavigationContainer>
            <StatusBar style="light" />
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
                animation: 'fade',
              }}
            >
              <Stack.Screen name="Splash" component={SplashScreen} />
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Signup" component={SignupScreen} />
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen name="PlaylistManagement" component={PlaylistManagementScreen} />
              <Stack.Screen name="AddPlaylist" component={AddPlaylistScreen} />
              <Stack.Screen name="EditPlaylist" component={EditPlaylistScreen} />
              <Stack.Screen 
                name="EPG" 
                component={EPGScreen} 
                options={{
                  headerShown: true,
                  title: 'Program Guide',
                  headerStyle: { backgroundColor: colors.neutral.slate900 },
                  headerTintColor: colors.text.primary,
                  headerTitleStyle: { color: colors.text.primary },
                }}
              />
              <Stack.Screen 
                name="VideoPlayer" 
                component={VideoPlayerScreen}
                options={{
                  headerShown: false,
                  orientation: 'landscape',
                }}
              />
              <Stack.Screen 
                name="MovieDetail" 
                component={MovieDetailScreen}
                options={{
                  headerShown: false,
                }}
              />
            </Stack.Navigator>
          </NavigationContainer>
          <AlertProvider />
        </GestureHandlerRootView>
      </ToastProvider>
    </AuthProvider>
  );
}

