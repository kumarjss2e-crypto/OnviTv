/**
 * VideoPlayerScreen - Production-ready IPTV video player
 * 
 * Architecture:
 * - Uses useVideoPlayer hook for all streaming logic
 * - Platform-agnostic (Web, iOS, Android)
 * - Clean separation of concerns
 * - Proper error handling and recovery
 * - Automatic progress saving
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  Platform,
  BackHandler,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import useVideoPlayer from '../hooks/useVideoPlayer';

// Conditionally import ScreenOrientation only for mobile
let ScreenOrientation;
if (Platform.OS !== 'web') {
  try {
    ScreenOrientation = require('expo-screen-orientation');
  } catch (e) {
    console.warn('ScreenOrientation not available');
  }
}

// Import platform-specific video component
let NativeVideo;
if (Platform.OS === 'web') {
  // Web uses HTML5 video element directly
  NativeVideo = null;
} else {
  // Mobile uses react-native-video
  try {
    NativeVideo = require('react-native-video').default;
  } catch (e) {
    console.warn('react-native-video not available');
  }
}

const getScreenDimensions = () => {
  const { width, height } = Dimensions.get('window');
  return { width, height };
};

/**
 * Web Video Player Component
 * Uses HTML5 video element for streaming
 */
const WebVideoPlayer = React.forwardRef(({ source, videoRef, onPlay, onPause }, ref) => {
  return (
    <video
      ref={videoRef || ref}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: 'black',
        display: 'block',
      }}
      controls={false}
      onPlay={onPlay}
      onPause={onPause}
    />
  );
});

/**
 * Native Video Player Component (iOS/Android)
 * Uses react-native-video for HLS support
 */
const NativeVideoPlayer = ({ source, videoRef, onPlay, onPause, onLoad, onError, onProgress }) => {
  if (!NativeVideo) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Video component not available</Text>
      </View>
    );
  }

  return (
    <NativeVideo
      ref={videoRef}
      source={{ uri: source }}
      style={styles.video}
      resizeMode="contain"
      controls={false}
      onPlay={onPlay}
      onPause={onPause}
      onLoad={onLoad}
      onError={onError}
      onProgress={onProgress}
      playWhenInactive={false}
      playsinline={true}
      progressUpdateInterval={500}
    />
  );
};

/**
 * Control Bar Component
 */
const ControlBar = ({ 
  isPlaying, 
  duration, 
  currentTime, 
  onPlayPause, 
  onSeek, 
  onBack,
  onFullscreenToggle,
  isLoading,
  isBuffering,
  title,
}) => {
  const progress = duration ? (currentTime / duration) * 100 : 0;
  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <LinearGradient
      colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.controlBar}
    >
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBar,
            { width: `${Math.min(progress, 100)}%` },
          ]}
        />
      </View>

      {/* Time Display */}
      <View style={styles.timeContainer}>
        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>

      {/* Control Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={onBack} style={styles.button}>
          <Ionicons name="chevron-back" size={32} color="white" />
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={onPlayPause} 
          style={styles.button}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size={32} color="white" />
          ) : (
            <Ionicons 
              name={isPlaying ? 'pause' : 'play'} 
              size={32} 
              color="white" 
            />
          )}
        </TouchableOpacity>

        {isBuffering && (
          <View style={styles.bufferingIndicator}>
            <ActivityIndicator size="small" color="white" />
            <Text style={styles.bufferingText}>Buffering...</Text>
          </View>
        )}

        <TouchableOpacity onPress={onFullscreenToggle} style={styles.button}>
          <Ionicons name="expand-outline" size={32} color="white" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

/**
 * Error Display Component
 */
const ErrorDisplay = ({ error, onRetry }) => {
  return (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle" size={64} color="red" />
      <Text style={styles.errorTitle}>Playback Error</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
};

/**
 * Loading Indicator Component
 */
const LoadingIndicator = () => {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="white" />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
};

/**
 * Main VideoPlayerScreen Component
 */
export default function VideoPlayerScreen({ route, navigation }) {
  const { streamUrl, title, contentType, contentId, thumbnail } = route.params || {};
  const { user } = useAuth();
  
  // Validate streamUrl
  if (!streamUrl) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ff4444" />
          <Text style={styles.errorTitle}>No Stream URL</Text>
          <Text style={styles.errorMessage}>The video stream URL is missing</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // Always call the hook (required for React rules of hooks)
  // But we only use it on web platform
  const webHookData = useVideoPlayer(streamUrl);
  
  // Use web hook data only on web platform
  const videoRef = Platform.OS === 'web' ? webHookData.videoRef : null;
  const playbackState = Platform.OS === 'web' ? webHookData.state : {
    isPlaying: false,
    isLoading: false,
    isBuffering: false,
    duration: 0,
    currentTime: 0,
    error: null,
  };
  const play = Platform.OS === 'web' ? webHookData.play : async () => {};
  const pause = Platform.OS === 'web' ? webHookData.pause : () => {};
  const seek = Platform.OS === 'web' ? webHookData.seek : () => {};

  // Local UI state
  const [showControls, setShowControls] = useState(true);
  const [dimensions, setDimensions] = useState(getScreenDimensions());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const controlsTimeout = useRef(null);
  
  // Native video ref for iOS/Android
  const nativeVideoRef = useRef(null);
  const [nativePlaybackState, setNativePlaybackState] = useState({
    isPlaying: false,
    isLoading: true,  // Start with loading state
    isBuffering: false,
    duration: 0,
    currentTime: 0,
    error: null,
  });

  // Cleanup ref
  const isUnmountedRef = useRef(false);

  /**
   * Handle back button press
   */
  const handleBack = useCallback(() => {
    // Save progress before leaving
    const currentState = Platform.OS === 'web' ? playbackState : nativePlaybackState;
    if (user && contentId && currentState.currentTime > 0) {
      saveProgress();
    }
    navigation.goBack();
    return true;
  }, [user, contentId, playbackState, nativePlaybackState, navigation]);

  /**
   * Handle play/pause toggle
   */
  const handlePlayPause = useCallback(async () => {
    if (Platform.OS === 'web') {
      if (playbackState.isPlaying) {
        pause();
      } else {
        await play();
      }
    } else {
      // Native platform
      if (nativePlaybackState.isPlaying) {
        nativeVideoRef.current?.pause();
      } else {
        nativeVideoRef.current?.play();
      }
    }
  }, [playbackState.isPlaying, play, pause, nativePlaybackState.isPlaying]);

  /**
   * Handle seeking
   */
  const handleSeek = useCallback((position) => {
    if (Platform.OS === 'web') {
      seek(position);
    } else {
      // Native platform - position is in milliseconds
      nativeVideoRef.current?.seek(position / 1000);
    }
  }, [seek]);

  /**
   * Save progress to Firebase
   */
  const saveProgress = useCallback(async () => {
    const currentState = Platform.OS === 'web' ? playbackState : nativePlaybackState;
    
    if (!user || !contentId || !currentState.currentTime) {
      return;
    }

    try {
      const progressRef = doc(firestore, 'users', user.uid, 'progress', contentId);
      
      await setDoc(progressRef, {
        contentId,
        title,
        streamUrl,
        positionMillis: currentState.currentTime * 1000,
        durationMillis: currentState.duration * 1000,
        lastWatched: serverTimestamp(),
        contentType: contentType || 'stream',
      }, { merge: true });
      
      console.log('[VideoPlayer] Progress saved:', {
        contentId,
        position: currentState.currentTime,
        duration: currentState.duration,
      });
    } catch (err) {
      console.error('[VideoPlayer] Failed to save progress:', err);
    }
  }, [user, contentId, title, streamUrl, contentType, playbackState.currentTime, playbackState.duration, nativePlaybackState.currentTime, nativePlaybackState.duration]);

  /**
   * Load saved progress
   */
  const loadProgress = useCallback(async () => {
    if (!user || !contentId) {
      return;
    }

    try {
      const progressRef = doc(firestore, 'users', user.uid, 'progress', contentId);
      const snapshot = await getDoc(progressRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.positionMillis > 0) {
          console.log('[VideoPlayer] Resuming from saved position:', data.positionMillis);
          // Resume playback after video loads
          setTimeout(() => {
            if (!isUnmountedRef.current) {
              seek(data.positionMillis / 1000);
              play();
            }
          }, 1000);
        }
      }
    } catch (err) {
      console.error('[VideoPlayer] Failed to load progress:', err);
    }
  }, [user, contentId, seek, play]);

  /**
   * Reset controls visibility timeout
   */
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }

    if (playbackState.isPlaying) {
      controlsTimeout.current = setTimeout(() => {
        if (!isUnmountedRef.current) {
          setShowControls(false);
        }
      }, 3000);
    }
  }, [playbackState.isPlaying]);

  /**
   * Handle retry on error
   */
  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    // This will trigger a reload by changing the key
  }, []);

  /**
   * Navigation focus effect (handle orientation and lifecycle)
   */
  useFocusEffect(
    useCallback(() => {
      // Lock to portrait when entering video player
      // Fullscreen toggle will handle landscape rotation
      if (Platform.OS !== 'web' && ScreenOrientation) {
        try {
          if (ScreenOrientation.lockAsync && ScreenOrientation.OrientationLock) {
            // Start in portrait - user must tap fullscreen to rotate
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch((err) => {
              console.warn('[VideoPlayer] Failed to lock initial orientation:', err);
            });
          }
        } catch (err) {
          console.warn('[VideoPlayer] Screen orientation error on focus:', err);
        }
      }

      StatusBar.setHidden(true);

      const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBack);

      return () => {
        StatusBar.setHidden(false);
        backHandler.remove();
        
        // Lock back to portrait when leaving video player
        if (Platform.OS !== 'web' && ScreenOrientation) {
          try {
            if (ScreenOrientation.lockAsync && ScreenOrientation.OrientationLock) {
              // Always lock to portrait on cleanup
              ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch((err) => {
                console.warn('[VideoPlayer] Failed to lock orientation back to portrait:', err);
              });
            }
          } catch (err) {
            console.warn('[VideoPlayer] Screen orientation error on cleanup:', err);
          }
        }
      };
    }, [handleBack])
  );

  /**
   * Dimension change listener
   */
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      if (!isUnmountedRef.current) {
        setDimensions({ width: window.width, height: window.height });
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  /**
   * Load saved progress on mount
   */
  useEffect(() => {
    loadProgress();

    return () => {
      isUnmountedRef.current = true;
      // Save progress on unmount
      saveProgress();
    };
  }, [loadProgress, saveProgress]);

  /**
   * Control visibility timeout
   */
  useEffect(() => {
    resetControlsTimeout();
    
    if (controlsTimeout.current) {
      return () => {
        clearTimeout(controlsTimeout.current);
      };
    }
  }, [playbackState.isPlaying, resetControlsTimeout]);

  /**
   * Handle tap to toggle controls
   */
  const handleScreenTap = useCallback(() => {
    setShowControls(prev => !prev);
    if (!showControls) {
      resetControlsTimeout();
    }
  }, [showControls, resetControlsTimeout]);

  /**
   * Toggle fullscreen mode
   */
  const toggleFullscreen = useCallback(async () => {
    if (Platform.OS === 'web') {
      // Web fullscreen API
      const playerContainer = document.querySelector('[data-video-container]');
      if (playerContainer) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          playerContainer.requestFullscreen().catch(() => {});
        }
      }
    } else if (ScreenOrientation) {
      // Native fullscreen - rotate to landscape
      try {
        if (isFullscreen) {
          // Exit fullscreen - rotate back to portrait
          if (ScreenOrientation.lockAsync && ScreenOrientation.OrientationLock) {
            // Set state BEFORE lock to prevent race condition
            setIsFullscreen(false);
            // Use PORTRAIT_UP for explicit portrait locking
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch((err) => {
              console.warn('[VideoPlayer] Failed to lock portrait:', err);
            });
          }
        } else {
          // Enter fullscreen - rotate to landscape
          if (ScreenOrientation.lockAsync && ScreenOrientation.OrientationLock) {
            // Set state BEFORE lock to prevent race condition
            setIsFullscreen(true);
            // Use LANDSCAPE_RIGHT for explicit landscape locking
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT).catch((err) => {
              console.warn('[VideoPlayer] Failed to lock landscape:', err);
            });
          }
        }
      } catch (err) {
        console.warn('[VideoPlayer] Failed to toggle orientation:', err);
      }
    }
  }, [isFullscreen]);

  // Render platform-specific player
  const renderPlayer = () => {
    console.log(`[VideoPlayer] Rendering on platform: ${Platform.OS}, URL: ${streamUrl}`);
    
    if (Platform.OS === 'web') {
      return (
        <div data-video-container style={{ width: '100%', height: '100%' }}>
          <WebVideoPlayer ref={videoRef} source={streamUrl} />
        </div>
      );
    } else {
      console.log(`[VideoPlayer] Native player - source URL: ${streamUrl}`);
      return (
        <NativeVideoPlayer
          source={streamUrl}
          videoRef={nativeVideoRef}
          onPlay={() => {
            setNativePlaybackState(prev => ({
              ...prev,
              isPlaying: true,
              isBuffering: false,
            }));
          }}
          onPause={() => {
            setNativePlaybackState(prev => ({
              ...prev,
              isPlaying: false,
            }));
          }}
          onLoad={(data) => {
            console.log('[VideoPlayer] Video loaded:', data);
            setNativePlaybackState(prev => ({
              ...prev,
              isLoading: false,
              duration: data.duration || 0,
            }));
          }}
          onProgress={(data) => {
            setNativePlaybackState(prev => ({
              ...prev,
              currentTime: data.currentTime || 0,
            }));
          }}
          onError={(error) => {
            console.error('[VideoPlayer] Video error:', error);
            setNativePlaybackState(prev => ({
              ...prev,
              error: error?.message || 'Failed to load video',
              isLoading: false,
            }));
          }}
        />
      );
    }
  };

  // Main render
  return (
    <View style={styles.container}>
      {/* Video Player Container */}
      <TouchableOpacity 
        style={styles.videoContainer}
        activeOpacity={1}
        onPress={handleScreenTap}
      >
        {renderPlayer()}
      </TouchableOpacity>
      
      {/* Loading Indicator - Overlay */}
      {(Platform.OS === 'web' ? playbackState.isLoading : nativePlaybackState.isLoading) && <LoadingIndicator />}
      
      {/* Error Display - Overlay */}
      {(Platform.OS === 'web' ? playbackState.error : nativePlaybackState.error) && (
        <ErrorDisplay 
          error={Platform.OS === 'web' ? playbackState.error : nativePlaybackState.error}
          onRetry={handleRetry}
        />
      )}

      {/* Control Bar - Bottom Overlay */}
      {showControls && (() => {
        const state = Platform.OS === 'web' ? playbackState : nativePlaybackState;
        return (
          <ControlBar
            isPlaying={state.isPlaying}
            duration={state.duration}
            currentTime={state.currentTime}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
            onBack={handleBack}
            onFullscreenToggle={toggleFullscreen}
            isLoading={state.isLoading}
            isBuffering={state.isBuffering}
            title={title}
          />
        );
      })()}
    </View>
  );
}

/**
 * Styles
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  controlBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 16,
    paddingHorizontal: 12,
    zIndex: 100,
  },
  progressContainer: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FF0000',
    borderRadius: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timeText: {
    color: 'white',
    fontSize: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  button: {
    padding: 8,
  },
  bufferingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  bufferingText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 12,
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 101,
  },
  errorText: {
    color: 'white',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  errorTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
  errorMessage: {
    color: 'white',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#FF0000',
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 50,
  },
  loadingText: {
    color: 'white',
    marginTop: 12,
    fontSize: 14,
  },
});
