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
  FlatList,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { firestore } from '../config/firebase';
import { getSeriesEpisodes } from '../services/seriesService';
import { addToFavorites, isFavorited as checkFavorited, removeFavoriteByContentId } from '../services/favoritesService';
import { getSeriesInfo } from '../services/xtreamAPI';
import { enrichContentWithMetadata, getSeasonEpisodes } from '../services/metadataService';

const { width, height } = Dimensions.get('window');

const SeriesDetailScreen = ({ route, navigation }) => {
  const { series: initialSeries } = route.params;
  const { user } = useAuth();
  const safeAreaInsets = Platform.OS === 'web' ? { bottom: 0, top: 0, left: 0, right: 0 } : useSafeAreaInsets();
  const insets = safeAreaInsets;
  const [series, setSeries] = useState(initialSeries);
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);

  useEffect(() => {
    enrichSeriesMetadata();
    checkIfFavorited();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadEpisodes(selectedSeason);
    }
  }, [selectedSeason, loading]);

  const enrichSeriesMetadata = async () => {
    try {
      setLoading(true);
      // Try to enrich with TMDb metadata if not already enriched
      if (!series.tmdbId) {
        console.log('Enriching series metadata for:', series.title || series.name);
        const enriched = await enrichContentWithMetadata(series, 'series');
        if (enriched && enriched.tmdbId) {
          console.log('Series enriched with TMDb ID:', enriched.tmdbId);
          setSeries(enriched);
        }
      }
      // Load episodes after enrichment
      await loadEpisodes(selectedSeason);
    } catch (error) {
      console.error('Error enriching series metadata:', error);
      await loadEpisodes(selectedSeason);
    } finally {
      setLoading(false);
    }
  };

  const checkIfFavorited = async () => {
    try {
      if (!user) return;
      const result = await checkFavorited(user.uid, series.id);
      if (result.success) {
        setIsFavorited(result.isFavorited);
      }
    } catch (error) {
      console.error('Error checking favorite:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEpisodes = async (seasonNumber) => {
    try {
      setLoadingEpisodes(true);
      
      // Try to get episodes from Firebase/M3U first (they have stream URLs)
      let firebaseEpisodes = [];
      
      console.log('Series object:', { 
        id: series.id, 
        hasEpisodeInfo: !!series.episodeInfo,
        episodeInfo: series.episodeInfo,
        streamUrl: series.streamUrl 
      });
      
      // First try to get from episodes collection
      const result = await getSeriesEpisodes(series.id, seasonNumber);
      console.log('Episodes from collection:', result);
      if (result.success && result.data.length > 0) {
        firebaseEpisodes = result.data;
      } else if (series.episodeInfo && series.episodeInfo.seriesName) {
        // For M3U playlists, episodes might be stored as separate series entries
        console.log('Trying M3U episode format for:', series.episodeInfo.seriesName);
        const { collection: firestoreCollection, query: firestoreQuery, where, getDocs } = await import('firebase/firestore');
        const { firestore } = await import('../config/firebase');
        
        const seriesRef = firestoreCollection(firestore, 'series');
        const q = firestoreQuery(
          seriesRef,
          where('playlistId', '==', series.playlistId)
        );
        const snapshot = await getDocs(q);
        
        const m3uEpisodes = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.episodeInfo && data.episodeInfo.seriesName === series.episodeInfo.seriesName) {
            if (data.episodeInfo.seasonNumber === seasonNumber) {
              m3uEpisodes.push({
                id: doc.id,
                seasonNumber: data.episodeInfo.seasonNumber,
                episodeNumber: data.episodeInfo.episodeNumber,
                title: data.name || data.title,
                name: data.name || data.title,
                streamUrl: data.streamUrl,
                thumbnail: data.logo || data.poster,
                description: '',
              });
            }
          }
        });
        
        m3uEpisodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
        firebaseEpisodes = m3uEpisodes;
      }
      
      // If we have TMDb ID, enrich episodes with metadata
      if (series.tmdbId && firebaseEpisodes.length > 0) {
        console.log('Enriching episodes with TMDb metadata for season:', seasonNumber);
        const tmdbEpisodes = await getSeasonEpisodes(series.tmdbId, seasonNumber);
        
        if (tmdbEpisodes && tmdbEpisodes.length > 0) {
          // Merge TMDb metadata with Firebase stream URLs
          const enrichedEpisodes = firebaseEpisodes.map(fbEp => {
            const tmdbEp = tmdbEpisodes.find(t => t.episodeNumber === fbEp.episodeNumber);
            if (tmdbEp) {
              return {
                ...fbEp,
                title: tmdbEp.title || fbEp.title,
                plot: tmdbEp.plot || fbEp.description,
                description: tmdbEp.plot || fbEp.description,
                thumbnail: tmdbEp.thumbnail || fbEp.thumbnail,
                rating: tmdbEp.rating,
                airDate: tmdbEp.airDate,
                runtime: tmdbEp.runtime,
              };
            }
            return fbEp;
          });
          setEpisodes(enrichedEpisodes);
          setLoadingEpisodes(false);
          return;
        }
      }
      
      // If we have episodes from Firebase, use them
      if (firebaseEpisodes.length > 0) {
        setEpisodes(firebaseEpisodes);
        setLoadingEpisodes(false);
        return;
      }
      
      // If no Firebase episodes but we have TMDb ID, use TMDb episodes with series stream URL
      if (series.tmdbId && firebaseEpisodes.length === 0) {
        console.log('No Firebase episodes found. Using TMDb episodes with series stream URL as fallback');
        const tmdbEpisodes = await getSeasonEpisodes(series.tmdbId, seasonNumber);
        
        if (tmdbEpisodes && tmdbEpisodes.length > 0) {
          // Use TMDb episodes but add the series stream URL to each episode
          const episodesWithStreamUrl = tmdbEpisodes.map(ep => ({
            ...ep,
            streamUrl: series.streamUrl, // Use series stream URL for all episodes
            id: `${series.id}_s${seasonNumber}e${ep.episodeNumber}`,
          }));
          console.log(`Using ${episodesWithStreamUrl.length} TMDb episodes with series stream URL`);
          setEpisodes(episodesWithStreamUrl);
          setLoadingEpisodes(false);
          return;
        }
      }
      
      // Check if series has Xtream credentials (from Xtream API)
      if (series.xtreamServer && series.xtreamUsername && series.xtreamPassword && series.seriesId) {
        console.log('Fetching episodes from Xtream API for series:', series.seriesId);
        const result = await getSeriesInfo(
          series.xtreamServer,
          series.xtreamUsername,
          series.xtreamPassword,
          series.seriesId
        );
        
        if (result.success) {
          // Filter episodes by season
          const seasonEpisodes = result.episodes.filter(ep => ep.seasonNumber === seasonNumber);
          setEpisodes(seasonEpisodes);
          
          // Update total seasons if not set
          if (!series.totalSeasons && result.totalSeasons) {
            series.totalSeasons = result.totalSeasons;
          }
        } else {
          console.error('Failed to fetch episodes from Xtream:', result.error);
        }
      } else {
        console.log('No episodes found for series');
      }
    } catch (error) {
      console.error('Error loading episodes:', error);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  const toggleFavorite = async () => {
    try {
      if (!user) return;
      
      if (isFavorited) {
        const result = await removeFavoriteByContentId(user.uid, series.id, 'series');
        if (result.success) {
          setIsFavorited(false);
        }
      } else {
        const result = await addToFavorites(user.uid, {
          contentType: 'series',
          contentId: series.id,
          playlistId: series.playlistId || '',
          name: series.title || series.name,
          poster: series.poster || series.cover,
          streamUrl: '',
        });
        if (result.success) {
          setIsFavorited(true);
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handlePlayEpisode = (episode) => {
    navigation.navigate('VideoPlayer', {
      streamUrl: episode.streamUrl || episode.stream_url,
      title: `${series.title || series.name} - S${episode.seasonNumber}E${episode.episodeNumber}`,
      contentType: 'episode',
      contentId: episode.id,
      seriesId: series.id,
      seasonNumber: episode.seasonNumber,
      episodeNumber: episode.episodeNumber,
      thumbnail: episode.thumbnail || series.poster || series.cover,
      nextEpisode: getNextEpisode(episode),
    });
  };

  const getNextEpisode = (currentEpisode) => {
    const currentIndex = episodes.findIndex(ep => ep.id === currentEpisode.id);
    if (currentIndex !== -1 && currentIndex < episodes.length - 1) {
      return episodes[currentIndex + 1];
    }
    return null;
  };

  const backdropUri = series.backdrop || series.poster || series.cover;
  const posterUri = series.poster || series.cover;
  const title = series.title || series.name || 'Untitled';
  const year = series.year || series.releaseDate?.split('-')[0] || '';
  const rating = series.rating || series.vote_average || '';
  const description = series.description || series.plot || series.overview || 'No description available.';
  const genres = series.genre ? (Array.isArray(series.genre) ? series.genre : series.genre.split(',').map(g => g.trim())) : [];
  
  // Get number of seasons from series data or episodes
  const totalSeasons = series.totalSeasons || series.seasons || 1;
  const seasonNumbers = Array.from({ length: totalSeasons }, (_, i) => i + 1);

  const renderEpisodeCard = ({ item: episode }) => {
    const episodeTitle = episode.title || episode.name || `Episode ${episode.episodeNumber}`;
    const episodeThumbnail = episode.thumbnail || episode.cover || posterUri;
    
    return (
      <TouchableOpacity 
        style={styles.episodeCard}
        onPress={() => handlePlayEpisode(episode)}
        activeOpacity={0.8}
      >
        <View style={styles.episodeThumbnailContainer}>
          {episodeThumbnail ? (
            <Image source={{ uri: episodeThumbnail }} style={styles.episodeThumbnail} />
          ) : (
            <View style={[styles.episodeThumbnail, styles.episodePlaceholder]}>
              <Ionicons name="play-circle-outline" size={40} color={colors.text.muted} />
            </View>
          )}
          <View style={styles.episodePlayOverlay}>
            <Ionicons name="play-circle" size={50} color="rgba(255,255,255,0.9)" />
          </View>
        </View>
        
        <View style={styles.episodeInfo}>
          <View style={styles.episodeHeader}>
            <Text style={styles.episodeNumber}>E{episode.episodeNumber}</Text>
            {episode.duration && (
              <Text style={styles.episodeDuration}>{episode.duration} min</Text>
            )}
          </View>
          <Text style={styles.episodeTitle} numberOfLines={2}>{episodeTitle}</Text>
          {episode.description && (
            <Text style={styles.episodeDescription} numberOfLines={2}>
              {episode.description}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Backdrop with gradient */}
      <View style={styles.backdropContainer}>
        {backdropUri ? (
          <Image source={{ uri: backdropUri }} style={styles.backdrop} />
        ) : (
          <View style={[styles.backdrop, styles.backdropPlaceholder]}>
            <Ionicons name="tv-outline" size={80} color={colors.text.muted} />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)', colors.background.primary]}
          style={styles.backdropGradient}
        />
      </View>

      {/* Back button */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 + insets.bottom }}>
        {/* Content */}
        <View style={styles.content}>
          {/* Poster and info */}
          <View style={styles.headerSection}>
            <View style={styles.posterContainer}>
              {posterUri ? (
                <Image source={{ uri: posterUri }} style={styles.poster} />
              ) : (
                <View style={[styles.poster, styles.posterPlaceholder]}>
                  <Ionicons name="tv-outline" size={50} color={colors.text.muted} />
                </View>
              )}
            </View>

            <View style={styles.infoContainer}>
              <Text style={styles.title}>{title}</Text>
              
              <View style={styles.metaRow}>
                {year && <Text style={styles.metaText}>{year}</Text>}
                {rating && (
                  <>
                    {year && <Text style={styles.metaDivider}>•</Text>}
                    <View style={styles.ratingContainer}>
                      <Ionicons name="star" size={14} color={colors.accent.yellow} />
                      <Text style={styles.metaText}> {rating}</Text>
                    </View>
                  </>
                )}
                {totalSeasons && (
                  <>
                    <Text style={styles.metaDivider}>•</Text>
                    <Text style={styles.metaText}>{totalSeasons} Season{totalSeasons > 1 ? 's' : ''}</Text>
                  </>
                )}
              </View>

              {/* Genre tags */}
              {genres.length > 0 && (
                <View style={styles.genreContainer}>
                  {genres.slice(0, 3).map((genre, index) => (
                    <View key={index} style={styles.genreTag}>
                      <Text style={styles.genreText}>{genre}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.favoriteButton}
              onPress={toggleFavorite}
              disabled={loading}
            >
              <Ionicons 
                name={isFavorited ? "heart" : "heart-outline"} 
                size={24} 
                color={isFavorited ? colors.accent.red : colors.text.primary} 
              />
              <Text style={styles.actionButtonText}>
                {isFavorited ? 'Favorited' : 'Favorite'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareButton}>
              <Ionicons name="share-social-outline" size={24} color={colors.text.primary} />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{description}</Text>
          </View>

          {/* Play button for series without episodes */}
          {!loadingEpisodes && episodes.length === 0 && series.streamUrl && (
            <View style={styles.section}>
              <TouchableOpacity 
                style={styles.playSeriesButton}
                onPress={() => {
                  navigation.navigate('VideoPlayer', {
                    streamUrl: series.streamUrl,
                    title: title,
                    contentType: 'series',
                    contentId: series.id,
                  });
                }}
              >
                <Ionicons name="play-circle" size={32} color="#fff" />
                <Text style={styles.playSeriesButtonText}>Play Series</Text>
              </TouchableOpacity>
              <Text style={styles.noEpisodesText}>
                This is a 24/7 channel. Individual episodes are not available.
              </Text>
            </View>
          )}

          {/* Season selector and Episodes */}
          {episodes.length > 0 && (
            <>
              <View style={styles.section}>
                <View style={styles.seasonHeader}>
                  <Text style={styles.sectionTitle}>Episodes</Text>
                  <TouchableOpacity 
                    style={styles.seasonSelector}
                    onPress={() => setShowSeasonDropdown(!showSeasonDropdown)}
                  >
                    <Text style={styles.seasonSelectorText}>Season {selectedSeason}</Text>
                    <Ionicons 
                      name={showSeasonDropdown ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color={colors.text.primary} 
                    />
                  </TouchableOpacity>
                </View>

                {/* Season dropdown */}
                {showSeasonDropdown && (
                  <View style={styles.seasonDropdown}>
                    {seasonNumbers.map((seasonNum) => (
                      <TouchableOpacity
                        key={seasonNum}
                        style={[
                          styles.seasonOption,
                          selectedSeason === seasonNum && styles.seasonOptionSelected
                        ]}
                        onPress={() => {
                          setSelectedSeason(seasonNum);
                          setShowSeasonDropdown(false);
                        }}
                      >
                        <Text style={[
                          styles.seasonOptionText,
                          selectedSeason === seasonNum && styles.seasonOptionTextSelected
                        ]}>
                          Season {seasonNum}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Episodes list */}
              {loadingEpisodes ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : (
                <View style={styles.episodesList}>
                  {episodes.map((episode) => (
                    <View key={episode.id}>
                      {renderEpisodeCard({ item: episode })}
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  backdropContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.4,
  },
  backdrop: {
    width: '100%',
    height: '100%',
  },
  backdropPlaceholder: {
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    marginTop: height * 0.25,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerSection: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  posterContainer: {
    marginRight: 15,
  },
  poster: {
    width: 120,
    height: 180,
    borderRadius: 8,
  },
  posterPlaceholder: {
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  metaDivider: {
    fontSize: 14,
    color: colors.text.muted,
    marginHorizontal: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  genreTag: {
    backgroundColor: colors.background.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  genreText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  favoriteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: colors.text.primary,
    marginLeft: 8,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  playSeriesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.purple,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  playSeriesButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
  },
  noEpisodesText: {
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  seasonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seasonSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  seasonSelectorText: {
    fontSize: 14,
    color: colors.text.primary,
    marginRight: 8,
    fontWeight: '600',
  },
  seasonDropdown: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  seasonOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.primary,
  },
  seasonOptionSelected: {
    backgroundColor: colors.primary + '20',
  },
  seasonOptionText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  seasonOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  episodesList: {
    marginTop: 8,
  },
  episodeCard: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  episodeThumbnailContainer: {
    width: 160,
    height: 90,
    position: 'relative',
  },
  episodeThumbnail: {
    width: '100%',
    height: '100%',
  },
  episodePlaceholder: {
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodePlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  episodeInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  episodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  episodeNumber: {
    fontSize: 12,
    color: colors.text.muted,
    fontWeight: '600',
  },
  episodeDuration: {
    fontSize: 12,
    color: colors.text.muted,
  },
  episodeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  episodeDescription: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.muted,
    marginTop: 12,
  },
});

export default SeriesDetailScreen;


