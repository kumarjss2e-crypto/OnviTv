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

// Conditionally import ScreenOrientation only for mobile
let ScreenOrientation;
if (Platform.OS !== 'web') {
  ScreenOrientation = require('expo-screen-orientation');
}
import Video from 'react-native-video';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

// Guard Hls import for web only - HLS.js only needed for HLS streams on web
let Hls = null;
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  try {
    Hls = require('hls.js').default || require('hls.js');
  } catch (e) {
    console.warn('HLS.js not available, using native video playback');
    Hls = null;
  }
}

const getScreenDimensions = () => {
  const { width, height } = Dimensions.get('window');
  return { width, height };
};

// Web-compatible video player component with HLS.js support
const WebVideo = React.forwardRef(({ source, onPlaybackStatusUpdate, paused, onLoadStart, onLoad, onProgress, onBuffer, onEnd, onError }, ref) => {
  const webVideoRef = useRef(null);
  const updateIntervalRef = useRef(null);
  const hlsRef = useRef(null);
  
  // Connect the external ref
  React.useImperativeHandle(ref, () => ({
    seek: (time) => {
      if (webVideoRef.current) {
        webVideoRef.current.currentTime = time;
      }
    },
    playAsync: () => {
      if (webVideoRef.current) {
        return webVideoRef.current.play();
      }
    },
    pauseAsync: () => {
      if (webVideoRef.current) {
        webVideoRef.current.pause();
      }
    },
  }));
  
  // Setup HLS streaming
  useEffect(() => {
    const video = webVideoRef.current;
    if (!video || !source?.uri) return;
    
    // Try to use HLS if available and source is HLS
    if (Hls && source.uri.includes('.m3u8')) {
      try {
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }
        
        const hls = new Hls({
          // Configure HLS to handle problematic servers
          lowLatencyMode: true,
          debug: false,
          enableWorker: true,
          // Ignore Content-Length mismatches which some IPTV servers have
          fetchSetup: (context, initParams) => {
            // Disable strict validation of response headers
            return initParams;
          },
        });
        hlsRef.current = hls;
        hls.loadSource(source.uri);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('[WebVideo] HLS manifest parsed, waiting for duration...');
          
          // For HLS streams, duration might not be immediately available
          // Wait for the first segment to load
          let durationCheckCount = 0;
          const checkDuration = setInterval(() => {
            durationCheckCount++;
            if (video.duration && isFinite(video.duration)) {
              console.log('[WebVideo] Duration available:', video.duration);
              clearInterval(checkDuration);
              onLoad?.({ duration: video.duration });
            } else if (durationCheckCount > 50) {
              // After 5 seconds, use a default duration or Infinity
              console.log('[WebVideo] Duration not available, using stream duration');
              clearInterval(checkDuration);
              onLoad?.({ duration: Infinity }); // Live streams often have Infinity duration
            }
          }, 100);
          
          return () => clearInterval(checkDuration);
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.warn('[WebVideo] HLS fatal error:', data.type, data.reason);
            // Try to recover from fatal errors
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                // Network errors can potentially be recovered
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                // Media errors cannot be recovered
                console.error('[WebVideo] Unrecoverable media error');
                break;
            }
          } else {
            console.warn('[WebVideo] HLS non-fatal error:', data.type);
          }
        });
        
        return () => {
          if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
          }
        };
      } catch (err) {
        console.warn('[WebVideo] HLS initialization error:', err);
      }
    }
  }, [source?.uri, onLoad]);
  
  // Attach event listeners to video element
  useEffect(() => {
    const video = webVideoRef.current;
    if (!video) return;
    
    const handleLoadStart = () => {
      console.log('[WebVideo] loadstart event');
      onLoadStart?.();
    };
    
    const handleLoadedMetadata = () => {
      console.log('[WebVideo] loadedmetadata event, duration:', video.duration);
      // Duration might now be available from the video element
      if (video.duration && isFinite(video.duration)) {
        onLoad?.({ duration: video.duration });
      }
    };
    
    const handleTimeUpdate = () => {
      // Throttle updates
      if (updateIntervalRef.current) return;
      
      if (Math.floor(video.currentTime) % 5 === 0) {
        console.log('[WebVideo] timeupdate event, currentTime:', video.currentTime, 'duration:', video.duration, 'paused:', video.paused);
      }
      
      updateIntervalRef.current = true;
      setTimeout(() => {
        updateIntervalRef.current = false;
      }, 1000);
      
      onProgress?.({
        currentTime: video.currentTime,
        seekableDuration: video.duration || 0,
      });
    };
    
    const handlePlay = () => {
      console.log('[WebVideo] play event, video.paused:', video.paused, 'currentTime:', video.currentTime, 'duration:', video.duration);
      // Don't update status here - it causes re-renders that interrupt playback
      // Status will be updated by onProgress events
    };
    
    const handlePause = () => {
      console.log('[WebVideo] pause event, video.paused:', video.paused, 'currentTime:', video.currentTime);
      // Don't update status here - it causes re-renders that interrupt playback
      // Status will be updated by onProgress events
    };
    
    const handlePlaying = () => {
      console.log('[WebVideo] playing event');
      onBuffer?.({ isBuffering: false });
    };
    
    const handleWaiting = () => {
      console.log('[WebVideo] waiting event');
      onBuffer?.({ isBuffering: true });
    };
    
    const handleEnded = () => {
      console.log('[WebVideo] ended event');
      onEnd?.();
    };
    
    const handleError = () => {
      console.error('[WebVideo] error event:', video.error);
      onError?.({ error: { errorString: video.error?.message || 'Video error' } });
    };
    
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    
    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
    };
  }, [onLoadStart, onLoad, onProgress, onPlaybackStatusUpdate, onBuffer, onEnd, onError]);
  
  // Handle pause state changes with safety checks
  useEffect(() => {
    const video = webVideoRef.current;
    if (!video) return;
    
    console.log('[WebVideo] paused effect triggered, paused prop:', paused, 'video.paused:', video.paused);
    let isMounted = true;
    
    if (paused === false && video.paused) {
      console.log('[WebVideo] Attempting to play video, paused:', paused);
      const playPromise = video.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (isMounted) {
              console.log('[WebVideo] Play promise resolved successfully');
            }
          })
          .catch(err => {
            if (isMounted && err.name !== 'AbortError') {
              console.warn('[WebVideo] Play error:', err.name, err.message);
            }
          });
      }
    } else if (paused === true && !video.paused) {
      console.log('[WebVideo] Pausing video');
      video.pause();
    } else if (paused === false && !video.paused) {
      console.log('[WebVideo] Video already playing');
    } else if (paused === true && video.paused) {
      console.log('[WebVideo] Video already paused');
    }
    
    return () => {
      isMounted = false;
    };
  }, [paused]);
  
  return (
    <video
      ref={webVideoRef}
      src={source?.uri}
      style={{ width: '100%', height: '100%', backgroundColor: 'black', display: 'block' }}
    />
  );
});

export default function VideoPlayerScreen({ route, navigation }) {
  const { streamUrl, title, contentType, contentId, thumbnail, nextEpisode, seriesId, seasonNumber, episodeNumber } = route.params;
  const { user } = useAuth();
  
  // Test stream URL for debugging (remove this later)
  const testStreamUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
  const actualStreamUrl = streamUrl || testStreamUrl;
  
  // Log route params for debugging
  console.log('[VideoPlayerScreen] Initialized with params:');
  console.log('[VideoPlayerScreen] - streamUrl:', actualStreamUrl);
  console.log('[VideoPlayerScreen] - title:', title);
  console.log('[VideoPlayerScreen] - contentType:', contentType);
  console.log('[VideoPlayerScreen] - contentId:', contentId);
  console.log('[VideoPlayerScreen] - Platform:', Platform.OS);
  
  if (!actualStreamUrl) {
    console.error('[VideoPlayerScreen] ERROR: No stream URL provided!');
  }
  
  const videoRef = useRef(null);
  const [status, setStatus] = useState({
    isPlaying: false,
    isLoaded: false,
    isBuffering: false,
    positionMillis: 0,
    durationMillis: 0,
  });
  const statusRef = useRef(status); // Store latest status without causing re-renders
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState(null);
  const [hasResumed, setHasResumed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dimensions, setDimensions] = useState(getScreenDimensions());
  const [showAdScreen, setShowAdScreen] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [shouldAutoplay, setShouldAutoplay] = useState(true);
  const controlsTimeout = useRef(null);
  const progressSaveInterval = useRef(null);
  const lastSavedPosition = useRef(0);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'ios' && ScreenOrientation?.unlockAsync) {
        // On iOS, unlock orientation when entering VideoPlayer to allow landscape
        ScreenOrientation.unlockAsync().catch(() => {
          // Ignore errors
        });
      }

      // Return cleanup function to lock back to portrait when leaving
      return () => {
        if (Platform.OS === 'ios' && ScreenOrientation?.lockAsync) {
          // Lock back to portrait when leaving VideoPlayer on iOS
          ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT).catch(() => {
            // Ignore errors
          });
        }
      };
    }, [])
  );

  // Keep statusRef in sync with state
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    // Respect app default orientation (portrait). Do not force landscape on mount.
    StatusBar.setHidden(false);

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBack);

    // Listen for dimension changes
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });

    return () => {
      StatusBar.setHidden(false);
      backHandler.remove();
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }

      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    if (showControls && !status.isPlaying) {
      resetControlsTimeout();
    }
  }, [showControls, status.isPlaying]);

  // Load saved progress on mount
  useEffect(() => {
    loadProgress();
    return () => {
      // Save progress on unmount
      if (statusRef.current.positionMillis && statusRef.current.durationMillis) {
        saveProgress(statusRef.current.positionMillis, statusRef.current.durationMillis);
      }
      if (progressSaveInterval.current) {
        clearInterval(progressSaveInterval.current);
      }
    };
  }, []);

  // Auto-save progress every 30 seconds
  useEffect(() => {
    if (status.isPlaying) {
      if (!progressSaveInterval.current) {
        progressSaveInterval.current = setInterval(() => {
          // Use the latest status values from the ref
          const currentStatus = statusRef.current;
          if (currentStatus.positionMillis && currentStatus.durationMillis) {
            saveProgress(currentStatus.positionMillis, currentStatus.durationMillis);
          }
        }, 30000); // Save every 30 seconds
      }
    } else {
      if (progressSaveInterval.current) {
        clearInterval(progressSaveInterval.current);
        progressSaveInterval.current = null;
      }
    }
    
    return () => {
      if (progressSaveInterval.current) {
        clearInterval(progressSaveInterval.current);
        progressSaveInterval.current = null;
      }
    };
  }, [status.isPlaying]);

  // Handle autoplay and resume when video loads
  useEffect(() => {
    console.log('[VideoPlayerScreen] Autoplay effect running:', {
      isLoaded: status.isLoaded,
      hasResumed,
      shouldAutoplay,
      videoRefExists: !!videoRef.current,
    });
    
    if (!status.isLoaded || hasResumed) {
      console.log('[VideoPlayerScreen] Autoplay effect early return - isLoaded:', status.isLoaded, 'hasResumed:', hasResumed);
      return;
    }
    
    const setupAndAutoplay = async () => {
      console.log('[VideoPlayerScreen] setupAndAutoplay started');
      // Resume from saved position (only once)
      if (status.durationMillis && videoRef.current) {
        const savedPosition = await loadProgress();
        if (savedPosition > 0) {
          try {
            videoRef.current.seek(savedPosition / 1000);
            console.log('Resumed playback from:', formatTime(savedPosition));
          } catch (error) {
            console.error('Error resuming playback:', error);
          }
        }
      }
      console.log('[VideoPlayerScreen] Setting hasResumed to true');
      setHasResumed(true);
      
      // Auto-play after loading - directly control video instead of through state
      if (shouldAutoplay) {
        console.log('[VideoPlayerScreen] Auto-playing after load, videoRef methods:', {
          hasPlayAsync: !!videoRef.current?.playAsync,
          hasPlay: !!videoRef.current?.play,
        });
        try {
          // Use videoRef to directly play, which will trigger onPlaybackStatusUpdate
          if (videoRef.current?.playAsync) {
            console.log('[VideoPlayerScreen] Calling playAsync()');
            await videoRef.current.playAsync();
            console.log('[VideoPlayerScreen] playAsync() completed');
          } else if (videoRef.current?.play) {
            // For web video element
            console.log('[VideoPlayerScreen] Calling play()');
            await videoRef.current.play();
            console.log('[VideoPlayerScreen] play() completed');
          } else {
            console.log('[VideoPlayerScreen] No play method available on videoRef');
          }
        } catch (error) {
          console.error('[VideoPlayerScreen] Error playing video:', error);
        }
      } else {
        console.log('[VideoPlayerScreen] shouldAutoplay is false, skipping autoplay');
      }
    };
    
    setupAndAutoplay();
  }, [status.isLoaded, hasResumed]);

  const getProgressKey = () => {
    return `progress_${contentType}_${contentId}`;
  };

  const loadProgress = async () => {
    if (!contentId || !user) return;
    
    try {
      // Try to load from Firestore first
      const progressDoc = await getDoc(doc(firestore, 'users', user.uid, 'progress', contentId));
      
      if (progressDoc.exists()) {
        const data = progressDoc.data();
        const { position, duration, completed } = data;
        
        // Only resume if not completed and progress is less than 90%
        if (!completed && position && duration && position / duration < 0.9) {
          console.log('Resuming from position:', position);
          // Resume will happen in playback status update
          return position;
        }
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
    return 0;
  };

  const saveProgress = async (position, duration) => {
    if (!contentId || !user || !position || !duration) return;
    
    // Don't save if position hasn't changed much
    if (Math.abs(position - lastSavedPosition.current) < 5000) return;
    
    lastSavedPosition.current = position;
    const progressPercent = position / duration;
    const completed = progressPercent >= 0.9;
    
    try {
      const progressData = {
        contentId,
        contentType,
        title,
        thumbnail,
        position,
        duration,
        progressPercent,
        completed,
        updatedAt: serverTimestamp(),
      };

      // Save to Firestore
      await setDoc(
        doc(firestore, 'users', user.uid, 'progress', contentId),
        progressData,
        { merge: true }
      );

      // Also save locally for offline access
      await AsyncStorage.setItem(getProgressKey(), JSON.stringify(progressData));
      
      console.log(`Progress saved: ${Math.round(progressPercent * 100)}%`, completed ? '(Completed)' : '');
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const resetControlsTimeout = () => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    controlsTimeout.current = setTimeout(() => {
      if (status.isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const handleBack = async () => {
    // If in fullscreen on mobile, exit fullscreen first instead of leaving the screen
    if (Platform.OS !== 'web' && isFullscreen && ScreenOrientation?.lockAsync) {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
      } catch (e) {
        // ignore
      }
      setIsFullscreen(false);
      StatusBar.setHidden(false);
      return true; // prevent navigation, we just exited fullscreen
    }
    navigation.goBack();
    return true;
  };

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    setHasResumed(false);
    setRetryKey(prev => prev + 1); // Force video component to remount
  };

  const togglePlayPause = async () => {
    console.log('[VideoPlayerScreen] togglePlayPause called, current isPlaying:', status.isPlaying, 'toggling to:', !status.isPlaying);
    setStatus(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleSeek = async (value) => {
    if (videoRef.current) {
      videoRef.current.seek(value / 1000);
    }
  };

  const skipForward = async () => {
    const newPosition = (status.positionMillis || 0) + 10000;
    if (videoRef.current) {
      videoRef.current.seek(Math.min(newPosition, status.durationMillis) / 1000);
    }
  };

  const skipBackward = async () => {
    const newPosition = (status.positionMillis || 0) - 10000;
    if (videoRef.current) {
      videoRef.current.seek(Math.max(newPosition, 0) / 1000);
    }
  };

  const formatTime = (millis) => {
    if (!millis || isNaN(millis) || !isFinite(millis)) {
      return '0:00';
    }
    
    const totalSeconds = Math.floor(millis / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlaybackStatusUpdate = useCallback(async (playbackStatus) => {
    // Just update the status and ref, don't trigger side effects here
    console.log('[VideoPlayerScreen] handlePlaybackStatusUpdate called with:', {
      isLoaded: playbackStatus.isLoaded,
      isPlaying: playbackStatus.isPlaying,
      positionMillis: playbackStatus.positionMillis,
      durationMillis: playbackStatus.durationMillis,
    });
    setStatus(playbackStatus);
    statusRef.current = playbackStatus;
  }, []);

  const toggleControls = () => {
    setShowControls(!showControls);
    if (!showControls) {
      resetControlsTimeout();
    }
  };

  const toggleFullscreen = async () => {
    if (Platform.OS === 'web') {
      // Web fullscreen API
      const elem = document.documentElement;
      if (!document.fullscreenElement) {
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        }
        setIsFullscreen(true);
        StatusBar.setHidden(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
        const unsubscribe = navigation.addListener('beforeRemove', async () => {
          // Restore portrait orientation and status bar when leaving the player
          if (Platform.OS !== 'web' && ScreenOrientation?.lockAsync) {
            try {
              await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
            } catch (e) {
              // ignore
            }
          }
          setIsFullscreen(false);
          StatusBar.setHidden(false);
        });
        return unsubscribe;
      }
    } else {
      // Mobile: Toggle between app default (portrait) and landscape when user taps fullscreen
      const currentOrientation = await ScreenOrientation.getOrientationAsync();
      if (
        currentOrientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
        currentOrientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT
      ) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
        setIsFullscreen(false);
        StatusBar.setHidden(false);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        setIsFullscreen(true);
        StatusBar.setHidden(true);
      }
    }
  };

  // Memoize source object to prevent unnecessary HLS reinitializations
  const source = useMemo(() => ({ uri: actualStreamUrl }), [actualStreamUrl]);

  // Memoize all WebVideo callbacks to prevent unnecessary re-renders
  const handleLoadStart = useCallback(() => {
    console.log('[VideoPlayerScreen] onLoadStart triggered, paused prop:', !status.isPlaying, 'isPlaying:', status.isPlaying);
    console.log('[VideoPlayerScreen] - URL being loaded:', actualStreamUrl);
    setIsLoading(true);
  }, [status.isPlaying, actualStreamUrl]);

  const handleLoad = useCallback((data) => {
    console.log('[VideoPlayerScreen] onLoad succeeded, Duration:', data.duration, 'status.isLoaded was:', status.isLoaded);
    setIsLoading(false);
    
    // Handle NaN or Infinity durations (common with HLS streams)
    const validDuration = (data.duration && isFinite(data.duration)) ? data.duration * 1000 : Infinity;
    
    // Only update essential state - don't call handlePlaybackStatusUpdate to avoid re-render loops
    setStatus(prev => ({
      ...prev,
      isLoaded: true,
      durationMillis: validDuration,
      isBuffering: false,
    }));
    
    // Set flag to trigger autoplay on next state update
    if (!hasResumed) {
      setShouldAutoplay(true);
    }
  }, [status.isLoaded, hasResumed]);

  const handleProgress = useCallback((data) => {
    // Only log periodically to avoid spam
    if (Math.floor(data.currentTime) % 5 === 0) {
      console.log('[VideoPlayerScreen] onProgress:', data.currentTime + 's / ' + data.seekableDuration + 's');
    }
    // Don't call handlePlaybackStatusUpdate here - it causes update cycles
    // Just update position directly to avoid re-renders affecting playback
    setStatus(prev => ({
      ...prev,
      positionMillis: data.currentTime * 1000,
      durationMillis: data.seekableDuration * 1000,
    }));
  }, []);

  const handleBuffer = useCallback(({ isBuffering }) => {
    console.log('[VideoPlayerScreen] onBuffer:', isBuffering);
    setIsBuffering(isBuffering);
  }, []);

  const handleEnd = useCallback(() => {
    console.log('Video ended');
    // Save completion and go back
    if (status.durationMillis) {
      saveProgress(status.durationMillis, status.durationMillis);
    }
    navigation.goBack();
  }, [status.durationMillis, navigation]);

  const handleError = useCallback((error) => {
    console.error('[VideoPlayerScreen] Playback error detected:');
    console.error('[VideoPlayerScreen] - Full error object:', error);
    
    let errorMsg = 'Failed to load video';
    
    // Better error message handling
    if (error?.code === 'MEDIA_ERR_ABORTED') {
      errorMsg = 'Playback was aborted';
    } else if (error?.code === 'MEDIA_ERR_NETWORK') {
      errorMsg = 'Network error occurred';
    } else if (error?.code === 'MEDIA_ERR_DECODE') {
      errorMsg = 'Failed to decode video';
    } else if (error?.code === 'MEDIA_ERR_SRC_NOT_SUPPORTED') {
      errorMsg = 'Video format not supported';
    }
    
    setError(errorMsg);
  }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.videoContainer} 
        activeOpacity={1}
        onPress={toggleControls}
      >
        {Platform.OS === 'web' ? (
          <WebVideo
            key={retryKey}
            ref={videoRef}
            source={source}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            paused={!status.isPlaying}
            onLoadStart={handleLoadStart}
            onLoad={handleLoad}
            onProgress={handleProgress}
            onBuffer={handleBuffer}
            onEnd={handleEnd}
            onError={handleError}
          />
        ) : (
          <Video
            key={retryKey}
            ref={videoRef}
            source={{ uri: actualStreamUrl }}
            style={styles.video}
            resizeMode="contain"
            paused={!status.isPlaying}
            controls={false}
            playInBackground={false}
            playWhenInactive={false}
            ignoreSilentSwitch="ignore"
            progressUpdateInterval={1000}
            rate={1}
            volume={1}
            bufferConfig={{
              minBufferMs: 2500,
              maxBufferMs: 30000,
              bufferForPlaybackMs: 2500,
              bufferForPlaybackAfterRebufferMs: 5000,
            }}
            onLoadStart={() => {
              console.log('[VideoPlayerScreen] onLoadStart triggered');
              console.log('[VideoPlayerScreen] - URL being loaded:', actualStreamUrl);
              setIsLoading(true);
            }}
            onLoad={(data) => {
              console.log('[VideoPlayerScreen] onLoad succeeded');
              console.log('[VideoPlayerScreen] - Duration:', data.duration);
              console.log('[VideoPlayerScreen] - Width:', data.width, 'Height:', data.height);
              setIsLoading(false);
              handlePlaybackStatusUpdate({
                isLoaded: true,
                isPlaying: false,
                positionMillis: 0,
                durationMillis: data.duration * 1000,
                isBuffering: false,
              });
            }}
            onProgress={(data) => {
              // Only log periodically to avoid spam
              if (Math.floor(data.currentTime) % 5 === 0) {
                console.log('[VideoPlayerScreen] onProgress:', data.currentTime + 's / ' + data.seekableDuration + 's');
              }
              // Don't call handlePlaybackStatusUpdate here - it causes update cycles
              // Just update position directly to avoid re-renders affecting playback
              setStatus(prev => ({
                ...prev,
                positionMillis: data.currentTime * 1000,
                durationMillis: data.seekableDuration * 1000,
              }));
            }}
            onBuffer={({ isBuffering }) => {
              console.log('[VideoPlayerScreen] onBuffer:', isBuffering);
              setIsBuffering(isBuffering);
            }}
            onEnd={() => {
              console.log('Video ended');
              // Save completion and go back
              (async () => {
                if (status.durationMillis) {
                  await saveProgress(status.durationMillis, status.durationMillis);
                }
                // Restore portrait and exit fullscreen before navigation
                if (Platform.OS !== 'web' && ScreenOrientation?.lockAsync) {
                  try {
                    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
                  } catch (e) {
                    // ignore
                  }
                }
                setIsFullscreen(false);
                StatusBar.setHidden(false);
                handlePlaybackStatusUpdate({
                  isLoaded: true,
                  didJustFinish: true,
                  durationMillis: status.durationMillis,
                });
                navigation.goBack();
              })();
              
              // Auto-play next episode if available
              if (nextEpisode && contentType === 'episode') {
                setTimeout(() => {
                  navigation.replace('VideoPlayer', {
                    streamUrl: nextEpisode.streamUrl || nextEpisode.stream_url,
                    title: `${title.split(' - ')[0]} - S${nextEpisode.seasonNumber}E${nextEpisode.episodeNumber}`,
                    contentType: 'episode',
                    contentId: nextEpisode.id,
                    seriesId: seriesId,
                    seasonNumber: nextEpisode.seasonNumber,
                    episodeNumber: nextEpisode.episodeNumber,
                    thumbnail: nextEpisode.thumbnail || thumbnail,
                  });
                }, 500);
              }
            }}
            onError={(error) => {
              console.error('[VideoPlayerScreen] Playback error detected:');
              console.error('[VideoPlayerScreen] - Full error object:', error);
              console.error('[VideoPlayerScreen] - Error code:', error?.code);
              console.error('[VideoPlayerScreen] - Error message:', error?.message);
              
              let errorMsg = 'Failed to load video';
              
              // Parse error details
              if (error.error) {
                const errStr = error.error.errorString || error.error.localizedDescription || '';
                console.error('[VideoPlayerScreen] - Error string:', errStr);
                
                if (errStr.includes('BAD_HTTP_STATUS') || errStr.includes('403') || errStr.includes('401')) {
                  errorMsg = 'Stream requires authentication or is blocked. This stream may need login credentials.';
                } else if (errStr.includes('404')) {
                  errorMsg = 'Stream not found (404). The URL may be expired or invalid.';
                } else if (errStr.includes('NETWORK')) {
                  errorMsg = 'Network error. Check your internet connection.';
                } else if (errStr.includes('TIMEOUT')) {
                  errorMsg = 'Connection timeout. The stream server is not responding.';
                } else if (errStr.includes('SOURCE')) {
                  errorMsg = 'Invalid stream format. The video format may not be supported.';
                } else {
                  errorMsg = `Playback error: ${errStr}`;
                }
              }
              
              console.error('[VideoPlayerScreen] Final error message:', errorMsg);
              setError(errorMsg);
              setIsLoading(false);
            }}
          />
        )}

        {(isLoading || isBuffering) && !error && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>
              {isLoading ? 'Loading...' : 'Buffering...'}
            </Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <View style={styles.errorContent}>
              <Ionicons name="alert-circle-outline" size={64} color="#ff4444" />
              <Text style={styles.errorTitle}>Playback Error</Text>
              <Text style={styles.errorMessage}>{error}</Text>
              <Text style={styles.errorHint}>
                {error.includes('CORS_BLOCKED_ON_LOCALHOST')
                  ? '🌐 LOCALHOST LIMITATION: Videos are blocked by browser CORS policy. This is normal! Install the mobile APK to test video playback - it works perfectly on mobile devices.'
                  : error.includes('authentication') || error.includes('blocked') 
                  ? 'This IPTV stream requires login credentials. Try using an Xtream Codes playlist with username/password instead of M3U URLs.'
                  : error.includes('404') || error.includes('expired')
                  ? 'The stream URL may have expired. Try re-importing your playlist or use a different source.'
                  : 'This stream may be offline, geo-blocked, or temporarily unavailable. Try another movie or channel.'}
              </Text>
              <View style={styles.errorButtons}>
                <TouchableOpacity 
                  style={[styles.errorButton, styles.retryButton]}
                  onPress={handleRetry}
                >
                  <Ionicons name="reload" size={20} color="#fff" />
                  <Text style={styles.errorButtonText}>Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.errorButton}
                  onPress={handleBack}
                >
                  <Ionicons name="arrow-back" size={20} color="#fff" />
                  <Text style={styles.errorButtonText}>Go Back</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {showControls && (
          <>
            <LinearGradient
              colors={['rgba(0,0,0,0.8)', 'transparent']}
              style={styles.topGradient}
            >
              <View style={styles.topControls}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title} numberOfLines={1}>
                  {title || 'Video Player'}
                </Text>
                <View style={styles.placeholder} />
              </View>
            </LinearGradient>

            <View style={styles.centerControls}>
              <TouchableOpacity onPress={skipBackward} style={styles.controlButton}>
                <Ionicons name="play-back" size={40} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity onPress={togglePlayPause} style={styles.playButton}>
                <Ionicons 
                  name={status.isPlaying ? 'pause' : 'play'} 
                  size={50} 
                  color="#fff" 
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={skipForward} style={styles.controlButton}>
                <Ionicons name="play-forward" size={40} color="#fff" />
              </TouchableOpacity>
            </View>

            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.bottomGradient}
            >
              <View style={styles.bottomControls}>
                <View style={styles.progressContainer}>
                  <Text style={styles.timeText}>
                    {formatTime(status.positionMillis || 0)}
                  </Text>
                  <View style={styles.sliderContainer}>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { 
                            width: `${((status.positionMillis || 0) / (status.durationMillis || 1)) * 100}%` 
                          }
                        ]} 
                      />
                    </View>
                  </View>
                  <Text style={styles.timeText}>
                    {formatTime(status.durationMillis || 0)}
                  </Text>
                </View>

                <View style={styles.extraControls}>
                  <TouchableOpacity style={styles.iconButton}>
                    <Ionicons name="settings-outline" size={24} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconButton} onPress={toggleFullscreen}>
                    <Ionicons 
                      name={isFullscreen ? "contract-outline" : "expand-outline"} 
                      size={24} 
                      color="#fff" 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  errorContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
    maxWidth: 500,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  errorMessage: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  errorHint: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  errorButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  errorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e50914',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  backButton: {
    padding: 10,
  },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  placeholder: {
    width: 48,
  },
  centerControls: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  controlButton: {
    padding: 15,
  },
  playButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 50,
    padding: 20,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 15,
    paddingBottom: Platform.OS === 'ios' ? 30 : 15,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sliderContainer: {
    flex: 1,
    marginHorizontal: 10,
    justifyContent: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E50914',
    borderRadius: 2,
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  extraControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 15,
  },
  iconButton: {
    padding: 5,
  },
});
