import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { getUserFavorites, removeFromFavorites } from '../services/favoritesService';
import CustomAlert from '../components/CustomAlert';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 3; // 3 columns with padding
const CARD_HEIGHT = CARD_WIDTH * 1.5;

const TABS = ['All', 'Channels', 'Movies', 'Series'];
const SORT_OPTIONS = [
  { key: 'recent', label: 'Recently Added' },
  { key: 'az', label: 'A → Z' },
  { key: 'rating', label: 'Rating' },
];

export default function FavoritesScreen({ navigation }) {
  const { user } = useAuth();
  const safeAreaInsets = Platform.OS === 'web' ? { bottom: 0, top: 0, left: 0, right: 0 } : useSafeAreaInsets();
  const insets = safeAreaInsets;
  const [activeTab, setActiveTab] = useState('All');
  const [sortKey, setSortKey] = useState('recent');
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFavorites();
  }, [user]);

  const loadFavorites = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const result = await getUserFavorites(user.uid);
      if (result.success) {
        setFavorites(result.data || []);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  };

  const handleRemoveFavorite = (item) => {
    CustomAlert.alert(
      'Remove from Favorites',
      `Remove "${item.title || item.name}" from your favorites?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await removeFromFavorites(user.uid, item.id, item.contentType);
              if (result.success) {
                setFavorites(prev => prev.filter(fav => fav.id !== item.id));
              }
            } catch (error) {
              console.error('Error removing favorite:', error);
              CustomAlert.alert('Error', 'Failed to remove from favorites');
            }
          },
        },
      ]
    );
  };

  const handleItemPress = (item) => {
    if (item.contentType === 'channel') {
      navigation.navigate('VideoPlayer', {
        streamUrl: item.streamUrl || item.stream_url,
        title: item.name || item.title,
        contentType: 'channel',
        contentId: item.id,
        thumbnail: item.logo || item.poster,
      });
    } else if (item.contentType === 'movie') {
      navigation.navigate('MovieDetail', { movie: item });
    } else if (item.contentType === 'series') {
      navigation.navigate('SeriesDetail', { series: item });
    }
  };

  const filteredAndSorted = useMemo(() => {
    let filtered = [...favorites];

    // Filter by tab
    if (activeTab !== 'All') {
      const type = activeTab.toLowerCase().slice(0, -1); // Remove 's' from end
      filtered = filtered.filter(item => item.contentType === type);
    }

    // Sort
    switch (sortKey) {
      case 'az':
        filtered.sort((a, b) => {
          const titleA = (a.title || a.name || '').toLowerCase();
          const titleB = (b.title || b.name || '').toLowerCase();
          return titleA.localeCompare(titleB);
        });
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'recent':
      default:
        filtered.sort((a, b) => {
          const timeA = a.favoritedAt?.seconds || 0;
          const timeB = b.favoritedAt?.seconds || 0;
          return timeB - timeA;
        });
        break;
    }

    return filtered;
  }, [favorites, activeTab, sortKey]);

  const renderFavoriteCard = ({ item }) => {
    const title = item.title || item.name;
    const poster = item.poster || item.logo;
    const year = item.year;
    const rating = item.rating;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.cardImageContainer}>
          {poster ? (
            <Image
              source={{ uri: poster }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.cardImage, styles.placeholderImage]}>
              <Ionicons
                name={
                  item.contentType === 'channel'
                    ? 'tv-outline'
                    : item.contentType === 'movie'
                    ? 'film-outline'
                    : 'play-circle-outline'
                }
                size={32}
                color={colors.text.tertiary}
              />
            </View>
          )}
          
          {/* Remove button */}
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveFavorite(item)}
          >
            <Ionicons name="heart" size={20} color={colors.accent.red} />
          </TouchableOpacity>

          {/* Type badge */}
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {item.contentType?.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.cardMeta}>
            {year && <Text style={styles.cardYear}>{year}</Text>}
            {rating && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={10} color={colors.accent.yellow} />
                <Text style={styles.cardRating}>{rating}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="heart-outline" size={64} color={colors.text.tertiary} />
      <Text style={styles.emptyTitle}>No Favorites Yet</Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'All'
          ? 'Start adding your favorite channels, movies, and series'
          : `No favorite ${activeTab.toLowerCase()} yet`}
      </Text>
      <TouchableOpacity
        style={styles.exploreButton}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.exploreButtonText}>Explore Content</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Favorites</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          <Ionicons
            name="refresh-outline"
            size={22}
            color={refreshing ? colors.text.tertiary : colors.text.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        {SORT_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[styles.sortChip, sortKey === option.key && styles.activeSortChip]}
            onPress={() => setSortKey(option.key)}
          >
            <Text
              style={[
                styles.sortChipText,
                sortKey === option.key && styles.activeSortChipText,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results count */}
      {!loading && filteredAndSorted.length > 0 && (
        <View style={styles.countContainer}>
          <Text style={styles.countText}>
            {filteredAndSorted.length} {filteredAndSorted.length === 1 ? 'item' : 'items'}
          </Text>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.red} />
          <Text style={styles.loadingText}>Loading favorites...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAndSorted}
          renderItem={renderFavoriteCard}
          keyExtractor={(item) => `${item.contentType}-${item.id}`}
          numColumns={3}
          contentContainerStyle={[styles.listContent, { paddingBottom: 20 + insets.bottom }]}
          ListEmptyComponent={renderEmptyState}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 12,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.slate700,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  refreshButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.slate700,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: colors.neutral.slate800,
  },
  activeTab: {
    backgroundColor: colors.accent.red,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  activeTabText: {
    color: colors.text.primary,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background.secondary,
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginRight: 12,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: colors.neutral.slate800,
  },
  activeSortChip: {
    backgroundColor: colors.primary.purple,
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  activeSortChipText: {
    color: colors.text.primary,
  },
  countContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.background.secondary,
  },
  countText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  listContent: {
    padding: 12,
  },
  card: {
    width: CARD_WIDTH,
    marginBottom: 16,
    marginHorizontal: 4,
  },
  cardImageContainer: {
    position: 'relative',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 8,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.neutral.slate800,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.primary,
  },
  cardInfo: {
    marginTop: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardYear: {
    fontSize: 12,
    color: colors.text.secondary,
    marginRight: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardRating: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text.secondary,
    fontSize: 16,
    marginTop: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: colors.accent.red,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
});

