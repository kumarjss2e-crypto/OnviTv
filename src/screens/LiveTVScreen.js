import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useAds } from '../context/AdContext';
import { getUserChannels } from '../services/channelService';
import { getEPGForChannel, getEPGByEpgChannelId } from '../services/epgService';
import { Timestamp } from 'firebase/firestore';
import ChannelCard from '../components/ChannelCard';
import WatchAdModal from '../components/WatchAdModal';
import { asyncLog } from '../utils/asyncLogger';

const LiveTVScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { isFreeTier } = useSubscription();
  const { showRewardedAdAndWait, adLoading } = useAds();
  const safeAreaInsets = Platform.OS === 'web' ? { bottom: 0, top: 0, left: 0, right: 0 } : useSafeAreaInsets();
  const insets = safeAreaInsets;
  const [channels, setChannels] = useState([]);
  const [filteredChannels, setFilteredChannels] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [epgByChannel, setEpgByChannel] = useState({});
  const [showAdModal, setShowAdModal] = useState(false);
  const [pendingPlayRequest, setPendingPlayRequest] = useState(null);

  useEffect(() => {
    if (user) {
      loadChannels();
      loadEPG();
    }
  }, [user]);

  const loadEPG = async () => {
    try {
      if (!channels || channels.length === 0) return;
      
      // Get EPG for next 6 hours
      const now = new Date();
      const end = new Date(now.getTime() + 6 * 60 * 60 * 1000);
      const startTs = Timestamp.fromDate(now);
      const endTs = Timestamp.fromDate(end);

      // Fetch EPG for all channels (limit to first 50 to avoid too many requests)
      const epgPromises = channels.slice(0, 50).map(async (ch) => {
        try {
          let items = [];
          const epg = await getEPGForChannel(ch.id, startTs, endTs);
          if (epg.success) items = epg.data || [];
          if ((!items || items.length === 0) && ch.epgChannelId) {
            const epg2 = await getEPGByEpgChannelId(ch.epgChannelId, startTs, endTs);
            if (epg2.success) items = epg2.data || [];
          }
          return { id: ch.id, items };
        } catch (e) {
          return { id: ch.id, items: [] };
        }
      });

      const results = await Promise.all(epgPromises);
      const epgMap = {};
      results.forEach(({ id, items }) => {
        epgMap[id] = items;
      });
      setEpgByChannel(epgMap);
    } catch (error) {
      asyncLog.error('LiveTVScreen: EPG load error', { error: error.message });
    }
  };

  // Reload EPG when channels change
  useEffect(() => {
    if (channels.length > 0) {
      loadEPG();
    }
  }, [channels]);

  useEffect(() => {
    filterChannels();
  }, [channels, selectedCategory, searchQuery]);

  const loadChannels = async () => {
    try {
      setLoading(true);
      const result = await getUserChannels(user.uid);
      
      if (result.success && result.data) {
        setChannels(result.data);
        
        // Extract unique categories
        const uniqueCategories = ['All', ...new Set(
          result.data
            .map(ch => ch.category || 'Uncategorized')
            .filter(Boolean)
        )];
        setCategories(uniqueCategories);
      }
    } catch (error) {
      asyncLog.error('LiveTVScreen: Channels load error', { error: error.message, userId: user.uid });
    } finally {
      setLoading(false);
    }
  };

  const filterChannels = () => {
    let filtered = channels;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(
        ch => (ch.category || 'Uncategorized') === selectedCategory
      );
    }

    

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ch =>
        ch.name?.toLowerCase().includes(query) ||
        ch.category?.toLowerCase().includes(query)
      );
    }

    setFilteredChannels(filtered);
  };

  const handleChannelPress = (channel) => {
    console.log('[LiveTVScreen] handleChannelPress called. isFreeTier:', isFreeTier);
    if (isFreeTier) {
      console.log('[LiveTVScreen] Free tier user, showing ad modal for channel');
      setPendingPlayRequest({
        streamUrl: channel.streamUrl,
        title: channel.name,
        contentType: 'channel',
        contentId: channel.id,
        thumbnail: channel.logo,
      });
      setShowAdModal(true);
    } else {
      console.log('[LiveTVScreen] Premium user, playing directly');
      navigation.navigate('VideoPlayer', {
        streamUrl: channel.streamUrl,
        title: channel.name,
        contentType: 'channel',
        contentId: channel.id,
        thumbnail: channel.logo,
      });
    }
  };

  const handleAdWatched = async () => {
    console.log('[LiveTVScreen] handleAdWatched called');
    const rewarded = await showRewardedAdAndWait();
    console.log('[LiveTVScreen] Rewarded ad result:', rewarded);
    if (rewarded && pendingPlayRequest) {
      // Close modal and navigate to video player
      setShowAdModal(false);
      setTimeout(() => {
        navigation.navigate('VideoPlayer', pendingPlayRequest);
      }, 300);
    }
  };

  const handleSkipAd = () => {
    console.log('[LiveTVScreen] handleSkipAd called');
    setShowAdModal(false);
    setPendingPlayRequest(null);
  };

  const handleCountdownComplete = () => {
    // Countdown finished, navigate to video player
    console.log('[LiveTVScreen] Countdown complete, navigating to video player');
    if (pendingPlayRequest) {
      setShowAdModal(false);
      setTimeout(() => {
        navigation.navigate('VideoPlayer', pendingPlayRequest);
      }, 300);
    }
  };

  const handleFavorite = (channel) => {
    console.log('Toggle favorite:', channel.name);
    // TODO: Implement favorite functionality
    if (favorites.includes(channel.id)) {
      setFavorites(favorites.filter(id => id !== channel.id));
    } else {
      setFavorites([...favorites, channel.id]);
    }
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'grid' ? 'list' : 'grid');
  };

  const renderCategoryTab = (category) => {
    const isSelected = category === selectedCategory;
    return (
      <TouchableOpacity
        key={category}
        style={[styles.categoryTab, isSelected && styles.categoryTabActive]}
        onPress={() => setSelectedCategory(category)}
        activeOpacity={0.7}
      >
        <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>
          {category}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderChannel = ({ item }) => (
    <ChannelCard
      channel={item}
      onPress={handleChannelPress}
      onFavorite={handleFavorite}
      isFavorited={favorites.includes(item.id)}
      viewMode={viewMode}
      epgData={epgByChannel[item.id] || []}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="tv-outline" size={64} color={colors.text.muted} />
      <Text style={styles.emptyTitle}>No Channels Found</Text>
      <Text style={styles.emptyDescription}>
        {searchQuery
          ? 'Try a different search term'
          : 'Add a playlist to start watching live TV channels'}
      </Text>
      {!searchQuery && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddPlaylist')}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.text.primary} />
          <Text style={styles.addButtonText}>Add Playlist</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.purple} />
        <Text style={styles.loadingText}>Loading channels...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live TV</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton} onPress={toggleViewMode}>
            <Ionicons
              name={viewMode === 'grid' ? 'list-outline' : 'grid-outline'}
              size={22}
              color={colors.text.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={colors.text.muted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search channels..."
          placeholderTextColor={colors.text.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color={colors.text.muted} />
          </TouchableOpacity>
        )}
      </View>

      

      {/* Category Tabs */}
      {categories.length > 1 && (
        <View style={styles.categoriesWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContent}
          >
            {categories.map(renderCategoryTab)}
          </ScrollView>
        </View>
      )}

      {/* Channels Grid/List */}
      <FlatList
        data={filteredChannels}
        renderItem={renderChannel}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode} // Force re-render when view mode changes
        columnWrapperStyle={viewMode === 'grid' ? styles.row : null}
        contentContainerStyle={[styles.listContent, { paddingBottom: 20 + insets.bottom }]}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
      
      {/* Watch Ad Modal for Free Tier Users */}
      <WatchAdModal
        visible={showAdModal}
        onClose={() => setShowAdModal(false)}
        onAdWatched={handleAdWatched}
        onSkip={handleSkipAd}
        onCountdownComplete={handleCountdownComplete}
        contentTitle={pendingPlayRequest?.title}
        isLoadingAd={adLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.slate900,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.neutral.slate900,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 50,
    paddingBottom: 16,
    backgroundColor: colors.neutral.slate900,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral.slate800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.slate800,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  categoriesWrapper: {
    marginBottom: 16,
    paddingVertical: 8,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  categoryTab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: colors.neutral.slate800,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryTabActive: {
    backgroundColor: colors.primary.purple,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  categoryTextActive: {
    color: colors.text.primary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary.purple,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
});

export default LiveTVScreen;

