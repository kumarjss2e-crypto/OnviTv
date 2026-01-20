import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useParseLoading } from '../context/ParseLoadingContext';
import { getUserChannels } from '../services/channelService';
import { getUserMovies } from '../services/movieService';
import { getUserSeries } from '../services/seriesService';
import { firestore } from '../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { 
  spacing, 
  fontSizes, 
  wp, 
  hp,
  isShortScreen,
  getResponsiveValue 
} from '../utils/responsive';

// Pagination config
const ITEMS_PER_PAGE = 500; // Load 500 items per page for smooth scrolling with large playlists
const SCROLL_THRESHOLD = 0.7; // Load more at 70% scroll

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
  const { hasAnyParsing, averageProgress } = useParseLoading();
  const safeAreaInsets = Platform.OS === 'web' ? { bottom: 0, top: 0, left: 0, right: 0 } : useSafeAreaInsets();
  const insets = safeAreaInsets;
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const unsubscribesRef = useRef([]);
  const debounceTimerRef = useRef(null);
  
  // Scroll animation state
  const [headerVisible, setHeaderVisible] = useState(true);
  const headerAnimatedValue = useRef(new Animated.Value(1)).current;
  const lastScrollYRef = useRef(0);
  const scrollThrottleRef = useRef(null);
  const headerToggleLockRef = useRef(false); // Prevent rapid toggling
  const lastToggleTimeRef = useRef(0); // Track time of last toggle
  const chipsMarginAnim = useRef(new Animated.Value(spacing.md)).current;
  const searchMarginAnim = useRef(new Animated.Value(spacing.md)).current;
  
  // Data states - store full content
  const [allContent, setAllContent] = useState({});
  const [filteredCategories, setFilteredCategories] = useState([]);
  
  // Pagination state - track items loaded per category
  const [categoryPages, setCategoryPages] = useState({});
  const [loadingMoreMap, setLoadingMoreMap] = useState({});

  // Debounced content loader to prevent excessive queries
  const loadContentDataDebounced = useCallback((userId, skipDebounce = false) => {
    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const loadData = async () => {
      try {
        console.log('[HomeScreen] Loading content data...');
        const startTime = Date.now();
        const playlistsResult = await getUserChannels(userId);
        const moviesResult = await getUserMovies(userId);
        const seriesResult = await getUserSeries(userId);

        const content = {
          channels: playlistsResult.success ? playlistsResult.data : [],
          movies: moviesResult.success ? moviesResult.data : [],
          series: seriesResult.success ? seriesResult.data : [],
        };

        const elapsed = Date.now() - startTime;
        console.log('[HomeScreen] Content loaded in ' + elapsed + 'ms:', {
          channels: content.channels.length,
          movies: content.movies.length,
          series: content.series.length,
          total: content.channels.length + content.movies.length + content.series.length,
        });

        setAllContent(content);
        // Reset pagination when content changes
        setCategoryPages({});
        setLoading(false);
      } catch (error) {
        console.error('[HomeScreen] Error loading content:', error);
        setLoading(false);
      }
    };

    // For initial load, skip the debounce and load immediately
    if (skipDebounce) {
      loadData();
    } else {
      // For subsequent updates, use debounce (wait 500ms after listener fires)
      debounceTimerRef.current = setTimeout(loadData, 500);
    }
  }, []);

  // Slice content for a category based on pagination state
  const getSlicedCategoryData = useCallback((fullData, categoryKey) => {
    const currentPage = categoryPages[categoryKey] || 1;
    const startIndex = 0;
    const endIndex = currentPage * ITEMS_PER_PAGE;
    return fullData.slice(startIndex, endIndex);
  }, [categoryPages]);

  // Load more items for a specific category
  const loadMoreForCategory = useCallback((categoryKey, totalItems) => {
    const currentPage = categoryPages[categoryKey] || 1;
    const itemsLoaded = currentPage * ITEMS_PER_PAGE;
    
    // Only load more if there are more items available and not already loading
    if (itemsLoaded < totalItems && !loadingMoreMap[categoryKey]) {
      setLoadingMoreMap(prev => ({ ...prev, [categoryKey]: true }));
      
      // Simulate loading with small delay for smoothness
      setTimeout(() => {
        setCategoryPages(prev => ({
          ...prev,
          [categoryKey]: currentPage + 1
        }));
        setLoadingMoreMap(prev => ({ ...prev, [categoryKey]: false }));
      }, 100);
    }
  }, [categoryPages, loadingMoreMap]);

  // Handle scroll to show/hide header (chips + search)
  const handleScroll = useCallback((event) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const threshold = 30; // Show/hide after scrolling 30px
    const minToggleInterval = 300; // Wait at least 300ms between toggles to prevent bounce loops
    
    // Throttle scroll handling
    if (scrollThrottleRef.current) return;
    scrollThrottleRef.current = true;
    setTimeout(() => { scrollThrottleRef.current = null; }, 100);
    
    // Detect scroll direction
    const scrollingDown = currentY > lastScrollYRef.current;
    const shouldShowHeader = !scrollingDown || currentY < threshold;
    
    // Prevent rapid toggling (bounce at bottom causes false triggers)
    const now = Date.now();
    const timeSinceLastToggle = now - lastToggleTimeRef.current;
    
    if (shouldShowHeader !== headerVisible && timeSinceLastToggle > minToggleInterval) {
      setHeaderVisible(shouldShowHeader);
      lastToggleTimeRef.current = now;
      
      // Animate the header AND margins (maxHeight/margins can't use native driver)
      Animated.parallel([
        Animated.timing(headerAnimatedValue, {
          toValue: shouldShowHeader ? 1 : 0,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(chipsMarginAnim, {
          toValue: shouldShowHeader ? spacing.md : 0,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(searchMarginAnim, {
          toValue: shouldShowHeader ? spacing.md : 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
    
    lastScrollYRef.current = currentY;
  }, [headerVisible, headerAnimatedValue, chipsMarginAnim, searchMarginAnim]);

  // Set up real-time listeners for content - OPTIMIZED for iOS
  useEffect(() => {
    if (!user) {
      setAllContent({});
      return;
    }

    // Cleanup previous listeners
    unsubscribesRef.current.forEach(unsub => unsub());
    unsubscribesRef.current = [];
    
    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setLoading(true);

    // Load initial data immediately (don't wait for real-time listeners)
    const initialLoad = async () => {
      console.log('[HomeScreen] Performing initial data load...');
      const startTime = Date.now();
      try {
        const playlistsResult = await getUserChannels(user.uid);
        const moviesResult = await getUserMovies(user.uid);
        const seriesResult = await getUserSeries(user.uid);

        const content = {
          channels: playlistsResult.success ? playlistsResult.data : [],
          movies: moviesResult.success ? moviesResult.data : [],
          series: seriesResult.success ? seriesResult.data : [],
        };

        const elapsed = Date.now() - startTime;
        console.log('[HomeScreen] Initial load complete in ' + elapsed + 'ms:', {
          channels: content.channels.length,
          movies: content.movies.length,
          series: content.series.length,
        });

        setAllContent(content);
        setLoading(false);
      } catch (error) {
        console.error('[HomeScreen] Error in initial load:', error);
        setLoading(false);
      }
    };

    // Run initial load immediately
    initialLoad();

    // Set up real-time listeners AFTER initial load to avoid blocking
    const setupRealtimeListeners = async () => {
      const playlistsRef = collection(firestore, 'playlists');
      const playlistsQuery = query(playlistsRef, where('userId', '==', user.uid));

      // Listen to playlist changes (simplified - just trigger refresh)
      const playlistsUnsub = onSnapshot(playlistsQuery, (playlistsSnapshot) => {
        console.log('[HomeScreen] Playlists changed, triggering refresh...');
        // Defer reload to next tick to avoid blocking UI
        setTimeout(() => {
          loadContentDataDebounced(user.uid, true);
        }, 500);
      });

      unsubscribesRef.current.push(playlistsUnsub);
    };

    // Delay setup of real-time listeners by 500ms to let UI render first
    const listenerSetupTimeout = setTimeout(() => {
      setupRealtimeListeners();
    }, 500);

    // Cleanup on unmount
    return () => {
      clearTimeout(listenerSetupTimeout);
      unsubscribesRef.current.forEach(unsub => unsub());
      unsubscribesRef.current = [];
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [user, loadContentDataDebounced]);

  // Refresh on focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('[HomeScreen] Screen focused, refreshing content...');
      if (user) {
        // Skip debounce when screen is focused for faster refresh
        loadContentDataDebounced(user.uid, true);
      }
    }, [user, loadContentDataDebounced])
  );

  useEffect(() => {
    filterContentByType();
  }, [selectedType, allContent, searchQuery, categoryPages]);

  const filterContentByType = () => {
    let categories = [];
    
    // Filter by search query first
    const filterBySearch = (items) => {
      if (!searchQuery) return items;
      return items.filter(item => 
        (item.name || item.title || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    };

    switch (selectedType) {
      case 'all':
        if (allContent.movies?.length > 0) {
          const filteredMovies = filterBySearch(allContent.movies);
          const slicedMovies = getSlicedCategoryData(filteredMovies, 'all-movies');
          categories.push({
            title: 'Movies',
            data: slicedMovies,
            fullData: filteredMovies,
            type: 'movie',
            categoryKey: 'all-movies'
          });
        }
        if (allContent.series?.length > 0) {
          const filteredSeries = filterBySearch(allContent.series);
          const slicedSeries = getSlicedCategoryData(filteredSeries, 'all-series');
          categories.push({
            title: 'Series',
            data: slicedSeries,
            fullData: filteredSeries,
            type: 'series',
            categoryKey: 'all-series'
          });
        }
        if (allContent.channels?.length > 0) {
          const filteredChannels = filterBySearch(allContent.channels);
          const slicedChannels = getSlicedCategoryData(filteredChannels, 'all-channels');
          categories.push({
            title: 'Live TV',
            data: slicedChannels,
            fullData: filteredChannels,
            type: 'channel',
            categoryKey: 'all-channels'
          });
        }
        break;

      case 'movies':
        const movies = allContent.movies || [];
        const filteredMovies = filterBySearch(movies);
        
        // Group movies by category name
        const moviesByGenre = {};
        filteredMovies.forEach(movie => {
          const genre = movie.categoryName || movie.genre || movie.category || 'Other';
          if (!moviesByGenre[genre]) {
            moviesByGenre[genre] = [];
          }
          moviesByGenre[genre].push(movie);
        });

        console.log('[HomeScreen] Movies grouped by category:', Object.keys(moviesByGenre).map(g => ({ category: g, count: moviesByGenre[g].length })));

        categories = Object.keys(moviesByGenre)
          .sort((a, b) => (a === 'Other' ? 1 : b === 'Other' ? -1 : 0))
          .map(genre => {
            const sliced = getSlicedCategoryData(moviesByGenre[genre], `movie-${genre}`);
            return {
              title: genre,
              data: sliced,
              fullData: moviesByGenre[genre],
              type: 'movie',
              categoryKey: `movie-${genre}`
            };
          });
        break;

      case 'series':
        const series = allContent.series || [];
        const filteredSeries = filterBySearch(series);
        
        // Group series by category name
        const seriesByGenre = {};
        filteredSeries.forEach(show => {
          const genre = show.categoryName || show.genre || show.category || 'Other';
          if (!seriesByGenre[genre]) {
            seriesByGenre[genre] = [];
          }
          seriesByGenre[genre].push(show);
        });

        console.log('[HomeScreen] Series grouped by category:', Object.keys(seriesByGenre).map(g => ({ category: g, count: seriesByGenre[g].length })));

        categories = Object.keys(seriesByGenre)
          .sort((a, b) => (a === 'Other' ? 1 : b === 'Other' ? -1 : 0))
          .map(genre => {
            const sliced = getSlicedCategoryData(seriesByGenre[genre], `series-${genre}`);
            return {
              title: genre,
              data: sliced,
              fullData: seriesByGenre[genre],
              type: 'series',
              categoryKey: `series-${genre}`
            };
          });
        break;

      case 'livetv':
      case 'channels':
        const channels = allContent.channels || [];
        const filteredChannels = filterBySearch(channels);
        
        // Group channels by category name
        const channelsByCategory = {};
        filteredChannels.forEach(channel => {
          const category = channel.categoryName || channel.category || 'Other';
          if (!channelsByCategory[category]) {
            channelsByCategory[category] = [];
          }
          channelsByCategory[category].push(channel);
        });

        console.log('[HomeScreen] Channels grouped by category:', Object.keys(channelsByCategory).map(c => ({ category: c, count: channelsByCategory[c].length })));

        categories = Object.keys(channelsByCategory)
          .sort((a, b) => (a === 'Other' ? 1 : b === 'Other' ? -1 : 0))
          .map(category => {
            const sliced = getSlicedCategoryData(channelsByCategory[category], `channel-${category}`);
            return {
              title: category,
              data: sliced,
              fullData: channelsByCategory[category],
              type: 'channel',
              categoryKey: `channel-${category}`
            };
          });
        break;

      case 'sports':
        // Get sports channels from all channels using categoryName
        const sportsChannels = (allContent.channels || []).filter(ch => {
          const category = (ch.categoryName || ch.category || '').toLowerCase();
          const name = (ch.name || '').toLowerCase();
          return category.includes('sport') || name.includes('sport');
        });
        const filteredSports = filterBySearch(sportsChannels);
        
        if (filteredSports.length > 0) {
          const sliced = getSlicedCategoryData(filteredSports, 'sports');
          categories.push({
            title: 'Sports Channels',
            data: sliced,
            fullData: filteredSports,
            type: 'channel',
            categoryKey: 'sports'
          });
        } else {
          categories.push({
            title: 'No Sports Content',
            data: [],
            fullData: [],
            type: 'empty',
            categoryKey: 'sports'
          });
        }
        break;
    }

    setFilteredCategories(categories);
  };

  const renderChoiceChip = ({ item }) => {
    const isSelected = selectedType === item.id;
    
    return (
      <TouchableOpacity
        style={[styles.chip, isSelected && styles.chipSelected]}
        onPress={() => setSelectedType(item.id)}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={item.icon} 
          size={18} 
          color={isSelected ? '#fff' : colors.text.secondary} 
        />
        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderContentItem = ({ item, type }) => {
    const imageUri = item.poster || item.logo || item.backdrop || null;
    const title = item.name || item.title || 'Untitled';
    
    const handlePress = () => {
      if (type === 'series') {
        navigation.navigate('SeriesDetail', { series: item });
      } else if (type === 'movie') {
        navigation.navigate('MovieDetail', { movie: item });
      } else {
        navigation.navigate('VideoPlayer', {
          streamUrl: item.streamUrl,
          title: item.name || item.title,
          contentType: type,
          contentId: item.id,
        });
      }
    };
    
    return (
      <TouchableOpacity style={styles.contentCard} activeOpacity={0.8} onPress={handlePress}>
        {imageUri ? (
          <Image 
            source={{ uri: imageUri }} 
            style={styles.contentPoster}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.contentPoster, styles.placeholderPoster]}>
            <Ionicons name="tv-outline" size={32} color={colors.text.muted} />
          </View>
        )}
        <Text style={styles.contentTitle} numberOfLines={2}>{title}</Text>
      </TouchableOpacity>
    );
  };

  const renderCategory = ({ item }) => {
    if (!item.data || item.data.length === 0) return null;

    const hasMoreItems = item.data.length < item.fullData.length;
    const isLoadingMore = loadingMoreMap[item.categoryKey] || false;

    return (
      <View style={styles.categorySection}>
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryTitle}>{item.title}</Text>
          <Text style={styles.categoryCount}>{item.data.length}/{item.fullData.length} items</Text>
        </View>
        <FlatList
          data={item.data}
          renderItem={({ item: contentItem }) => renderContentItem({ item: contentItem, type: item.type })}
          keyExtractor={(contentItem, index) => `${contentItem.id}-${index}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.contentList}
          onScroll={(event) => {
            const contentOffset = event.nativeEvent.contentOffset.x;
            const contentSize = event.nativeEvent.contentSize.width;
            const layoutWidth = event.nativeEvent.layoutMeasurement.width;
            const scrollPercentage = (contentOffset + layoutWidth) / contentSize;
            
            if (scrollPercentage > SCROLL_THRESHOLD && hasMoreItems && !isLoadingMore) {
              loadMoreForCategory(item.categoryKey, item.fullData.length);
            }
          }}
        />
        {/* Load More Indicator for Horizontal Scroll */}
        {hasMoreItems && (
          <View style={styles.loadMoreIndicator}>
            <Text style={styles.loadMoreText}>
              {isLoadingMore ? 'Loading...' : `Scroll right to load more (${item.fullData.length - item.data.length} remaining)`}
            </Text>
            {isLoadingMore && <ActivityIndicator size="small" color={colors.primary.purple} />}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.purple} />
        <Text style={styles.loadingText}>Loading content...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Parsing Loading Indicator - Linear Progress Bar */}
      {hasAnyParsing && (
        <View style={styles.parsingIndicator}>
          <View style={styles.parsingBarContainer}>
            <View style={[styles.parsingBar, { width: `${averageProgress}%` }]} />
          </View>
          <Text style={styles.parsingText}>Loading content... {averageProgress}%</Text>
        </View>
      )}
      
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Ionicons name="person-circle-outline" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Choice Chips - Animated Collapsible */}
      <Animated.View 
        style={[
          styles.chipsContainer,
          {
            opacity: headerAnimatedValue,
            maxHeight: headerAnimatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 90],
            }),
            marginVertical: chipsMarginAnim,
            overflow: 'hidden',
          }
        ]}
      >
        <FlatList
          data={CONTENT_TYPES}
          renderItem={renderChoiceChip}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsList}
          scrollEnabled={false}
        />
      </Animated.View>

      {/* Search Bar - Animated Collapsible */}
      <Animated.View 
        style={[
          styles.searchContainer,
          {
            opacity: headerAnimatedValue,
            maxHeight: headerAnimatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 70],
            }),
            marginVertical: searchMarginAnim,
            marginHorizontal: searchMarginAnim,
            overflow: 'hidden',
          }
        ]}
      >
        <Ionicons name="search-outline" size={20} color={colors.text.muted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${selectedType === 'all' ? 'all content' : selectedType}...`}
          placeholderTextColor={colors.text.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.text.muted} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Content Categories */}
      <FlatList
        data={filteredCategories}
        renderItem={renderCategory}
        keyExtractor={(item, index) => `${item.title}-${index}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top, paddingBottom: spacing['2xl'] + 20 + insets.bottom }]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="film-outline" size={64} color={colors.text.muted} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No results found' : 'No content available'}
            </Text>
          </View>
        }
      />

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.slate900,
  },
  parsingIndicator: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: colors.primary.purple,
    gap: spacing.md,
  },
  parsingBarContainer: {
    height: 3,
    backgroundColor: 'rgba(147, 51, 234, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  parsingBar: {
    height: '100%',
    backgroundColor: colors.primary.purple,
    borderRadius: 2,
  },
  parsingText: {
    fontSize: fontSizes.sm,
    color: colors.primary.purple,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral.slate900,
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + (isShortScreen() ? 8 : 10) : (isShortScreen() ? 40 : 50),
    paddingBottom: isShortScreen() ? 8 : 10,
    backgroundColor: colors.neutral.slate900,
  },
  logo: {
    width: wp(100),
    height: hp(35),
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconButton: {
    width: wp(36),
    height: wp(36),
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipsContainer: {
    backgroundColor: colors.neutral.slate900,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.1)',
    overflow: 'hidden',
  },
  chipsList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    gap: spacing.xs,
  },
  chipSelected: {
    backgroundColor: colors.primary.purple,
    borderColor: colors.primary.purple,
  },
  chipText: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  chipTextSelected: {
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    overflow: 'hidden',
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.text.primary,
  },
  contentContainer: {
    paddingBottom: spacing['2xl'] + 20,
  },
  categorySection: {
    marginBottom: spacing.xl,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  categoryTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.text.primary,
  },
  categoryCount: {
    fontSize: fontSizes.xs,
    color: colors.text.muted,
  },
  contentList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  contentCard: {
    width: getResponsiveValue({ small: 100, medium: 110, large: 120 }),
  },
  contentPoster: {
    width: getResponsiveValue({ small: 100, medium: 110, large: 120 }),
    height: getResponsiveValue({ small: 142, medium: 156, large: 170 }),
    borderRadius: 8,
    backgroundColor: colors.neutral.slate800,
  },
  placeholderPoster: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentTitle: {
    marginTop: spacing.xs + 2,
    fontSize: fontSizes.xs,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  loadMoreIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  loadMoreText: {
    flex: 1,
    fontSize: fontSizes.xs,
    color: colors.text.muted,
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: isShortScreen() ? spacing['2xl'] : spacing['3xl'] + 20,
  },
  emptyText: {
    marginTop: spacing.lg,
    fontSize: fontSizes.sm,
    color: colors.text.muted,
  },
});

export default HomeScreen;

