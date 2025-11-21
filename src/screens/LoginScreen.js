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
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import GradientButton from '../components/GradientButton';
import GlassInput from '../components/GlassInput';
import { signInWithEmail, signInWithGoogle, signInWithApple } from '../services/authService';
import { useToast } from '../context/ToastContext';
import SocialButton from '../components/SocialButton';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const { showError } = useToast();

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Animations disabled to fix crash
  // useEffect(() => {
  //   Animated.parallel([
  //     Animated.timing(fadeAnim, {
  //       toValue: 1,
  //       duration: 800,
  //       useNativeDriver: true,
  //     }),
  //     Animated.spring(slideAnim, {
  //       toValue: 0,
  //       tension: 20,
  //       friction: 7,
  //       useNativeDriver: true,
  //     }),
  //   ]).start();
  // }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      showError('Please fill in all fields');
      return;
    }

    setLoading(true);
    
    const result = await signInWithEmail(email, password);
    
    if (result.success) {
      // Navigate to main app
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } else {
      showError(result.error || 'Invalid email or password');
    }
    
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    
    const result = await signInWithGoogle();
    
    if (result.success) {
      // Navigate to main app
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } else {
      if (result.error !== 'Sign in cancelled') {
        showError(result.error || 'Could not sign in with Google');
      }
    }
    
    setGoogleLoading(false);
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    
    const result = await signInWithApple();
    
    if (result.success) {
      // Navigate to main app
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } else {
      if (result.error !== 'Sign in cancelled') {
        showError(result.error || 'Could not sign in with Apple');
      }
    }
    
    setAppleLoading(false);
  };

  return (
    <View style={styles.container}>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
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
              <Text style={styles.logoText}>Sign In</Text>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
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

              <GradientButton
                title="Sign In"
                onPress={handleLogin}
                loading={loading}
                style={styles.loginButton}
              />

              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>
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

            {/* Sign Up Link */}
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>New to OnviTV? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={styles.signupLink}>Sign up now</Text>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  content: {
    width: '100%',
  },
  logoContainer: {
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  logoImage: {
    width: 90,
    height: 36,
    marginBottom: 24,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  formContainer: {
    marginBottom: 24,
  },
  input: {
    marginBottom: 12,
  },
  loginButton: {
    marginTop: 8,
    marginBottom: 8,
  },
  forgotPassword: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  forgotPasswordText: {
    color: 'rgba(148, 163, 184, 0.8)',
    fontSize: 13,
    fontWeight: '400',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
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
    marginBottom: 24,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  signupText: {
    color: 'rgba(148, 163, 184, 0.8)',
    fontSize: 14,
    fontWeight: '400',
  },
  signupLink: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LoginScreen;
