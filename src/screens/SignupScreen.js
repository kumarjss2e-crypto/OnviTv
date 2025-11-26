import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import GradientButton from '../components/GradientButton';
import GlassInput from '../components/GlassInput';
import { signUpWithEmail, signInWithGoogle, signInWithApple } from '../services/authService';
import { useToast } from '../context/ToastContext';
import SocialButton from '../components/SocialButton';

const SignupScreen = ({ navigation }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const { showError, showSuccess } = useToast();
  const safeAreaInsets = Platform.OS === 'web' ? { bottom: 0, top: 0, left: 0, right: 0 } : useSafeAreaInsets();
  const insets = safeAreaInsets;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSignup = async () => {
    console.log('[SignupScreen] Signup button pressed');
    
    if (!fullName || !email || !password || !confirmPassword) {
      console.log('[SignupScreen] Missing fields');
      showError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      console.log('[SignupScreen] Passwords do not match');
      showError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      console.log('[SignupScreen] Password too short');
      showError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    
    try {
      console.log('[SignupScreen] Calling signUpWithEmail...');
      const result = await signUpWithEmail(email, password, fullName);
      console.log('[SignupScreen] signUpWithEmail result:', result);
      
      if (result.success) {
        console.log('[SignupScreen] Signup successful');
        showSuccess('Account created successfully! You can now login.');
        // Navigate after a short delay to show the toast
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }, 2000);
      } else {
        console.log('[SignupScreen] Signup failed:', result.error);
        showError(result.error || 'Could not create account');
      }
    } catch (error) {
      console.error('[SignupScreen] Exception in handleSignup:', error);
      showError('Error during signup: ' + error.message);
    }
    
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    console.log('[SignupScreen] Google Sign-in button pressed');
    setGoogleLoading(true);
    
    try {
      console.log('[SignupScreen] Calling signInWithGoogle...');
      const result = await signInWithGoogle();
      console.log('[SignupScreen] signInWithGoogle result:', result);
      
      if (result.success) {
        console.log('[SignupScreen] Google sign-in successful, navigating to Main');
        // Navigate to main app
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      } else {
        console.log('[SignupScreen] Google sign-in failed:', result.error);
        if (result.error !== 'Sign in cancelled') {
          showError(result.error || 'Could not sign in with Google');
        }
      }
    } catch (error) {
      console.error('[SignupScreen] Exception in handleGoogleSignIn:', error);
      showError('Exception during Google sign-in: ' + error.message);
    }
    
    setGoogleLoading(false);
  };

  const handleAppleSignIn = async () => {
    console.log('[SignupScreen] Apple Sign-in button pressed');
    setAppleLoading(true);
    
    try {
      console.log('[SignupScreen] Calling signInWithApple...');
      const result = await signInWithApple();
      console.log('[SignupScreen] signInWithApple result:', result);
      
      if (result.success) {
        console.log('[SignupScreen] Apple sign-in successful, navigating to Main');
        // Navigate to main app
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      } else {
        console.log('[SignupScreen] Apple sign-in failed:', result.error);
        if (result.error !== 'Sign in cancelled') {
          showError(result.error || 'Could not sign in with Apple');
        }
      }
    } catch (error) {
      console.error('[SignupScreen] Exception in handleAppleSignIn:', error);
      showError('Exception during Apple sign-in: ' + error.message);
    }
    
    setAppleLoading(false);
  };

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.logoText}>Create Account</Text>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              <GlassInput
                placeholder="Full Name"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                style={styles.input}
              />

              <GlassInput
                placeholder="Email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />

              <GlassInput
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
              />

              <GlassInput
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                style={styles.input}
              />

              <GradientButton
                title="Create Account"
                onPress={handleSignup}
                loading={loading}
                style={styles.signupButton}
              />

              {/* Terms */}
              <View style={styles.termsContainer}>
                <Text style={styles.termsText}>
                  By creating an account, you agree to our{' '}
                  <Text style={styles.termsLink}>Terms</Text> and{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Login */}
            {Platform.OS === 'ios' ? (
              <SocialButton
                title="Continue with Apple"
                iconName="logo-apple"
                onPress={handleAppleSignIn}
                loading={appleLoading}
                style={styles.socialButton}
              />
            ) : (
              <SocialButton
                title="Continue with Google"
                iconName="logo-google"
                onPress={handleGoogleSignIn}
                loading={googleLoading}
                style={styles.socialButton}
              />
            )}

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.slate900,
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: 24,
    zIndex: 10,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: '300',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 32,
  },
  content: {
    width: '100%',
  },
  logoContainer: {
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  logoImage: {
    width: 90,
    height: 36,
    marginBottom: 20,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  formContainer: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 12,
  },
  signupButton: {
    marginTop: 8,
    marginBottom: 8,
  },
  termsContainer: {
    paddingHorizontal: 4,
    marginTop: 8,
  },
  termsText: {
    color: 'rgba(148, 163, 184, 0.6)',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  termsLink: {
    color: 'rgba(148, 163, 184, 0.9)',
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  dividerText: {
    color: 'rgba(148, 163, 184, 0.6)',
    fontSize: 11,
    fontWeight: '400',
    marginHorizontal: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  socialButton: {
    marginBottom: 20,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginText: {
    color: 'rgba(148, 163, 184, 0.8)',
    fontSize: 14,
    fontWeight: '400',
  },
  loginLink: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SignupScreen;

