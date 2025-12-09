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
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import GradientButton from '../components/GradientButton';
import GlassInput from '../components/GlassInput';
import { sendPasswordResetEmail } from '../services/authService';
import { useToast } from '../context/ToastContext';

const PasswordResetScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
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

  const validateEmail = (emailToValidate) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailToValidate);
  };

  const handleSendReset = async () => {
    console.log('[PasswordResetScreen] Send reset button pressed');

    if (!email.trim()) {
      showError('Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      showError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    console.log('[PasswordResetScreen] Sending password reset email to:', email);

    const result = await sendPasswordResetEmail(email);

    if (result.success) {
      console.log('[PasswordResetScreen] Password reset email sent successfully');
      showSuccess('Password reset email sent! Check your inbox for further instructions.');
      setResetSent(true);
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setEmail('');
        setResetSent(false);
      }, 2000);
    } else {
      console.log('[PasswordResetScreen] Failed to send reset email:', result.error);
      showError(result.error || 'Failed to send reset email. Please try again.');
    }

    setLoading(false);
  };

  const handleBackToLogin = () => {
    console.log('[PasswordResetScreen] Back to login pressed');
    navigation.goBack();
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
            {/* Header */}
            <View style={styles.headerContainer}>
              <TouchableOpacity
                onPress={handleBackToLogin}
                style={styles.backButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Logo/Title */}
            <View style={styles.logoContainer}>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter your email address and we'll send you a link to reset your password.
              </Text>
            </View>

            {/* Form Container */}
            {!resetSent ? (
              <View style={styles.formContainer}>
                <GlassInput
                  placeholder="Email address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                  style={styles.input}
                />

                <GradientButton
                  title={loading ? 'Sending...' : 'Send Reset Email'}
                  onPress={handleSendReset}
                  loading={loading}
                  disabled={!email.trim() || loading}
                  style={styles.submitButton}
                />

                <TouchableOpacity
                  onPress={handleBackToLogin}
                  disabled={loading}
                >
                  <Text style={styles.backLink}>Back to Login</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.successContainer}>
                <LinearGradient
                  colors={[colors.primary.purple + '20', colors.primary.blue + '20']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.successCard}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={64}
                    color={colors.primary.purple}
                    style={styles.successIcon}
                  />
                  <Text style={styles.successTitle}>Email Sent!</Text>
                  <Text style={styles.successText}>
                    Check your email for password reset instructions. If you don't see it, check your spam folder.
                  </Text>
                </LinearGradient>

                <TouchableOpacity
                  onPress={handleBackToLogin}
                  style={styles.doneButton}
                >
                  <Text style={styles.doneButtonText}>Back to Login</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Help Text */}
            <View style={styles.helpContainer}>
              <Text style={styles.helpText}>
                Didn't receive the email? Check your spam folder or{' '}
                <Text style={styles.helpLink}>contact support</Text>
              </Text>
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
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  logoContainer: {
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.muted,
    lineHeight: 20,
  },
  formContainer: {
    marginBottom: 32,
  },
  input: {
    marginBottom: 20,
  },
  submitButton: {
    marginBottom: 16,
  },
  backLink: {
    fontSize: 14,
    color: colors.primary.purple,
    fontWeight: '600',
    textAlign: 'center',
    padding: 12,
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  successCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.primary.purple + '40',
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 12,
  },
  successText: {
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  doneButton: {
    backgroundColor: colors.primary.purple,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  helpContainer: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.slate800,
  },
  helpText: {
    fontSize: 12,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  helpLink: {
    color: colors.primary.purple,
    fontWeight: '600',
  },
});

export default PasswordResetScreen;
