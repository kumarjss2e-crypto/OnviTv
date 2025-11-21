import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { firestore } from '../config/firebase';
import { startDownload, isDownloaded, getDownloadByContentId } from '../services/downloadService';
import { addToFavorites, isFavorited as checkFavorited, removeFavoriteByContentId } from '../services/favoritesService';

const { width, height } = Dimensions.get('window');

const MovieDetailScreen = ({ route, navigation }) => {
  const { movie } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDownloadedState, setIsDownloadedState] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    checkIfFavorited();
    checkIfDownloaded();
    
    // Set up listener for download status changes
    const interval = setInterval(() => {
      if (isDownloading) {
        checkDownloadStatus();
      }
    }, 2000); // Check every 2 seconds
    
    return () => clearInterval(interval);
  }, [isDownloading]);
  
  const checkDownloadStatus = async () => {
    try {
      if (!user) return;
      const downloadCheck = await getDownloadByContentId(user.uid, movie.id);
      if (downloadCheck.success && downloadCheck.download) {
        const download = downloadCheck.download;
        if (download.status === 'completed') {
          setIsDownloading(false);
          setIsDownloadedState(true);
        } else if (download.status === 'failed' || download.status === 'cancelled') {
          setIsDownloading(false);
        } else if (download.progress) {
          setDownloadProgress(download.progress);
        }
      } else {
        // Download not found, reset state
        setIsDownloading(false);
      }
    } catch (error) {
      console.error('Error checking download status:', error);
    }
  };

  const checkIfFavorited = async () => {
    try {
      if (!user) return;
      const result = await checkFavorited(user.uid, movie.id);
      if (result.success) {
        setIsFavorited(result.isFavorited);
      }
    } catch (error) {
      console.error('Error checking favorite:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkIfDownloaded = async () => {
    try {
      if (!user) return;
      const result = await isDownloaded(user.uid, movie.id);
      if (result.success) {
        setIsDownloadedState(result.isDownloaded);
      }
    } catch (error) {
      console.error('Error checking download:', error);
    }
  };

  const handleDownload = async () => {
    if (isDownloadedState) {
      // Navigate to downloads screen
      navigation.navigate('Downloads');
      return;
    }

    if (isDownloading) return;

    try {
      setIsDownloading(true);
      const result = await startDownload(user.uid, {
        contentType: 'movie',
        contentId: movie.id,
        title: title,
        streamUrl: movie.streamUrl || movie.stream_url,
        poster: posterUri,
        metadata: {
          year,
          rating,
          duration,
        },
      });

      if (result.success) {
        // Check if download is now in progress
        const downloadCheck = await getDownloadByContentId(user.uid, movie.id);
        if (downloadCheck.success && downloadCheck.download) {
          // Download started successfully - keep button in downloading state
          // Don't set isDownloading to false, let it show as downloading
          return;
        }
        setIsDownloadedState(true);
      }
    } catch (error) {
      console.error('Error starting download:', error);
      setIsDownloading(false);
    }
  };

  const toggleFavorite = async () => {
    try {
      if (!user) return;
      
      if (isFavorited) {
        const result = await removeFavoriteByContentId(user.uid, movie.id, 'movie');
        if (result.success) {
          setIsFavorited(false);
        }
      } else {
        const result = await addToFavorites(user.uid, {
          contentType: 'movie',
          contentId: movie.id,
          playlistId: movie.playlistId || '',
          name: movie.title || movie.name,
          poster: movie.poster || movie.cover,
          streamUrl: movie.streamUrl || movie.stream_url,
        });
        if (result.success) {
          setIsFavorited(true);
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handlePlay = () => {
    navigation.navigate('VideoPlayer', {
      streamUrl: movie.streamUrl || movie.stream_url,
      title: movie.title || movie.name,
      contentType: movie.type || 'movie',
      contentId: movie.id,
      thumbnail: movie.poster || movie.cover,
    });
  };

  const backdropUri = movie.backdrop || movie.poster || movie.cover;
  const posterUri = movie.poster || movie.cover;
  const title = movie.title || movie.name || 'Untitled';
  const year = movie.year || movie.releaseDate?.split('-')[0] || '';
  const rating = movie.rating || movie.vote_average || '';
  const duration = movie.duration || movie.runtime || '';
  const description = movie.description || movie.plot || movie.overview || 'No description available.';
  const genres = movie.genre ? (Array.isArray(movie.genre) ? movie.genre : movie.genre.split(',').map(g => g.trim())) : [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Backdrop with gradient */}
      <View style={styles.backdropContainer}>
        {backdropUri ? (
          <Image source={{ uri: backdropUri }} style={styles.backdrop} />
        ) : (
          <View style={[styles.backdrop, styles.backdropPlaceholder]}>
            <Ionicons name="film-outline" size={80} color={colors.text.muted} />
          </View>
        )}
        <LinearGradient
          colors={['transparent', colors.neutral.slate900]}
          style={styles.backdropGradient}
        />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleFavorite} style={styles.favoriteButton}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.text.primary} />
          ) : (
            <Ionicons
              name={isFavorited ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorited ? colors.accent.red : colors.text.primary}
            />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 + insets.bottom }}>
        <View style={styles.content}>
          {/* Poster and Info */}
          <View style={styles.mainInfo}>
            <View style={styles.posterContainer}>
              {posterUri ? (
                <Image source={{ uri: posterUri }} style={styles.poster} />
              ) : (
                <View style={[styles.poster, styles.posterPlaceholder]}>
                  <Ionicons name="film-outline" size={48} color={colors.text.muted} />
                </View>
              )}
            </View>

            <View style={styles.infoContainer}>
              <Text style={styles.title}>{title}</Text>
              
              <View style={styles.metadata}>
                {year && (
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={14} color={colors.text.muted} />
                    <Text style={styles.metaText}>{year}</Text>
                  </View>
                )}
                {rating && (
                  <View style={styles.metaItem}>
                    <Ionicons name="star" size={14} color={colors.primary.purple} />
                    <Text style={styles.metaText}>{rating}</Text>
                  </View>
                )}
                {duration && (
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={14} color={colors.text.muted} />
                    <Text style={styles.metaText}>{duration} min</Text>
                  </View>
                )}
              </View>

              {/* Genres */}
              {genres.length > 0 && (
                <View style={styles.genresContainer}>
                  {genres.slice(0, 3).map((genre, index) => (
                    <View key={index} style={styles.genreTag}>
                      <Text style={styles.genreText}>{genre}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.playButton} onPress={handlePlay}>
              <Ionicons name="play" size={24} color={colors.text.primary} />
              <Text style={styles.playButtonText}>Play Now</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, isDownloading && styles.downloadingButton]} 
              onPress={handleDownload} 
              disabled={isDownloading}
            >
              {isDownloading ? (
                <View style={styles.downloadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary.purple} />
                  {downloadProgress > 0 && (
                    <Text style={styles.downloadProgressText}>{Math.round(downloadProgress)}%</Text>
                  )}
                </View>
              ) : (
                <Ionicons 
                  name={isDownloadedState ? "checkmark-circle" : "download-outline"} 
                  size={24} 
                  color={isDownloadedState ? colors.primary.purple : colors.text.primary} 
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="share-outline" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{description}</Text>
          </View>

          {/* Cast & Crew (if available) */}
          {movie.cast && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cast</Text>
              <Text style={styles.castText}>{movie.cast}</Text>
            </View>
          )}

          {movie.director && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Director</Text>
              <Text style={styles.castText}>{movie.director}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.slate900,
  },
  backdropContainer: {
    width: width,
    height: height * 0.4,
    position: 'absolute',
    top: 0,
  },
  backdrop: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  backdropPlaceholder: {
    backgroundColor: colors.neutral.slate800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    marginTop: height * 0.3,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  mainInfo: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  posterContainer: {
    marginRight: 16,
  },
  poster: {
    width: 120,
    height: 180,
    borderRadius: 12,
    backgroundColor: colors.neutral.slate800,
  },
  posterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 12,
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: colors.text.muted,
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.neutral.slate800,
    borderRadius: 16,
  },
  genreText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  playButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary.purple,
    paddingVertical: 14,
    borderRadius: 12,
  },
  playButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.neutral.slate800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadingButton: {
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderWidth: 1,
    borderColor: colors.primary.purple,
  },
  downloadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadProgressText: {
    fontSize: 10,
    color: colors.primary.purple,
    fontWeight: '600',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.text.secondary,
  },
  castText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
});

export default MovieDetailScreen;
