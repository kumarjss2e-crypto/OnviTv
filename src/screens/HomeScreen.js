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
import { useSafeAreaInsets } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { getUserChannels } from '../services/channelService';
import { getUserMovies } from '../services/movieService';
import { getUserSeries } from '../services/seriesService';
import { 
  spacing, 
  fontSizes, 
  wp, 
  hp,
  isShortScreen,
  getResponsiveValue 
} from '../utils/responsive';

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
  const insets = useSafeAreaInsets();
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [allContent, setAllContent] = useState({});
  const [filteredCategories, setFilteredCategories] = useState([]);

  useEffect(() => {
    if (user) {
      loadAllContent();
    }
  }, [user]);

  useEffect(() => {
    filterContentByType();
  }, [selectedType, allContent, searchQuery]);

  const loadAllContent = async () => {
    try {
      setLoading(true);
      
      const [channelsResult, moviesResult, seriesResult] = await Promise.all([
        getUserChannels(user.uid),
        getUserMovies(user.uid),
        getUserSeries(user.uid),
      ]);

      const content = {
        channels: channelsResult.success ? channelsResult.data : [],
        movies: moviesResult.success ? moviesResult.data : [],
        series: seriesResult.success ? seriesResult.data : [],
      };

      setAllContent(content);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

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
          categories.push({
            title: 'Movies',
            data: filterBySearch(allContent.movies.slice(0, 20)),
            type: 'movie'
          });
        }
        if (allContent.series?.length > 0) {
          categories.push({
            title: 'Series',
            data: filterBySearch(allContent.series.slice(0, 20)),
            type: 'series'
          });
        }
        if (allContent.channels?.length > 0) {
          categories.push({
            title: 'Live TV',
            data: filterBySearch(allContent.channels.slice(0, 20)),
            type: 'channel'
          });
        }
        break;

      case 'movies':
        const movies = allContent.movies || [];
        const filteredMovies = filterBySearch(movies);
        
        // Group movies by genre/category
        const moviesByGenre = {};
        filteredMovies.forEach(movie => {
          const genre = movie.genre || movie.category || 'Other';
          if (!moviesByGenre[genre]) {
            moviesByGenre[genre] = [];
          }
          moviesByGenre[genre].push(movie);
        });

        categories = Object.keys(moviesByGenre).map(genre => ({
          title: genre,
          data: moviesByGenre[genre],
          type: 'movie'
        }));
        break;

      case 'series':
        const series = allContent.series || [];
        const filteredSeries = filterBySearch(series);
        
        // Group series by genre/category
        const seriesByGenre = {};
        filteredSeries.forEach(show => {
          const genre = show.genre || show.category || 'Other';
          if (!seriesByGenre[genre]) {
            seriesByGenre[genre] = [];
          }
          seriesByGenre[genre].push(show);
        });

        categories = Object.keys(seriesByGenre).map(genre => ({
          title: genre,
          data: seriesByGenre[genre],
          type: 'series'
        }));
        break;

      case 'livetv':
      case 'channels':
        const channels = allContent.channels || [];
        const filteredChannels = filterBySearch(channels);
        
        // Group channels by category
        const channelsByCategory = {};
        filteredChannels.forEach(channel => {
          const category = channel.category || 'Other';
          if (!channelsByCategory[category]) {
            channelsByCategory[category] = [];
          }
          channelsByCategory[category].push(channel);
        });

        categories = Object.keys(channelsByCategory).map(category => ({
          title: category,
          data: channelsByCategory[category],
          type: 'channel'
        }));
        break;

      case 'sports':
        const sportsChannels = (allContent.channels || []).filter(ch => 
          (ch.category || '').toLowerCase().includes('sport') ||
          (ch.name || '').toLowerCase().includes('sport')
        );
        const filteredSports = filterBySearch(sportsChannels);
        
        if (filteredSports.length > 0) {
          categories.push({
            title: 'Sports Channels',
            data: filteredSports,
            type: 'channel'
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

    return (
      <View style={styles.categorySection}>
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryTitle}>{item.title}</Text>
          <Text style={styles.categoryCount}>{item.data.length} items</Text>
        </View>
        <FlatList
          data={item.data}
          renderItem={({ item: contentItem }) => renderContentItem({ item: contentItem, type: item.type })}
          keyExtractor={(contentItem, index) => `${contentItem.id}-${index}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.contentList}
        />
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

      {/* Choice Chips */}
      <View style={styles.chipsContainer}>
        <FlatList
          data={CONTENT_TYPES}
          renderItem={renderChoiceChip}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsList}
        />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
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
      </View>

      {/* Content Categories */}
      <FlatList
        data={filteredCategories}
        renderItem={renderCategory}
        keyExtractor={(item, index) => `${item.title}-${index}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
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
    paddingVertical: spacing.md,
    backgroundColor: colors.neutral.slate900,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.1)',
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
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
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
    paddingBottom: spacing['2xl'] + insets.bottom + 20,
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
