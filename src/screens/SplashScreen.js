import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import GradientButton from '../components/GradientButton';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ navigation }) => {
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo entrance animation
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Text fade in
    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 1000,
      delay: 400,
      useNativeDriver: true,
    }).start();

    // Button fade in
    Animated.timing(buttonOpacity, {
      toValue: 1,
      duration: 800,
      delay: 800,
      useNativeDriver: true,
    }).start();

    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const floatTranslate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  return (
    <LinearGradient
      colors={[colors.neutral.slate900, colors.primary.purple900, colors.neutral.slate900]}
      style={styles.container}
    >
      {/* Animated Background Blobs */}
      <View style={styles.blobContainer}>
        <View style={[styles.blob, styles.blob1]} />
        <View style={[styles.blob, styles.blob2]} />
        <View style={[styles.blob, styles.blob3]} />
      </View>

      <View style={styles.content}>
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [
                { scale: logoScale },
                { translateY: floatTranslate },
              ],
            },
          ]}
        >
          <View style={styles.logoCircle}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.logoText}>
            Onvi<Text style={styles.logoTextGradient}>TV</Text>
          </Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.View style={[styles.taglineContainer, { opacity: textOpacity }]}>
          <Text style={styles.tagline}>Your premium streaming</Text>
          <Text style={styles.taglineSecondary}>experience awaits</Text>
        </Animated.View>
      </View>

      {/* Continue Button */}
      <Animated.View style={[styles.buttonContainer, { opacity: buttonOpacity }]}>
        <GradientButton
          title="Continue"
          onPress={() => navigation.navigate('Onboarding')}
          style={styles.button}
        />
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  blobContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.15,
  },
  blob1: {
    width: 200,
    height: 200,
    backgroundColor: colors.primary.purple,
    top: 80,
    left: -50,
  },
  blob2: {
    width: 150,
    height: 150,
    backgroundColor: colors.secondary.cyan,
    top: 200,
    right: -30,
  },
  blob3: {
    width: 180,
    height: 180,
    backgroundColor: colors.primary.indigo,
    bottom: 150,
    left: 50,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.background.glass,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: colors.primary.purple,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  logoText: {
    fontSize: 52,
    fontWeight: '900',
    color: colors.text.primary,
    letterSpacing: -1,
  },
  logoTextGradient: {
    color: colors.primary.purple,
  },
  taglineContainer: {
    alignItems: 'center',
  },
  tagline: {
    fontSize: 22,
    color: colors.text.secondary,
    fontWeight: '300',
    marginBottom: 8,
  },
  taglineSecondary: {
    fontSize: 18,
    color: colors.text.tertiary,
    fontWeight: '300',
  },
  buttonContainer: {
    paddingHorizontal: 32,
    paddingBottom: 50,
  },
  button: {
    width: '100%',
  },
});

export default SplashScreen;
