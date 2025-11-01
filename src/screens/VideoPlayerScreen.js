import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { updateWatchHistory } from '../services/watchHistoryService';
import Slider from '@react-native-community/slider';

// Remove static dimensions - we'll use flex and percentages instead

const VideoPlayerScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const { channel, movie, episode, contentType = 'channel' } = route.params;
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  
  const videoRef = useRef(null);
  const [status, setStatus] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [videoKey, setVideoKey] = useState(0); // Force video remount on retry
  const controlsTimeout = useRef(null);
  const retryTimeout = useRef(null);
  
  const MAX_RETRIES = 5;
  const RETRY_DELAY = 3000; // 3 seconds

  // Get content data
  const content = channel || movie || episode;
  const contentName = content?.name || content?.title || 'Untitled';
  const streamUrl = content?.streamUrl || '';

  useEffect(() => {
    // Auto-hide controls after 3 seconds
    if (showControls) {
      clearTimeout(controlsTimeout.current);
      controlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => clearTimeout(controlsTimeout.current);
  }, [showControls]);

  useEffect(() => {
    // Save watch progress every 30 seconds
    const progressInterval = setInterval(() => {
      if (status.isPlaying && status.positionMillis && user) {
        saveProgress();
      }
    }, 30000);

    return () => clearInterval(progressInterval);
  }, [status, user]);

  useEffect(() => {
    // Auto-retry on error
    if (error && retryCount < MAX_RETRIES) {
      console.log(`Auto-retrying in ${RETRY_DELAY/1000}s... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
      retryTimeout.current = setTimeout(() => {
        handleRetry();
      }, RETRY_DELAY);
    }

    return () => {
      if (retryTimeout.current) {
        clearTimeout(retryTimeout.current);
      }
    };
  }, [error, retryCount]);

  const saveProgress = async () => {
    if (!user || !content) return;

    try {
      await updateWatchHistory(user.uid, {
        contentType: contentType,
        contentId: content.id,
        playlistId: content.playlistId,
        name: contentName,
        poster: content.logo || content.poster || '',
        streamUrl: streamUrl,
        duration: status.durationMillis || 0,
        progress: status.positionMillis || 0,
      });
    } catch (error) {
      console.error('Error saving watch progress:', error);
    }
  };

  const handlePlaybackStatusUpdate = (playbackStatus) => {
    setStatus(playbackStatus);

    if (playbackStatus.isLoaded) {
      setIsLoading(false);
      setIsBuffering(playbackStatus.isBuffering);

      if (playbackStatus.didJustFinish) {
        // Video finished
        saveProgress();
        navigation.goBack();
      }
    } else if (playbackStatus.error) {
      setError(`Error: ${playbackStatus.error}`);
      setIsLoading(false);
    }
  };

  const togglePlayPause = async () => {
    if (videoRef.current) {
      if (status.isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    }
  };

  const handleSeek = async (value) => {
    if (videoRef.current && status.durationMillis) {
      await videoRef.current.setPositionAsync(value);
    }
  };

  const handleRewind = async () => {
    if (videoRef.current && status.positionMillis) {
      const newPosition = Math.max(0, status.positionMillis - 10000);
      await videoRef.current.setPositionAsync(newPosition);
    }
  };

  const handleForward = async () => {
    if (videoRef.current && status.positionMillis && status.durationMillis) {
      const newPosition = Math.min(status.durationMillis, status.positionMillis + 10000);
      await videoRef.current.setPositionAsync(newPosition);
    }
  };

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  const handleBack = async () => {
    await saveProgress();
    navigation.goBack();
  };

  const formatTime = (millis) => {
    if (!millis) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    setRetryCount(prev => prev + 1);
    setVideoKey(prev => prev + 1); // Force video to remount
  };

  const handleManualRetry = () => {
    setRetryCount(0); // Reset retry count on manual retry
    handleRetry();
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {/* Video Player */}
      <TouchableOpacity
        style={styles.videoContainer}
        activeOpacity={1}
        onPress={toggleControls}
      >
        <View style={[styles.videoWrapper, { width: screenWidth, height: screenHeight }]}>
          <Video
            key={videoKey}
            ref={videoRef}
            source={{ uri: streamUrl }}
            style={[styles.video, { width: screenWidth, height: screenHeight }]}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            useNativeControls={false}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            onError={(error) => {
              console.error('Video error:', JSON.stringify(error, null, 2));
              const errorMessage = error?.error || error?.message || 'Failed to load video stream. The stream may be offline or not compatible with web playback.';
              setError(errorMessage);
              setIsLoading(false);
            }}
          />
        </View>

        {/* Loading Indicator */}
        {(isLoading || isBuffering) && !error && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary.purple} />
            <Text style={styles.loadingText}>
              {isLoading ? 'Loading...' : 'Buffering...'}
            </Text>
          </View>
        )}

        {/* Error Overlay (YouTube-style) */}
        {error && (
          <View style={styles.errorOverlay}>
            <View style={styles.errorContent}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.accent.red} />
              <Text style={styles.errorOverlayTitle}>Playback Error</Text>
              {retryCount < MAX_RETRIES ? (
                <>
                  <ActivityIndicator size="small" color={colors.primary.purple} style={{ marginVertical: 12 }} />
                  <Text style={styles.errorOverlayText}>
                    Retrying... ({retryCount + 1}/{MAX_RETRIES})
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.errorOverlayText}>
                    Unable to load stream
                  </Text>
                  <TouchableOpacity style={styles.retryOverlayButton} onPress={handleManualRetry}>
                    <Ionicons name="refresh" size={20} color={colors.text.primary} />
                    <Text style={styles.retryOverlayButtonText}>Tap to Retry</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}

        {/* Back Button - Always Visible */}
        <View style={styles.alwaysVisibleHeader}>
          <TouchableOpacity style={styles.backIconButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={28} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Controls Overlay */}
        {showControls && !isLoading && !error && (
          <View style={styles.controlsOverlay}>
            {/* Top Bar */}
            <View style={styles.topBar}>
              <TouchableOpacity style={styles.backIconButton} onPress={handleBack}>
                <Ionicons name="arrow-back" size={28} color={colors.text.primary} />
              </TouchableOpacity>
              <View style={styles.titleContainer}>
                <Text style={styles.videoTitle} numberOfLines={1}>
                  {contentName}
                </Text>
                {contentType === 'channel' && (
                  <Text style={styles.liveIndicator}>● LIVE</Text>
                )}
              </View>
              <View style={styles.placeholder} />
            </View>

            {/* Center Controls */}
            <View style={styles.centerControls}>
              <TouchableOpacity 
                style={styles.controlButton} 
                onPress={handleRewind}
                activeOpacity={0.7}
              >
                <Ionicons name="play-back" size={28} color={colors.text.primary} />
                <Text style={styles.controlLabel}>10s</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.playButton} 
                onPress={togglePlayPause}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={status.isPlaying ? 'pause' : 'play'}
                  size={40}
                  color="#fff"
                />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.controlButton} 
                onPress={handleForward}
                activeOpacity={0.7}
              >
                <Ionicons name="play-forward" size={28} color={colors.text.primary} />
                <Text style={styles.controlLabel}>10s</Text>
              </TouchableOpacity>
            </View>

            {/* Bottom Bar (only for VOD, not live channels) */}
            {contentType !== 'channel' && status.durationMillis > 0 && (
              <View style={styles.bottomBar}>
                <Text style={styles.timeText}>
                  {formatTime(status.positionMillis)}
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={status.durationMillis || 1}
                  value={status.positionMillis || 0}
                  onSlidingComplete={handleSeek}
                  minimumTrackTintColor={colors.primary.purple}
                  maximumTrackTintColor={colors.neutral.slate700}
                  thumbTintColor={colors.primary.purple}
                />
                <Text style={styles.timeText}>
                  {formatTime(status.durationMillis)}
                </Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    width: '100%',
    height: '100%',
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  videoWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.primary,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  errorContent: {
    alignItems: 'center',
    padding: 24,
    maxWidth: 300,
  },
  errorOverlayTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorOverlayText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryOverlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary.purple,
    gap: 8,
  },
  retryOverlayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  alwaysVisibleHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 16,
    zIndex: 100,
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  backIconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 22,
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  liveIndicator: {
    fontSize: 12,
    color: colors.accent.red,
    fontWeight: '600',
    marginTop: 4,
  },
  placeholder: {
    width: 44,
  },
  centerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
    paddingHorizontal: 10,
  },
  controlButton: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  controlLabel: {
    position: 'absolute',
    bottom: 6,
    fontSize: 9,
    fontWeight: '700',
    color: colors.text.primary,
  },
  playButton: {
    width: 75,
    height: 75,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary.purple,
    borderRadius: 37.5,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: colors.primary.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    gap: 12,
    width: '100%',
  },
  slider: {
    flex: 1,
    height: 40,
  },
  timeText: {
    fontSize: 12,
    color: colors.text.primary,
    fontWeight: '500',
    minWidth: 45,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    width: '100%',
    height: '100%',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: colors.text.primary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
    maxWidth: 600,
  },
  retryingText: {
    color: colors.primary.purple,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  errorHint: {
    color: colors.text.secondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
    maxWidth: 600,
    fontStyle: 'italic',
  },
  retryButton: {
    backgroundColor: colors.primary.purple,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
});

export default VideoPlayerScreen;
