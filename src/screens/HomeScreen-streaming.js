/**
 * HomeScreen with Real-Time Listeners (Streaming Parser Support)
 * Listens to Firestore subcollections for real-time content updates
 * Shows parsing progress indicator while content is being fetched
 */

import React, { useState, useEffect } from 'react';
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
  TextInput,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { 
  spacing, 
  fontSizes, 
  wp, 
  hp,
  isShortScreen,
  getResponsiveValue 
} from '../utils/responsive';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const CONTENT_TYPES = [
  { id: 'all', label: 'All', icon: 'grid-outline' },
  { id: 'livetv', label: 'Live TV', icon: 'tv-outline' },
  { id: 'movies', label: 'Movies', icon: 'film-outline' },
  { id: 'series', label: 'Series', icon: 'play-circle-outline' },
  { id: 'sports', label: 'Sports', icon: 'football-outline' },
  { id: 'channels', label: 'Channels', icon: 'radio-outline' },
];

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const safeAreaInsets = Platform.OS === 'web' ? { bottom: 0, top: 0, left: 0, right: 0 } : useSafeAreaInsets();
  const insets = safeAreaInsets;
  
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [allContent, setAllContent] = useState({
    channels: [],
    movies: [],
    series: [],
  });

  // Parsing progress tracking
  const [parsingPlaylists, setParsingPlaylists] = useState({});
  
  // Listener unsubscribe functions
  const [unsubscribers, setUnsubscribers] = useState([]);

  /**
   * Setup real-time listeners for user's playlists
   */
  useEffect(() => {
    if (!user) return;

    const setupListeners = async () => {
      try {
        setLoading(true);

        // Get user's playlists
        const playlistsQuery = query(
          collection(db, 'playlists'),
          where('userId', '==', user.uid)
        );

        const unsubPlaylistsList = onSnapshot(playlistsQuery, (snapshot) => {
          const playlists = [];
          snapshot.forEach(doc => {
            playlists.push({ id: doc.id, ...doc.data() });
          });

          // Setup listeners for each playlist's content
          setupContentListeners(playlists);

          // Setup progress listeners
          setupProgressListeners(playlists);
        });

        setUnsubscribers(prev => [...prev, unsubPlaylistsList]);

      } catch (error) {
        console.error('Error setting up listeners:', error);
      } finally {
        setLoading(false);
      }
    };

    setupListeners();

    // Cleanup listeners on unmount
    return () => {
      unsubscribers.forEach(unsub => {
        try {
          unsub();
        } catch (error) {
          console.error('Error unsubscribing:', error);
        }
      });
    };
  }, [user]);

  /**
   * Setup listeners for each playlist's content
   */
  const setupContentListeners = (playlists) => {
    const newUnsubscribers = [];

    playlists.forEach(playlist => {
      const contentTypes = ['channels', 'movies', 'series'];

      contentTypes.forEach(contentType => {
        try {
          const contentQuery = query(
            collection(db, `playlists/${playlist.id}/${contentType}`)
          );

          const unsub = onSnapshot(contentQuery, (snapshot) => {
            const items = [];
            snapshot.forEach(doc => {
              items.push({ id: doc.id, ...doc.data() });
            });

            // Update content
            setAllContent(prev => ({
              ...prev,
              [contentType]: items,
            }));

          }, (error) => {
            console.error(`Error listening to ${contentType}:`, error);
          });

          newUnsubscribers.push(unsub);

        } catch (error) {
          console.error(`Error setting up ${contentType} listener:`, error);
        }
      });
    });

    setUnsubscribers(newUnsubscribers);
  };

  /**
   * Setup progress listeners to show parsing status
   */
  const setupProgressListeners = (playlists) => {
    playlists.forEach(playlist => {
      try {
        const progressRef = doc(db, `playlists/${playlist.id}/meta/progress`);
        
        const unsub = onSnapshot(progressRef, (snapshot) => {
          if (snapshot.exists()) {
            const progress = snapshot.data();
            
            // Track which playlists are parsing
            setParsingPlaylists(prev => ({
              ...prev,
              [playlist.id]: {
                isParsing: progress.status === 'parsing',
                status: progress.status,
                channels: progress.channels || 0,
                movies: progress.movies || 0,
                series: progress.series || 0,
                error: progress.error,
              },
            }));
          }
        }, (error) => {
          console.error(`Error listening to progress for ${playlist.id}:`, error);
        });

        setUnsubscribers(prev => [...prev, unsub]);

      } catch (error) {
        console.error(`Error setting up progress listener:`, error);
      }
    });
  };

  /**
   * Filter content by selected type and search query
   */
  const getFilteredContent = () => {
    let items = [];

    const filterBySearch = (items) => {
      if (!searchQuery) return items;
      return items.filter(item => 
        (item.name || item.title || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    };

    switch (selectedType) {
      case 'all':
        items = [
          ...allContent.channels,
          ...allContent.movies,
          ...allContent.series,
        ];
        break;
      case 'livetv':
      case 'channels':
        items = allContent.channels;
        break;
      case 'movies':
        items = allContent.movies;
        break;
      case 'series':
        items = allContent.series;
        break;
      default:
        items = [];
    }

    return filterBySearch(items);
  };

  /**
   * Get active parsing status message
   */
  const getParsingStatus = () => {
    const parsingList = Object.values(parsingPlaylists).filter(p => p.isParsing);
    if (parsingList.length === 0) return null;

    const totalChannels = parsingList.reduce((sum, p) => sum + (p.channels || 0), 0);
    const totalMovies = parsingList.reduce((sum, p) => sum + (p.movies || 0), 0);
    const totalSeries = parsingList.reduce((sum, p) => sum + (p.series || 0), 0);

    return {
      count: parsingList.length,
      channels: totalChannels,
      movies: totalMovies,
      series: totalSeries,
    };
  };

  const filteredContent = getFilteredContent();
  const parsingStatus = getParsingStatus();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.neutral.slate900} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>OnviTV</Text>
          <Text style={styles.headerSubtitle}>Your IPTV Experience</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('PlaylistManagement')}
        >
          <Ionicons name="settings-outline" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Parsing Status Indicator */}
      {parsingStatus && (
        <View style={styles.parsingIndicator}>
          <ActivityIndicator size="small" color={colors.primary.purple} />
          <Text style={styles.parsingText}>
            Fetching content ({parsingStatus.channels + parsingStatus.movies + parsingStatus.series} items)
          </Text>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={colors.text.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search content..."
          placeholderTextColor={colors.text.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.text.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Content Type Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {CONTENT_TYPES.map(type => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.tab,
              selectedType === type.id && styles.tabActive,
            ]}
            onPress={() => setSelectedType(type.id)}
          >
            <Ionicons
              name={type.icon}
              size={18}
              color={selectedType === type.id ? colors.primary.purple : colors.text.muted}
            />
            <Text
              style={[
                styles.tabLabel,
                selectedType === type.id && styles.tabLabelActive,
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content List */}
      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.purple} />
            <Text style={styles.loadingText}>Loading content...</Text>
          </View>
        ) : filteredContent.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="inbox-outline" size={48} color={colors.text.muted} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No content found' : 'No playlists added yet'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                style={styles.addPlaylistButton}
                onPress={() => navigation.navigate('AddPlaylist')}
              >
                <Text style={styles.addPlaylistText}>Add Playlist</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {filteredContent.map((item, index) => (
              <TouchableOpacity
                key={item.id || index}
                style={styles.contentItem}
                onPress={() => {
                  // Navigate to playback screen
                  navigation.navigate('Player', {
                    item: item,
                  });
                }}
              >
                {item.logo || item.poster ? (
                  <Image
                    source={{ uri: item.logo || item.poster }}
                    style={styles.contentImage}
                  />
                ) : (
                  <View style={styles.contentImagePlaceholder}>
                    <Ionicons
                      name={
                        item.type === 'channel'
                          ? 'tv-outline'
                          : item.type === 'movie'
                          ? 'film-outline'
                          : 'play-circle-outline'
                      }
                      size={32}
                      color={colors.text.muted}
                    />
                  </View>
                )}
                <Text
                  style={styles.contentName}
                  numberOfLines={2}
                >
                  {item.name || item.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.slate800,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 4,
  },
  settingsButton: {
    padding: 8,
  },
  parsingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary.purple,
  },
  parsingText: {
    marginLeft: 8,
    fontSize: 13,
    color: colors.text.secondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 15,
    color: colors.text.primary,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  tabsContent: {
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: colors.primary.purple,
  },
  tabLabel: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.muted,
  },
  tabLabelActive: {
    color: colors.text.primary,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: colors.text.muted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  addPlaylistButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary.purple,
    borderRadius: 8,
  },
  addPlaylistText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  contentItem: {
    width: '48%',
    marginBottom: 16,
  },
  contentImage: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 8,
    backgroundColor: colors.neutral.slate800,
  },
  contentImagePlaceholder: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
  },
  contentName: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.secondary,
    lineHeight: 16,
  },
});

export default HomeScreen;
