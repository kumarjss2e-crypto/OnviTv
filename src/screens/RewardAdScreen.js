import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import GradientButton from '../components/GradientButton';

const { width, height } = Dimensions.get('window');

const RewardAdScreen = ({ onComplete, onSkip, adDuration = 30 }) => {
  const [timeLeft, setTimeLeft] = useState(adDuration);
  const [adLoading, setAdLoading] = useState(true);
  const [adFailed, setAdFailed] = useState(false);

  useEffect(() => {
    // Simulate ad loading
    const loadTimer = setTimeout(() => {
      setAdLoading(false);
    }, 1500);

    return () => clearTimeout(loadTimer);
  }, []);

  useEffect(() => {
    if (timeLeft <= 0 && !adLoading) {
      onComplete?.();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, adLoading, onComplete]);

  if (adFailed) {
    return (
      <LinearGradient
        colors={[colors.neutral.slate900, colors.primary.purple900]}
        style={styles.container}
      >
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle"
            size={64}
            color={colors.accent.red}
            style={styles.errorIcon}
          />
          <Text style={styles.errorTitle}>Ad Failed to Load</Text>
          <Text style={styles.errorMessage}>
            Please check your internet connection and try again
          </Text>

          <GradientButton
            title="Try Again"
            onPress={() => {
              setAdFailed(false);
              setAdLoading(true);
            }}
            style={styles.button}
          />

          <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[colors.neutral.slate900, colors.primary.purple900]}
      style={styles.container}
    >
      {/* Ad Content */}
      <View style={styles.adContainer}>
        {adLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.purple} />
            <Text style={styles.loadingText}>Loading reward ad...</Text>
          </View>
        ) : (
          <>
            {/* Mock Ad Space */}
            <View style={styles.adSpace}>
              <View style={styles.mockAdContent}>
                <Ionicons
                  name="play-circle"
                  size={80}
                  color={colors.primary.purple}
                />
                <Text style={styles.mockAdText}>Premium Video Ad</Text>
                <Text style={styles.mockAdDescription}>
                  This would be your advertisement
                </Text>
              </View>
            </View>

            {/* Timer */}
            <View style={styles.timerContainer}>
              <View style={styles.timerCircle}>
                <Text style={styles.timerText}>{timeLeft}s</Text>
              </View>
              <Text style={styles.timerLabel}>
                {timeLeft > 0
                  ? 'Video will play after ad'
                  : 'Ad completed!'}
              </Text>
            </View>

            {/* Close Button */}
            {timeLeft === 0 && (
              <View style={styles.buttonContainer}>
                <GradientButton
                  title="Watch Video Now"
                  onPress={onComplete}
                />
              </View>
            )}

            {/* Skip Button (only after 5 seconds) */}
            {timeLeft <= (adDuration - 5) && timeLeft > 0 && (
              <TouchableOpacity
                style={styles.skipButtonSmall}
                onPress={onSkip}
              >
                <Text style={styles.skipButtonText}>Skip in {timeLeft}s</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Why Watch Ads?</Text>
        <Text style={styles.infoText}>
          Watch this short ad to unlock unlimited video streaming for the next
          hour.
        </Text>
      </View>

      {/* Premium CTA */}
      <View style={styles.ctaSection}>
        <Text style={styles.ctaText}>
          Tired of ads? Remove them by upgrading to Premium
        </Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  adContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: colors.text.secondary,
  },
  adSpace: {
    width: width * 0.9,
    height: height * 0.4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.slate700,
    marginBottom: 24,
  },
  mockAdContent: {
    alignItems: 'center',
    gap: 12,
  },
  mockAdText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  mockAdDescription: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  timerContainer: {
    alignItems: 'center',
    gap: 12,
  },
  timerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text.primary,
  },
  timerLabel: {
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 24,
  },
  skipButtonSmall: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral.slate700,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
  infoSection: {
    width: '100%',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  ctaSection: {
    width: '100%',
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 12,
    color: colors.text.muted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    width: '100%',
    marginBottom: 12,
  },
  skipButton: {
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral.slate700,
    width: '100%',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
});

export default RewardAdScreen;
