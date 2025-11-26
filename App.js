import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { SubscriptionProvider } from './src/context/SubscriptionContext';
import { ToastProvider } from './src/context/ToastContext';
import { AlertProvider } from './src/components/CustomAlert';
import { colors } from './src/theme/colors';
import mobileAds from 'react-native-google-mobile-ads';

// Custom dark theme to prevent white flash
const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary.purple,
    background: colors.neutral.slate900,
    card: colors.neutral.slate900,
    text: colors.text.primary,
    border: colors.neutral.slate800,
    notification: colors.primary.purple,
  },
};

// Screens
import SplashScreen from './src/screens/SplashScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import PasswordResetScreen from './src/screens/PasswordResetScreen';
import MainTabs from './src/navigation/MainTabs';
import PremiumUpgradeScreen from './src/screens/PremiumUpgradeScreen';
import RewardAdScreen from './src/screens/RewardAdScreen';
import PlaylistManagementScreen from './src/screens/PlaylistManagementScreen';
import AddPlaylistScreen from './src/screens/AddPlaylistScreen';
import EditPlaylistScreen from './src/screens/EditPlaylistScreen';
import EPGScreen from './src/screens/EPGScreen';
import EPGImportScreen from './src/screens/EPGImportScreen';
import VideoPlayerScreen from './src/screens/VideoPlayerScreen';
import MovieDetailScreen from './src/screens/MovieDetailScreen';
import SeriesDetailScreen from './src/screens/SeriesDetailScreen';
import SearchScreen from './src/screens/SearchScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import DownloadsScreen from './src/screens/DownloadsScreen';
import WatchHistoryScreen from './src/screens/WatchHistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ParentalControlsScreen from './src/screens/ParentalControlsScreen';
import PINEntryScreen from './src/screens/PINEntryScreen';
import PINSetupScreen from './src/screens/PINSetupScreen';
import HelpSupportScreen from './src/screens/HelpSupportScreen';
import AboutScreen from './src/screens/AboutScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    try {
      mobileAds().initialize();
    } catch (e) {
      // ignore initialization errors for now
    }
  }, []);
  
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <ToastProvider>
          <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.neutral.slate900 }}>
            <NavigationContainer 
              theme={CustomDarkTheme}
              fallback={<View style={{ flex: 1, backgroundColor: colors.neutral.slate900 }} />}
            >
              <StatusBar style="light" />
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
                animation: 'fade',
                contentStyle: { backgroundColor: colors.neutral.slate900 },
              }}
            >
              <Stack.Screen name="Splash" component={SplashScreen} />
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Signup" component={SignupScreen} />
              <Stack.Screen 
                name="PasswordReset" 
                component={PasswordResetScreen}
                options={{
                  headerShown: false,
                  animation: 'slide_from_bottom',
                }}
              />
              <Stack.Screen 
                name="Main" 
                component={MainTabs}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen 
                name="PremiumUpgrade" 
                component={PremiumUpgradeScreen}
                options={{
                  headerShown: false,
                  animationEnabled: true,
                }}
              />
              <Stack.Screen 
                name="RewardAd" 
                component={RewardAdScreen}
                options={{
                  headerShown: false,
                }}
              />
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
                name="EPGImport" 
                component={EPGImportScreen}
                options={{
                  headerShown: false,
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
              <Stack.Screen 
                name="SeriesDetail" 
                component={SeriesDetailScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen 
                name="Search" 
                component={SearchScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen 
                name="Favorites" 
                component={FavoritesScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen 
                name="Downloads" 
                component={DownloadsScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen 
                name="WatchHistory" 
                component={WatchHistoryScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen 
                name="Settings" 
                component={SettingsScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen 
                name="Profile" 
                component={ProfileScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen 
                name="ParentalControls" 
                component={ParentalControlsScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen 
                name="PINEntry" 
                component={PINEntryScreen}
                options={{
                  headerShown: false,
                  presentation: 'modal',
                }}
              />
              <Stack.Screen 
                name="PINSetup" 
                component={PINSetupScreen}
                options={{
                  headerShown: false,
                  presentation: 'modal',
                }}
              />
              <Stack.Screen 
                name="HelpSupport" 
                component={HelpSupportScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen 
                name="About" 
                component={AboutScreen}
                options={{
                  headerShown: false,
                }}
              />
            </Stack.Navigator>
          </NavigationContainer>
          <AlertProvider />
        </GestureHandlerRootView>
      </ToastProvider>
    </SubscriptionProvider>
  </AuthProvider>
  );
}

