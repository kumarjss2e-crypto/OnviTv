import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Animated,
  Easing,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import GradientButton from '../components/GradientButton';

const { width, height } = Dimensions.get('window');

const onboardingData = [
  {
    id: '1',
    type: 'movie',
    movieImage: 'https://images.unsplash.com/photo-1574267432644-f74f8ec55d33?w=400&h=600&fit=crop',
    movieTitle: 'Epic Adventure',
    rating: '9.2',
    year: '2024',
    genre: 'Action',
    title: 'Discover Cinematic\nMasterpieces',
    description: 'Explore thousands of movies from every genre, curated just for you',
  },
  {
    id: '2',
    type: 'movie',
    movieImage: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop',
    movieTitle: 'Midnight Dreams',
    rating: '8.8',
    year: '2024',
    genre: 'Drama',
    title: 'Premium Streaming\nExperience',
    description: 'Watch in stunning HD quality with seamless playback on any device',
  },
  {
    id: '3',
    type: 'grid',
    title: 'Share the Magic\nwith Loved Ones',
    description: 'Create watchlists, share recommendations, and enjoy movie nights together',
    subtitle: 'Stream anywhere, anytime on any device',
  },
];

const movieGridImages = [
  // Row 1 - Action & Adventure
  'https://images.unsplash.com/photo-1574267432644-f74f8ec55d33?w=300&h=450&fit=crop',
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&h=450&fit=crop',
  'https://images.unsplash.com/photo-1594908900066-3f47337549d8?w=300&h=450&fit=crop',
  // Row 2 - Drama & Thriller
  'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=300&h=450&fit=crop',
  'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=300&h=450&fit=crop',
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&h=450&fit=crop',
  // Row 3 - Sci-Fi & Fantasy
  'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=300&h=450&fit=crop',
  'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=300&h=450&fit=crop',
  'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=300&h=450&fit=crop',
  // Row 4 - Mystery & Suspense
  'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=300&h=450&fit=crop',
  'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?w=300&h=450&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=450&fit=crop',
  // Row 5 - Romance & Comedy
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&h=450&fit=crop',
  'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=300&h=450&fit=crop',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=300&h=450&fit=crop',
  // Row 6 - Horror & Dark
  'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=300&h=450&fit=crop',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=450&fit=crop',
  'https://images.unsplash.com/photo-1533158326339-7f3cf2404354?w=300&h=450&fit=crop',
  // Row 7 - Documentary & Nature
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=300&h=450&fit=crop',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=450&fit=crop',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=300&h=450&fit=crop',
  // Row 8 - Urban & Modern
  'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=300&h=450&fit=crop',
  'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=300&h=450&fit=crop',
  'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=300&h=450&fit=crop',
];

const OnboardingScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const gridFloatAnim = useRef(new Animated.Value(0)).current;

  const viewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  // Grid auto-scroll animation - DISABLED to fix crash
  // useEffect(() => {
  //   if (currentIndex === 2) {
  //     gridFloatAnim.setValue(0);
  //     const animation = Animated.loop(
  //       Animated.sequence([
  //         Animated.timing(gridFloatAnim, {
  //           toValue: 1,
  //           duration: 12000,
  //           useNativeDriver: true,
  //           easing: Easing.inOut(Easing.ease),
  //         }),
  //         Animated.timing(gridFloatAnim, {
  //           toValue: 0,
  //           duration: 12000,
  //           useNativeDriver: true,
  //           easing: Easing.inOut(Easing.ease),
  //         }),
  //       ])
  //     );
  //     animation.start();
  //     return () => animation.stop();
  //   }
  // }, [currentIndex]);

  const scrollToNext = () => {
    console.log('Button clicked! Current index:', currentIndex);
    if (currentIndex < onboardingData.length - 1) {
      const nextIndex = currentIndex + 1;
      console.log('Scrolling to index:', nextIndex);
      
      // Update state immediately
      setCurrentIndex(nextIndex);
      
      // Then scroll
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({
          offset: nextIndex * width,
          animated: true,
        });
      }
    } else {
      console.log('Navigating to Login');
      navigation.navigate('Login');
    }
  };

  const handleSkip = () => {
    navigation.navigate('Login');
  };

  const renderItem = ({ item, index }) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.85, 1, 0.85],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.4, 1, 0.4],
      extrapolate: 'clamp',
    });

    if (item.type === 'movie') {
      return (
        <View style={styles.slide}>
          <Animated.View
            style={[
              styles.moviePosterContainer,
              {
                transform: [{ scale }],
                opacity,
              },
            ]}
          >
            <View style={styles.moviePoster}>
              <Image
                source={{ uri: item.movieImage }}
                style={styles.posterImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.posterGradient}
              />
              {/* Play Button */}
              <View style={styles.playButtonContainer}>
                <View style={styles.playButton}>
                  <View style={styles.playIcon} />
                </View>
              </View>
              {/* Movie Info */}
              <View style={styles.movieInfo}>
                <Text style={styles.movieTitle}>{item.movieTitle}</Text>
                <View style={styles.movieMeta}>
                  <Text style={styles.rating}>⭐ {item.rating}</Text>
                  <Text style={styles.metaText}>{item.year} • {item.genre}</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          <Animated.View style={[styles.textContainer, { opacity }]}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </Animated.View>
        </View>
      );
    }

    // Grid View (Screen 3) - Auto-scrolling grid design (up and down)
    const scrollTranslate = gridFloatAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -150],
    });

    return (
      <View style={styles.slide}>
        {/* Text at top for better hierarchy */}
        <Animated.View style={[styles.gridTextTop, { opacity }]}>
          <Text style={styles.gridTitle}>Endless Entertainment</Text>
          <Text style={styles.gridSubtitle}>Thousands of movies at your fingertips</Text>
        </Animated.View>

        {/* Movie Grid with auto-scroll */}
        <View style={styles.gridWrapper}>
          <Animated.View 
            style={[
              styles.gridScrollContainer,
              { 
                opacity,
                transform: [{ translateY: scrollTranslate }]
              }
            ]}
          >
          <View style={styles.movieGrid}>
            {movieGridImages.map((imageUrl, idx) => {
              const row = Math.floor(idx / 3);
              const col = idx % 3;
              const stagger = (row + col) * 0.05;
              
              const itemScale = opacity.interpolate({
                inputRange: [0.4, Math.min(0.6 + stagger, 0.95), 1],
                outputRange: [0.7, 0.9, 1],
                extrapolate: 'clamp',
              });

              const itemOpacity = opacity.interpolate({
                inputRange: [0.4, Math.min(0.6 + stagger, 0.95), 1],
                outputRange: [0, 0.5, 1],
                extrapolate: 'clamp',
              });
              
              return (
                <Animated.View
                  key={idx}
                  style={[
                    styles.gridItem,
                    {
                      opacity: itemOpacity,
                      transform: [{ scale: itemScale }]
                    },
                  ]}
                >
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.gridImage}
                    resizeMode="cover"
                  />
                  {/* Subtle overlay gradient */}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.4)']}
                    style={styles.gridItemOverlay}
                  />
                </Animated.View>
              );
            })}
          </View>
          
          {/* Bottom fade for depth */}
          <LinearGradient
            colors={['transparent', 'rgba(15, 23, 42, 0.95)', colors.neutral.slate900]}
            style={styles.gridFadeOut}
            pointerEvents="none"
          />
        </Animated.View>
        </View>

        {/* Bottom CTA text */}
        <Animated.View style={[styles.gridBottomText, { opacity }]}>
          <Text style={styles.gridCTA}>Stream anywhere, anytime</Text>
        </Animated.View>
      </View>
    );
  };

  const Paginator = () => {
    return (
      <View style={styles.paginatorContainer}>
        {onboardingData.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [12, 32, 12],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  return (
    <LinearGradient
      colors={[colors.neutral.slate900, colors.primary.purple900, colors.neutral.slate900]}
      style={styles.container}
    >
      {/* Background Blobs */}
      <View style={styles.blobContainer}>
        <View style={[styles.blob, styles.blob1]} />
        <View style={[styles.blob, styles.blob2]} />
        <View style={[styles.blob, styles.blob3]} />
      </View>

      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Onboarding Slides */}
      <FlatList
        ref={flatListRef}
        data={onboardingData}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        scrollEventThrottle={16}
      />

      {/* Paginator */}
      <Paginator />

      {/* Next/Get Started Button */}
      <View style={styles.buttonContainer}>
        <GradientButton
          title={currentIndex === onboardingData.length - 1 ? 'Get Started' : 'Continue'}
          onPress={scrollToNext}
          style={styles.button}
        />
      </View>
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
    opacity: 0.1,
  },
  blob1: {
    width: 200,
    height: 200,
    backgroundColor: colors.primary.purple,
    top: 100,
    left: -60,
  },
  blob2: {
    width: 150,
    height: 150,
    backgroundColor: colors.secondary.cyan,
    top: 250,
    right: -40,
  },
  blob3: {
    width: 180,
    height: 180,
    backgroundColor: colors.primary.indigo,
    bottom: 200,
    left: 40,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  skipText: {
    color: colors.text.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  moviePosterContainer: {
    marginBottom: 50,
  },
  moviePoster: {
    width: width * 0.65,
    height: width * 0.88,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  posterGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  playButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    width: 0,
    height: 0,
    borderLeftWidth: 16,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: colors.text.primary,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 4,
  },
  movieInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  movieTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 6,
  },
  movieMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rating: {
    fontSize: 13,
    color: colors.accent.yellow,
    fontWeight: '600',
  },
  metaText: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  gridTextTop: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  gridTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  gridSubtitle: {
    fontSize: 14,
    color: 'rgba(148, 163, 184, 0.7)',
    textAlign: 'center',
    fontWeight: '400',
  },
  gridWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    maxHeight: 400,
  },
  gridScrollContainer: {
    paddingBottom: 600,
  },
  movieGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: width * 0.85,
    gap: 8,
  },
  gridItem: {
    width: (width * 0.85 - 32) / 3,
    height: (width * 0.85 - 32) / 3 * 1.4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.neutral.slate800,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridItemOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  gridFadeOut: {
    position: 'absolute',
    bottom: -20,
    left: -50,
    right: -50,
    height: 150,
  },
  gridBottomText: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  gridCTA: {
    fontSize: 15,
    color: colors.text.secondary,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14,
    color: 'rgba(148, 163, 184, 0.8)',
    textAlign: 'center',
    lineHeight: 21,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(148, 163, 184, 0.6)',
    textAlign: 'center',
    marginTop: 8,
  },
  paginatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary.purple,
    marginHorizontal: 4,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  button: {
    width: '100%',
  },
});

export default OnboardingScreen;
