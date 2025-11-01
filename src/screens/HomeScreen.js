import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { getUserChannels } from '../services/channelService';
import { getUserMovies, getRecentMovies } from '../services/movieService';
import { getUserSeries, getRecentSeries } from '../services/seriesService';
import { getContinueWatching } from '../services/watchHistoryService';
import { getUserFavorites } from '../services/favoritesService';
import { getUserPlaylists } from '../services/playlistService';
import { firestore } from '../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const { width, height } = Dimensions.get('window');

// No sample data - using real Firebase data

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [scrollY, setScrollY] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [continueWatching, setContinueWatching] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [recentMovies, setRecentMovies] = useState([]);
  const [recentSeries, setRecentSeries] = useState([]);
  const [liveChannels, setLiveChannels] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [hasContent, setHasContent] = useState(false);
  const lastRefreshRef = useRef(0);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(firestore, 'playlists'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, () => {
      const now = Date.now();
      if (now - (lastRefreshRef.current || 0) < 1500) return;
      lastRefreshRef.current = now;
      loadData();
    });
    return () => unsub();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('Loading data for userId:', user.uid);

      // Load all data in parallel
      const [continueResult, favoritesResult, moviesResult, seriesResult, channelsResult, playlistsResult] = await Promise.all([
        getContinueWatching(user.uid),
        getUserFavorites(user.uid),
        getRecentMovies(user.uid, 10),
        getRecentSeries(user.uid, 10),
        getUserChannels(user.uid),
        getUserPlaylists(user.uid),
      ]);

      if (continueResult.success) setContinueWatching(continueResult.data);
      if (favoritesResult.success) setFavorites(favoritesResult.data);
      if (moviesResult.success) setRecentMovies(moviesResult.data);
      if (seriesResult.success) setRecentSeries(seriesResult.data);
      if (channelsResult.success) setLiveChannels(channelsResult.data.slice(0, 10));
      if (playlistsResult.success) setPlaylists(playlistsResult.data);

      // Debug logging
      console.log('Home data loaded:', {
        continueWatching: continueResult.data?.length || 0,
        favorites: favoritesResult.data?.length || 0,
        movies: moviesResult.data?.length || 0,
        series: seriesResult.data?.length || 0,
        channels: channelsResult.data?.length || 0,
        playlists: playlistsResult.data?.length || 0,
      });

      // Log errors if any
      if (!moviesResult.success) console.error('Movies error:', moviesResult.error);
      if (!seriesResult.success) console.error('Series error:', seriesResult.error);
      if (!channelsResult.success) console.error('Channels error:', channelsResult.error);

      // Check if user has any content
      const hasAnyContent = 
        (continueResult.data && continueResult.data.length > 0) ||
        (favoritesResult.data && favoritesResult.data.length > 0) ||
        (moviesResult.data && moviesResult.data.length > 0) ||
        (seriesResult.data && seriesResult.data.length > 0) ||
        (channelsResult.data && channelsResult.data.length > 0) ||
        (playlistsResult.data && playlistsResult.data.length > 0);
      
      setHasContent(hasAnyContent);
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleScroll = (event) => {
    setScrollY(event.nativeEvent.contentOffset.y);
  };

  const headerOpacity = Math.min(scrollY / 300, 1);

  const renderContentItem = ({ item }) => {
    const imageUri = item.metadata?.poster || item.poster || item.logo || null;
    const title = item.metadata?.name || item.name || 'Untitled';
    
    const handlePress = () => {
      // Navigate to player or details based on content type
      console.log('Content item clicked:', title);
      // TODO: Navigate to player when implemented
      // navigation.navigate('Player', { item });
    };
    
    return (
      <TouchableOpacity style={styles.contentCard} activeOpacity={0.8} onPress={handlePress}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.contentPoster} />
        ) : (
          <View style={[styles.contentPoster, styles.placeholderPoster]}>
            <Ionicons name="tv-outline" size={32} color={colors.text.muted} />
          </View>
        )}
        <Text style={styles.contentTitle} numberOfLines={2}>{title}</Text>
      </TouchableOpacity>
    );
  };

  const renderChannelItem = ({ item }) => {
    const imageUri = item.logo || null;
    const title = item.name || 'Untitled';
    
    const handlePress = () => {
      console.log('Channel clicked:', title);
      // TODO: Navigate to player when implemented
      // navigation.navigate('Player', { item, type: 'channel' });
    };
    
    return (
      <TouchableOpacity style={styles.channelCard} activeOpacity={0.8} onPress={handlePress}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.channelLogo} />
        ) : (
          <View style={[styles.channelLogo, styles.placeholderLogo]}>
            <Ionicons name="radio-outline" size={28} color={colors.text.muted} />
          </View>
        )}
        <Text style={styles.channelName} numberOfLines={1}>{title}</Text>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="tv-outline" size={64} color={colors.text.muted} />
      </View>
      <Text style={styles.emptyTitle}>No Playlists Yet</Text>
      <Text style={styles.emptyDescription}>
        {playlists.length === 0 
          ? 'Add your first M3U or Xtream playlist to start watching thousands of channels, movies, and series'
          : 'Your playlists are loading content. This may take a few moments.'}
      </Text>
      <TouchableOpacity 
        style={styles.addPlaylistButton}
        onPress={() => navigation.navigate('AddPlaylist')}
      >
        <Ionicons name="add-circle-outline" size={20} color={colors.text.primary} style={styles.addIcon} />
        <Text style={styles.addPlaylistText}>Add Playlist</Text>
      </TouchableOpacity>
      {playlists.length > 0 && (
        <TouchableOpacity 
          style={styles.managePlaylistsButton}
          onPress={() => navigation.navigate('PlaylistManagement')}
        >
          <Text style={styles.managePlaylistsText}>Manage Playlists</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.purple} />
        <Text style={styles.loadingText}>Loading your content...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: `rgba(15, 23, 42, ${headerOpacity})` }]}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={onRefresh}
            disabled={refreshing}
          >
            <Ionicons 
              name="refresh-outline" 
              size={22} 
              color={refreshing ? colors.text.muted : colors.text.primary} 
              style={refreshing ? styles.spinning : null}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="search-outline" size={22} color={colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="person-circle-outline" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary.purple}
            colors={[colors.primary.purple]}
          />
        }
      >
        {!hasContent ? (
          renderEmptyState()
        ) : (
          <View style={styles.contentContainer}>
            {/* Continue Watching */}
            {continueWatching.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Continue Watching</Text>
                <FlatList
                  data={continueWatching}
                  renderItem={renderContentItem}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.contentList}
                />
              </View>
            )}

            {/* My Favorites */}
            {favorites.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>My Favorites</Text>
                <FlatList
                  data={favorites}
                  renderItem={renderContentItem}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.contentList}
                />
              </View>
            )}

            {/* Live TV Channels */}
            {liveChannels.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Live TV</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('LiveTV')}>
                    <Text style={styles.seeAllText}>See All</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={liveChannels}
                  renderItem={renderChannelItem}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.contentList}
                />
              </View>
            )}

            {/* Recent Movies */}
            {recentMovies.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Movies</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Movies')}>
                    <Text style={styles.seeAllText}>See All</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={recentMovies}
                  renderItem={renderContentItem}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.contentList}
                />
              </View>
            )}

            {/* Recent Series */}
            {recentSeries.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>TV Series</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Movies')}>
                    <Text style={styles.seeAllText}>See All</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={recentSeries}
                  renderItem={renderContentItem}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.contentList}
                />
              </View>
            )}

            {/* Playlists Summary */}
            {playlists.length > 0 && (
              <View style={styles.playlistsSection}>
                <Text style={styles.sectionTitle}>My Playlists</Text>
                <View style={styles.playlistsGrid}>
                  {playlists.map((playlist) => (
                    <TouchableOpacity
                      key={playlist.id}
                      style={styles.playlistCard}
                      activeOpacity={0.8}
                      onPress={() => navigation.navigate('EditPlaylist', { playlist })}
                    >
                      <View style={styles.playlistIconContainer}>
                        <Ionicons 
                          name={playlist.type === 'm3u' ? 'document-text-outline' : 'globe-outline'} 
                          size={28} 
                          color={colors.primary.purple} 
                        />
                      </View>
                      <Text style={styles.playlistName} numberOfLines={1}>
                        {playlist.name}
                      </Text>
                      <Text style={styles.playlistStats}>
                        {(playlist.stats?.totalChannels || 0) + (playlist.stats?.totalMovies || 0) + (playlist.stats?.totalSeries || 0)} items
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.slate900,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    zIndex: 100,
  },
  logo: {
    width: 100,
    height: 35,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral.slate900,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.text.secondary,
  },
  contentContainer: {
    paddingTop: 70,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 13,
    color: colors.primary.purple,
    fontWeight: '500',
  },
  contentList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  contentCard: {
    width: 120,
    marginRight: 0,
  },
  contentPoster: {
    width: 120,
    height: 170,
    borderRadius: 8,
    backgroundColor: colors.neutral.slate800,
  },
  contentTitle: {
    marginTop: 6,
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  placeholderPoster: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelCard: {
    width: 100,
    alignItems: 'center',
    marginRight: 0,
  },
  channelLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.neutral.slate800,
  },
  placeholderLogo: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelName: {
    marginTop: 8,
    fontSize: 11,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 21,
  },
  addPlaylistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.purple,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addIcon: {
    marginRight: 4,
  },
  addPlaylistText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  managePlaylistsButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  managePlaylistsText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary.purple,
  },
  playlistsSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  playlistsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  playlistCard: {
    width: (width - 44) / 2,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
  },
  playlistIconContainer: {
    marginBottom: 12,
  },
  playlistName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  playlistStats: {
    fontSize: 12,
    color: colors.text.muted,
  },
});

export default HomeScreen;
