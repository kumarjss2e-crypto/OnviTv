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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { getUserChannels } from '../services/channelService';
import ChannelCard from '../components/ChannelCard';

const LiveTVScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [channels, setChannels] = useState([]);
  const [filteredChannels, setFilteredChannels] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    if (user) {
      loadChannels();
    }
  }, [user]);

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
      console.error('Error loading channels:', error);
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
    console.log('Channel pressed:', channel.name);
    // TODO: Navigate to player when implemented
    // navigation.navigate('Player', { channel, type: 'channel' });
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map(renderCategoryTab)}
        </ScrollView>
      )}

      {/* Channels Grid/List */}
      <FlatList
        data={filteredChannels}
        renderItem={renderChannel}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode} // Force re-render when view mode changes
        columnWrapperStyle={viewMode === 'grid' ? styles.row : null}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
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
    paddingTop: 60,
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
  categoriesContainer: {
    marginBottom: 16,
    height: 60,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryTab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: colors.neutral.slate800,
    marginRight: 8,
    height: 44,
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
