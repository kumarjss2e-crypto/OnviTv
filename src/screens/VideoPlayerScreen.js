import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { useFreeUserAds } from '../hooks/subscriptionHooks';
import { showRewardAd } from '../services/admobService';

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
const WebVideo = ({ source, onPlaybackStatusUpdate, videoRef }) => {
  const webVideoRef = useRef(null);
  
  useEffect(() => {
    if (!webVideoRef.current) return;
    
    // Only try to use HLS if available and source is HLS
    if (!Hls || !source?.uri || !source.uri.includes('.m3u8')) {
      return; // Use native video element fallback
    }
    
    try {
      const video = webVideoRef.current;
      const hls = new Hls();
      hls.loadSource(source.uri);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {
          // Autoplay may be blocked by browser
        });
      });
      return () => {
        hls.destroy();
      };
    } catch (err) {
      console.warn('HLS initialization error:', err);
    }
  }, [source?.uri]);
  
  return (
    <video
      ref={webVideoRef}
      src={source?.uri}
      controls
      style={{ width: '100%', height: '100%', backgroundColor: 'black' }}
    />
  );
};

export default function VideoPlayerScreen({ route, navigation }) {
  const { streamUrl, title, contentType, contentId, thumbnail, nextEpisode, seriesId, seasonNumber, episodeNumber } = route.params;
  const { user } = useAuth();
  const { needsAdToWatch, handleAdComplete, canStreamWithoutAd } = useFreeUserAds();
  
  // Test stream URL for debugging (remove this later)
  const testStreamUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
  const actualStreamUrl = streamUrl || testStreamUrl;
  
  console.log('VideoPlayer - Stream URL:', actualStreamUrl);
  console.log('VideoPlayer - Title:', title);
  
  const videoRef = useRef(null);
  const [status, setStatus] = useState({});
  const statusRef = useRef({}); // Store latest status without causing re-renders
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
  const controlsTimeout = useRef(null);
  const progressSaveInterval = useRef(null);
  const lastSavedPosition = useRef(0);

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

      // Unlock orientation on unmount (no-op if not locked)
      if (Platform.OS !== 'web' && ScreenOrientation?.unlockAsync) {
        ScreenOrientation.unlockAsync();
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
      if (status.positionMillis && status.durationMillis) {
        saveProgress(status.positionMillis, status.durationMillis);
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
    // Check if free user needs to watch ad
    if (needsAdToWatch && !status.isPlaying) {
      const adHandled = await handleAdRequired();
      if (!adHandled) {
        // Ad couldn't be shown, don't play
        return;
      }
    }
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

  // Handle showing ad for free users
  const handleAdRequired = useCallback(async () => {
    if (needsAdToWatch) {
      console.log('Showing reward ad before video playback');
      setShowAdScreen(true);
      setIsWatchingAd(true);
      
      // Show the reward ad
      const adShown = await showRewardAd(
        (reward) => {
          console.log('Reward earned:', reward);
          handleAdComplete();
          setShowAdScreen(false);
          setIsWatchingAd(false);
          // Resume video playback
          if (videoRef.current) {
            videoRef.current.playAsync?.();
          }
        },
        () => {
          console.log('Ad closed without completing');
          setShowAdScreen(false);
          setIsWatchingAd(false);
          // Allow them to continue anyway
          if (videoRef.current) {
            videoRef.current.playAsync?.();
          }
        },
        (error) => {
          console.error('Ad failed to load:', error);
          setShowAdScreen(false);
          setIsWatchingAd(false);
          // Allow them to continue without ad if it fails
          if (videoRef.current) {
            videoRef.current.playAsync?.();
          }
        }
      );

      return adShown;
    }
    return true;
  }, [needsAdToWatch, handleAdComplete]);

  const handlePlaybackStatusUpdate = useCallback(async (playbackStatus) => {
    // Update both state and ref
    setStatus(playbackStatus);
    statusRef.current = playbackStatus;
    
    if (playbackStatus.isLoaded) {
      setIsLoading(false);
      setIsBuffering(playbackStatus.isBuffering);
      setError(null); // Clear any previous errors
      
      // Resume from saved position (only once)
      if (!hasResumed && playbackStatus.durationMillis && videoRef.current) {
        const savedPosition = await loadProgress();
        if (savedPosition > 0) {
          try {
            videoRef.current.seek(savedPosition / 1000);
            console.log('Resumed playback from:', formatTime(savedPosition));
          } catch (error) {
            console.error('Error resuming playback:', error);
          }
        }
        setHasResumed(true);
        // Auto-play after resuming
        setStatus(prev => ({ ...prev, isPlaying: true }));
      }
      
      if (playbackStatus.didJustFinish) {
        // Mark as completed before going back
        if (playbackStatus.durationMillis) {
          await saveProgress(playbackStatus.durationMillis, playbackStatus.durationMillis);
        }
        navigation.goBack();
      }
    } else if (playbackStatus.error) {
      console.error('Playback error:', playbackStatus.error);
      setIsLoading(false);
      setError(playbackStatus.error);
    }
  }, [hasResumed, navigation]);

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
            source={{ uri: actualStreamUrl }}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            videoRef={videoRef}
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
            onLoadStart={() => {
              console.log('Video loading started:', actualStreamUrl);
              setIsLoading(true);
            }}
            onLoad={(data) => {
              console.log('Video loaded successfully:', data);
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
              handlePlaybackStatusUpdate({
                isLoaded: true,
                isPlaying: !status.paused,
                positionMillis: data.currentTime * 1000,
                durationMillis: data.seekableDuration * 1000,
                isBuffering: false,
              });
            }}
            onBuffer={({ isBuffering }) => {
              console.log('Video buffering:', isBuffering);
              setIsBuffering(isBuffering);
            }}
            onEnd={() => {
              console.log('Video ended');
              // Restore portrait and exit fullscreen before navigation
              (async () => {
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
              console.error('Video playback error:', error);
              let errorMsg = 'Failed to load video';
              
              // Parse error details
              if (error.error) {
                const errStr = error.error.errorString || error.error.localizedDescription || '';
                
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
