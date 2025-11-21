import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { searchContent } from '../services/searchService';

export default function SearchScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({
    channels: [],
    movies: [],
    series: [],
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // all, channels, movies, series
  const [recentSearches, setRecentSearches] = useState([]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ channels: [], movies: [], series: [] });
      return;
    }

    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const performSearch = async (query) => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const results = await searchContent(user.uid, query.trim());
      setSearchResults(results);
      
      // Save to recent searches
      saveRecentSearch(query.trim());
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveRecentSearch = (query) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(q => q !== query);
      return [query, ...filtered].slice(0, 10); // Keep last 10
    });
  };

  const handleRecentSearchPress = (query) => {
    setSearchQuery(query);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
  };

  const handleResultPress = (item, type) => {
    if (type === 'channel') {
      navigation.navigate('VideoPlayer', {
        streamUrl: item.streamUrl || item.stream_url,
        title: item.name || item.title,
        contentType: 'channel',
        contentId: item.id,
        thumbnail: item.logo || item.poster,
      });
    } else if (type === 'movie') {
      navigation.navigate('MovieDetail', { movie: item });
    } else if (type === 'series') {
      navigation.navigate('SeriesDetail', { series: item });
    }
  };

  const getFilteredResults = () => {
    if (activeTab === 'all') {
      return [
        ...searchResults.channels.map(item => ({ ...item, type: 'channel' })),
        ...searchResults.movies.map(item => ({ ...item, type: 'movie' })),
        ...searchResults.series.map(item => ({ ...item, type: 'series' })),
      ];
    } else if (activeTab === 'channels') {
      return searchResults.channels.map(item => ({ ...item, type: 'channel' }));
    } else if (activeTab === 'movies') {
      return searchResults.movies.map(item => ({ ...item, type: 'movie' }));
    } else {
      return searchResults.series.map(item => ({ ...item, type: 'series' }));
    }
  };

  const getTotalResults = () => {
    return searchResults.channels.length + searchResults.movies.length + searchResults.series.length;
  };

  const renderSearchResult = ({ item }) => {
    const title = item.name || item.title;
    const poster = item.logo || item.poster;
    const year = item.year;
    const rating = item.rating;

    return (
      <TouchableOpacity
        style={styles.resultCard}
        onPress={() => handleResultPress(item, item.type)}
      >
        <Image
          source={{ uri: poster || 'https://via.placeholder.com/100x150?text=No+Image' }}
          style={styles.resultPoster}
          resizeMode="cover"
        />
        <View style={styles.resultInfo}>
          <Text style={styles.resultTitle} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.resultMeta}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {item.type.toUpperCase()}
              </Text>
            </View>
            {year && (
              <Text style={styles.resultYear}>{year}</Text>
            )}
            {rating && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={12} color={colors.accent.yellow} />
                <Text style={styles.resultRating}>{rating}</Text>
              </View>
            )}
          </View>
          {item.category && (
            <Text style={styles.resultCategory} numberOfLines={1}>
              {item.category}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
      </TouchableOpacity>
    );
  };

  const renderRecentSearch = ({ item }) => (
    <TouchableOpacity
      style={styles.recentSearchItem}
      onPress={() => handleRecentSearchPress(item)}
    >
      <Ionicons name="time-outline" size={20} color={colors.text.secondary} />
      <Text style={styles.recentSearchText}>{item}</Text>
      <TouchableOpacity
        onPress={() => setRecentSearches(prev => prev.filter(q => q !== item))}
      >
        <Ionicons name="close" size={20} color={colors.text.secondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    if (loading) return null;

    if (!searchQuery.trim()) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={64} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>Search for content</Text>
          <Text style={styles.emptySubtitle}>
            Find channels, movies, and series
          </Text>

          {recentSearches.length > 0 && (
            <View style={styles.recentSearchesContainer}>
              <View style={styles.recentSearchesHeader}>
                <Text style={styles.recentSearchesTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={clearRecentSearches}>
                  <Text style={styles.clearButton}>Clear All</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={recentSearches}
                renderItem={renderRecentSearch}
                keyExtractor={(item, index) => index.toString()}
                scrollEnabled={false}
              />
            </View>
          )}
        </View>
      );
    }

    if (getTotalResults() === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={64} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySubtitle}>
            Try searching with different keywords
          </Text>
        </View>
      );
    }

    return null;
  };

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
        
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.text.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search channels, movies, series..."
            placeholderTextColor={colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      {searchQuery.trim() && getTotalResults() > 0 && (
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.activeTab]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
              All ({getTotalResults()})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'channels' && styles.activeTab]}
            onPress={() => setActiveTab('channels')}
          >
            <Text style={[styles.tabText, activeTab === 'channels' && styles.activeTabText]}>
              Channels ({searchResults.channels.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'movies' && styles.activeTab]}
            onPress={() => setActiveTab('movies')}
          >
            <Text style={[styles.tabText, activeTab === 'movies' && styles.activeTabText]}>
              Movies ({searchResults.movies.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'series' && styles.activeTab]}
            onPress={() => setActiveTab('series')}
          >
            <Text style={[styles.tabText, activeTab === 'series' && styles.activeTabText]}>
              Series ({searchResults.series.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.red} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : (
        <FlatList
          data={getFilteredResults()}
          renderItem={renderSearchResult}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerStyle={[styles.resultsList, { paddingBottom: 20 + insets.bottom }]}
          ListEmptyComponent={renderEmptyState}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.slate700,
  },
  backButton: {
    marginRight: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.slate800,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 16,
    marginLeft: 8,
    marginRight: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.slate700,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
  },
  activeTab: {
    backgroundColor: colors.accent.red,
  },
  tabText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.text.primary,
  },
  resultsList: {
    padding: 16,
  },
  resultCard: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  resultPoster: {
    width: 60,
    height: 90,
    borderRadius: 4,
    backgroundColor: colors.neutral.slate800,
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resultTitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeBadge: {
    backgroundColor: colors.accent.red,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  typeBadgeText: {
    color: colors.text.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  resultYear: {
    color: colors.text.secondary,
    fontSize: 14,
    marginRight: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultRating: {
    color: colors.text.secondary,
    fontSize: 14,
    marginLeft: 4,
  },
  resultCategory: {
    color: colors.text.tertiary,
    fontSize: 12,
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
  },
  emptyTitle: {
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: colors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
  },
  recentSearchesContainer: {
    width: '100%',
    marginTop: 32,
  },
  recentSearchesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentSearchesTitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    color: colors.accent.red,
    fontSize: 14,
    fontWeight: '500',
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  recentSearchText: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 14,
    marginLeft: 12,
  },
});
