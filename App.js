import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Platform } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { AuthProvider } from './src/context/AuthContext';
import { SubscriptionProvider } from './src/context/SubscriptionContext';
import { ToastProvider } from './src/context/ToastContext';
import { AdProvider } from './src/context/AdContext';
import { ParseLoadingProvider } from './src/context/ParseLoadingContext';
import { AlertProvider } from './src/components/CustomAlert';
import { PremiumUpgradeModalProvider } from './src/context/PremiumUpgradeModalContext';
import { colors } from './src/theme/colors';
import { initializeATC } from './src/utils/atsInit';
import mobileAds from './src/utils/ads';

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
import DebugScreen from './src/screens/DebugScreen';

const Stack = createNativeStackNavigator();

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return <DebugScreen error={this.state.error} errorInfo={this.state.errorInfo} />;
    }
    return this.props.children;
  }
}

export default function App() {
  useEffect(() => {
    // Run all initialization in background, don't block rendering
    const runInitialization = async () => {
      try {
        // Initialize iOS App Transport Security
        try {
          initializeATC();
        } catch (e) {
          console.warn('[App] ATC initialization failed:', e.message);
        }

        // Initialize ads on native platforms
        if (Platform.OS !== 'web') {
          try {
            if (mobileAds) {
              await mobileAds().initialize();
            }
          } catch (e) {
            console.warn('[App] Ads initialization failed:', e.message);
          }
        }

        // Note: Parsing is now triggered from AddPlaylistScreen on-demand
        // (previously was attempted at app startup with backgroundParsingService)
      } catch (error) {
        console.error('[App] Fatal error during initialization:', error);
      }
    };

    // Run initialization but don't block - use setTimeout to ensure render happens first
    const timeout = setTimeout(() => {
      runInitialization().catch(error => console.error('[App] Unhandled initialization error:', error));
    }, 100);

    return () => clearTimeout(timeout);

    // Enable scrolling on web platform
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      // Set height and overflow on html and body to enable scrolling
      const html = document.documentElement;
      const body = document.body;
      const root = document.getElementById('root');
      
      if (html) {
        html.style.width = '100%';
        html.style.height = '100%';
        html.style.margin = '0';
        html.style.padding = '0';
      }
      
      if (body) {
        body.style.width = '100%';
        body.style.height = '100%';
        body.style.margin = '0';
        body.style.padding = '0';
        body.style.overflow = 'auto';
      }
      
      if (root) {
        root.style.width = '100%';
        root.style.height = '100%';
        root.style.overflow = 'auto';
      }

      // Register service worker to fix streaming server issues
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .register('/service-worker.js')
          .then((registration) => {
            console.log('[App] Service Worker registered successfully:', registration);
          })
          .catch((error) => {
            console.warn('[App] Service Worker registration failed:', error);
          });
      }
    }

  }, []);
  
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
      <AuthProvider>
        <SubscriptionProvider>
          <PremiumUpgradeModalProvider>
            <AdProvider>
              <ToastProvider>
                <ParseLoadingProvider>
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
                  // Note: Orientation is handled in VideoPlayerScreen via useFocusEffect
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
                </ParseLoadingProvider>
          </ToastProvider>
          </AdProvider>
          </PremiumUpgradeModalProvider>
        </SubscriptionProvider>
      </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

