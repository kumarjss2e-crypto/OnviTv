import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const PINSetupScreen = ({ route, navigation }) => {
  const { onPINSet, isChanging = false } = route.params || {};
  
  const [step, setStep] = useState(1); // 1 = enter PIN, 2 = confirm PIN
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  const currentPin = step === 1 ? pin : confirmPin;

  const handleNumberPress = (number) => {
    if (currentPin.length < 4) {
      const newPin = currentPin + number;
      
      if (step === 1) {
        setPin(newPin);
        if (newPin.length === 4) {
          setTimeout(() => {
            setStep(2);
          }, 100);
        }
      } else {
        setConfirmPin(newPin);
        if (newPin.length === 4) {
          setTimeout(() => verifyPins(pin, newPin), 100);
        }
      }
      
      setError('');
    }
  };

  const handleBackspace = () => {
    if (step === 1) {
      setPin(pin.slice(0, -1));
    } else {
      setConfirmPin(confirmPin.slice(0, -1));
    }
    setError('');
  };

  const verifyPins = (firstPin, secondPin) => {
    if (firstPin === secondPin) {
      // Success - PINs match
      if (onPINSet) {
        onPINSet(firstPin);
      }
      navigation.goBack();
    } else {
      // PINs don't match
      setError("PINs don't match");
      setConfirmPin('');
      Vibration.vibrate(500);
      
      // Shake animation
      Animated.sequence([
        Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: -10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]).start();
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setConfirmPin('');
      setError('');
    } else {
      navigation.goBack();
    }
  };

  const renderPinDots = () => {
    return (
      <Animated.View style={[styles.pinDotsContainer, { transform: [{ translateX: shakeAnimation }] }]}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              currentPin.length > index && styles.pinDotFilled,
              error && styles.pinDotError,
            ]}
          />
        ))}
      </Animated.View>
    );
  };

  const renderNumberPad = () => {
    const numbers = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'backspace'],
    ];

    return (
      <View style={styles.numberPad}>
        {numbers.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.numberRow}>
            {row.map((item, colIndex) => {
              if (item === '') {
                return <View key={colIndex} style={styles.numberButton} />;
              }

              if (item === 'backspace') {
                return (
                  <TouchableOpacity
                    key={colIndex}
                    style={styles.numberButton}
                    onPress={handleBackspace}
                  >
                    <Ionicons name="backspace-outline" size={28} color={colors.text.primary} />
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={colIndex}
                  style={styles.numberButton}
                  onPress={() => handleNumberPress(item)}
                >
                  <Text style={styles.numberText}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
        >
          <Ionicons name={step === 2 ? "arrow-back" : "close"} size={28} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="key" size={64} color={colors.primary.purple} />
        </View>

        <Text style={styles.title}>
          {isChanging ? 'Change PIN' : 'Set Up PIN'}
        </Text>
        <Text style={styles.subtitle}>
          {step === 1 
            ? 'Enter a 4-digit PIN' 
            : 'Confirm your PIN'}
        </Text>

        {renderPinDots()}

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <View style={styles.errorPlaceholder} />
        )}

        {renderNumberPad()}

        <Text style={styles.helpText}>
          {step === 1 
            ? 'Choose a PIN that you can remember' 
            : 'Re-enter your PIN to confirm'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.slate900,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 40,
    textAlign: 'center',
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.neutral.slate700,
    marginHorizontal: 8,
  },
  pinDotFilled: {
    backgroundColor: colors.primary.purple,
    borderColor: colors.primary.purple,
  },
  pinDotError: {
    borderColor: '#ef4444',
    backgroundColor: 'transparent',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    marginBottom: 32,
    height: 20,
  },
  errorPlaceholder: {
    height: 20,
    marginBottom: 32,
  },
  numberPad: {
    width: '100%',
    maxWidth: 300,
    marginBottom: 24,
  },
  numberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  numberButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.neutral.slate800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.text.primary,
  },
  helpText: {
    fontSize: 13,
    color: colors.text.muted,
    textAlign: 'center',
  },
});

export default PINSetupScreen;
