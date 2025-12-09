import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

/**
 * Modal that shows before playing content for free tier users
 * Shows a rewarded ad option or allows skipping
 */
const WatchAdModal = ({ visible, onClose, onAdWatched, onSkip, contentTitle, isLoadingAd, onCountdownComplete }) => {
  const [countdown, setCountdown] = useState(0);
  const [adShown, setAdShown] = useState(false);
  const [adRewarded, setAdRewarded] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setAdShown(false);
      setCountdown(0);
      setAdRewarded(false);
      // Trigger entrance animation
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Countdown timer for after ad is shown
  useEffect(() => {
    if (adShown && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (adShown && countdown === 0 && countdown !== null && adRewarded) {
      // Countdown finished AND ad was rewarded, call callback
      if (onCountdownComplete) {
        console.log('[WatchAdModal] Countdown complete and ad rewarded');
        onCountdownComplete();
      }
    }
  }, [adShown, countdown, adRewarded]);

  const handleWatchAd = async () => {
    console.log('[WatchAdModal] Watch Ad clicked');
    setAdShown(true);
    setCountdown(3); // 3 second countdown before allowing skip
    
    // Call the callback to show the actual ad
    if (onAdWatched) {
      console.log('[WatchAdModal] Calling onAdWatched callback');
      try {
        const rewarded = await onAdWatched();
        console.log('[WatchAdModal] onAdWatched callback returned:', rewarded);
        setAdRewarded(rewarded === true);
        
        // If ad was rewarded or skipped, close modal after short delay
        setTimeout(() => {
          if (onCountdownComplete) {
            console.log('[WatchAdModal] Ad completed, proceeding to content');
            onCountdownComplete();
          }
        }, 500);
      } catch (error) {
        console.error('[WatchAdModal] Error watching ad:', error);
        // Even on error, allow user to continue
        setAdRewarded(true);
        setTimeout(() => {
          if (onCountdownComplete) {
            console.log('[WatchAdModal] Ad error, allowing content access');
            onCountdownComplete();
          }
        }, 500);
      }
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
    handleClose();
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onClose) {
        onClose();
      }
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: opacityAnim,
            },
          ]}
        />

        <Animated.View
          style={[
            styles.centeredView,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalContent}
          >
            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.header}>
              <Ionicons name="play-circle" size={60} color="#e94560" />
              <Text style={styles.title}>Watch Ad to Continue</Text>
            </View>

            {/* Content Info */}
            {contentTitle && (
              <View style={styles.contentInfo}>
                <Text style={styles.contentLabel}>You're about to watch:</Text>
                <Text style={styles.contentTitle} numberOfLines={2}>
                  {contentTitle}
                </Text>
              </View>
            )}

            {/* Main Message */}
            <View style={styles.messageContainer}>
              {!adShown ? (
                <>
                  <Text style={styles.message}>
                    Watch a quick ad to watch premium content for free
                  </Text>
                  <View style={styles.benefitsContainer}>
                    <View style={styles.benefit}>
                      <Ionicons name="checkmark-circle" size={20} color="#e94560" />
                      <Text style={styles.benefitText}>Unlock content instantly</Text>
                    </View>
                    <View style={styles.benefit}>
                      <Ionicons name="checkmark-circle" size={20} color="#e94560" />
                      <Text style={styles.benefitText}>30 seconds of your time</Text>
                    </View>
                    <View style={styles.benefit}>
                      <Ionicons name="checkmark-circle" size={20} color="#e94560" />
                      <Text style={styles.benefitText}>No sign-ups required</Text>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.adWatchingContainer}>
                  <ActivityIndicator size="large" color="#e94560" />
                  <Text style={styles.adWatchingText}>
                    {countdown > 0 ? `Ad finished in ${countdown}s` : 'Thank you for watching!'}
                  </Text>
                </View>
              )}
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              {!adShown ? (
                <>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.adButton,
                      isLoadingAd && styles.buttonDisabled,
                    ]}
                    onPress={handleWatchAd}
                    disabled={isLoadingAd}
                  >
                    {isLoadingAd ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="play" size={20} color="#fff" />
                        <Text style={styles.buttonText}>Watch Ad</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.button, styles.skipButton]} onPress={handleSkip}>
                    <Text style={[styles.buttonText, styles.skipButtonText]}>Skip</Text>
                  </TouchableOpacity>
                </>
              ) : countdown > 0 ? (
                <TouchableOpacity
                  style={[styles.button, styles.adButton, styles.buttonDisabled]}
                  disabled
                >
                  <Text style={styles.buttonText}>
                    {adRewarded ? `Rewarded! Ready in ${countdown}s` : `Watching ad... ${countdown}s`}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[styles.button, styles.adButton]} 
                  onPress={() => {
                    // Countdown complete or ad rewarded, close modal
                    handleClose();
                  }}
                >
                  <Ionicons name="play" size={20} color="#fff" />
                  <Text style={styles.buttonText}>{adRewarded ? 'Start Watching Now!' : 'Start Watching'}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Footer Text */}
            <Text style={styles.footerText}>
              💡 Tip: Watch ads to enjoy unlimited content as a free member!
            </Text>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  modalContent: {
    borderRadius: 20,
    paddingVertical: 30,
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 12,
    textAlign: 'center',
  },
  contentInfo: {
    backgroundColor: 'rgba(233, 69, 96, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#e94560',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  contentLabel: {
    fontSize: 12,
    color: '#b0b0b0',
    marginBottom: 4,
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  messageContainer: {
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    color: '#e0e0e0',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  benefitsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  benefitText: {
    fontSize: 14,
    color: '#e0e0e0',
    marginLeft: 10,
    flex: 1,
  },
  adWatchingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  adWatchingText: {
    fontSize: 16,
    color: '#e0e0e0',
    marginTop: 12,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  adButton: {
    backgroundColor: '#e94560',
  },
  skipButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  skipButtonText: {
    color: '#e0e0e0',
  },
  footerText: {
    fontSize: 13,
    color: '#b0b0b0',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default WatchAdModal;
