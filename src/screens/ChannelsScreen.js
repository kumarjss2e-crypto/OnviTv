/**
 * Channels Screen - Progressive Loading UI
 * Displays live TV channels with real-time ingestion progress
 * Integrated with ingestion manager and Zustand stores
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useParsingState, useContentState } from '../state';
import { ingestionManager } from '../services/ingestion';
import { getChannelsByPlaylist } from '../services/channelService';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const CARD_WIDTH = (width - 32) / COLUMN_COUNT;

/**
 * Progress Bar Component
 */
const ProgressBar = ({ progress, itemsSaved, itemsTotal, state, eta }) => {
  if (state !== 'parsing') return null;

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressTitle}>Loading Channels...</Text>
        <Text style={styles.progressStats}>
          {itemsSaved}/{itemsTotal} items
        </Text>
      </View>

      <View style={styles.progressBarBackground}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${progress}%`,
            },
          ]}
        />
      </View>

      <View style={styles.progressFooter}>
        <Text style={styles.progressPercentage}>{progress}%</Text>
        {eta > 0 && (
          <Text style={styles.progressETA}>
            ETA: {Math.ceil(eta / 1000)}s
          </Text>
        )}
      </View>
    </View>
  );
};

/**
 * Channel Card Component
 */
const ChannelCard = ({ channel, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(channel)}
      activeOpacity={0.7}
    >
      {channel.logo ? (
        <Image
          source={{ uri: channel.logo }}
          style={styles.cardImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
          <Ionicons name="tv" size={32} color={colors.primary} />
        </View>
      )}
      <Text style={styles.cardTitle} numberOfLines={2}>
        {channel.name}
      </Text>
      {channel.groupTitle && (
        <Text style={styles.cardCategory} numberOfLines={1}>
          {channel.groupTitle}
        </Text>
      )}
    </TouchableOpacity>
  );
};

/**
 * Channels Screen Component
 */
const ChannelsScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { progress, parsingState, itemsSaved, itemsTotal, eta } = useParsingState();
  const { playlists, selectedPlaylistId, setFilterType } = useContentState();

  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredChannels, setFilteredChannels] = useState([]);
  const loadingRef = useRef(false);

  // Extract playlist ID from route or use selected
  const playlistId = route?.params?.playlistId || selectedPlaylistId;

  /**
   * Load channels from storage
   */
  const loadChannels = useCallback(async () => {
    if (!playlistId || loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      console.log(`[ChannelsScreen] Loading channels for playlist: ${playlistId}`);

      const result = await getChannelsByPlaylist(playlistId);

      if (result.success) {
        setChannels(result.data || []);
        console.log(`[ChannelsScreen] ✓ Loaded ${result.data.length} channels`);
      } else {
        console.error(`[ChannelsScreen] ✗ Failed to load channels:`, result.error);
        Alert.alert('Error', 'Failed to load channels');
      }
    } catch (error) {
      console.error(`[ChannelsScreen] ✗ Error loading channels:`, error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [playlistId]);

  /**
   * Filter channels by search query
   */
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredChannels(channels);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredChannels(
        channels.filter(
          (ch) =>
            ch.name.toLowerCase().includes(query) ||
            (ch.groupTitle && ch.groupTitle.toLowerCase().includes(query))
        )
      );
    }
  }, [channels, searchQuery]);

  /**
   * Load channels on mount and when playlist changes
   */
  useEffect(() => {
    loadChannels();

    // Set content type filter
    setFilterType('channel');
  }, [playlistId, loadChannels, setFilterType]);

  /**
   * Reload when parsing completes
   */
  useEffect(() => {
    if (parsingState === 'completed') {
      console.log(`[ChannelsScreen] Parsing completed, reloading channels...`);
      setTimeout(() => loadChannels(), 500); // Small delay for storage to update
    }
  }, [parsingState, loadChannels]);

  /**
   * Handle channel selection
   */
  const handleChannelPress = (channel) => {
    console.log(`[ChannelsScreen] Selected channel:`, channel.name);

    navigation.navigate('VideoPlayer', {
      streamUrl: channel.url,
      title: channel.name,
      contentType: 'channel',
      contentId: channel.id,
      thumbnail: channel.logo,
    });
  };

  /**
   * Render empty state
   */
  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyText}>Loading channels...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="tv" size={48} color={colors.text.secondary} />
        <Text style={styles.emptyText}>No channels available</Text>
        <Text style={styles.emptySubtext}>
          Add a playlist to get started
        </Text>
      </View>
    );
  };

  /**
   * Render channel card
   */
  const renderChannelCard = ({ item }) => (
    <ChannelCard channel={item} onPress={handleChannelPress} />
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live Channels</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Ionicons name="close" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <ProgressBar
        progress={progress}
        itemsSaved={itemsSaved}
        itemsTotal={itemsTotal}
        state={parsingState}
        eta={eta}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.text.secondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search channels..."
          placeholderTextColor={colors.text.secondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Channels Grid or Empty State */}
      {filteredChannels.length > 0 && !loading ? (
        <FlatList
          data={filteredChannels}
          renderItem={renderChannelCard}
          keyExtractor={(item) => item.id}
          numColumns={COLUMN_COUNT}
          columnWrapperStyle={styles.columnWrapper}
          scrollEnabled={Platform.OS !== 'web'}
          nestedScrollEnabled={Platform.OS === 'web'}
          ListFooterComponent={<View style={{ height: insets.bottom + 20 }} />}
          contentContainerStyle={styles.gridContent}
        />
      ) : (
        renderEmptyState()
      )}

      {/* Result Counter */}
      {!loading && filteredChannels.length > 0 && (
        <View style={[styles.resultCounter, { bottom: insets.bottom + 10 }]}>
          <Text style={styles.resultCounterText}>
            {filteredChannels.length} channel{filteredChannels.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },

  headerButton: {
    padding: 8,
  },

  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  progressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },

  progressStats: {
    fontSize: 12,
    color: colors.text.secondary,
  },

  progressBarBackground: {
    height: 6,
    backgroundColor: colors.background.tertiary,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },

  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },

  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  progressPercentage: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },

  progressETA: {
    fontSize: 12,
    color: colors.text.secondary,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background.secondary,
    marginTop: 0,
  },

  searchInput: {
    flex: 1,
    marginHorizontal: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.background.tertiary,
    color: colors.text.primary,
    borderRadius: 6,
    fontSize: 14,
  },

  gridContent: {
    paddingHorizontal: 8,
    paddingVertical: 12,
  },

  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  card: {
    width: CARD_WIDTH,
    marginHorizontal: 4,
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.background.secondary,
  },

  cardImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.background.tertiary,
  },

  cardImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
    paddingHorizontal: 8,
    paddingTop: 8,
  },

  cardCategory: {
    fontSize: 10,
    color: colors.text.secondary,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    textAlign: 'center',
  },

  emptySubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },

  resultCounter: {
    position: 'absolute',
    right: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.primary,
    borderRadius: 16,
  },

  resultCounterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.background.primary,
  },
});

export default ChannelsScreen;
