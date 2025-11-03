import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { getUserFavorites, removeFromFavorites } from '../services/favoritesService';

const { width } = Dimensions.get('window');
const CARD_W = (width - 16 * 2 - 12) / 2;
const CARD_H = CARD_W * 1.5;

const FavouritesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFavorites();
  }, [user]);

  const loadFavorites = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const result = await getUserFavorites(user.uid);
      console.log('[FavouritesScreen] Loaded favorites:', result);
      
      if (result.success) {
        setFavorites(result.data || []);
      } else {
        setFavorites([]);
      }
    } catch (error) {
      console.error('[FavouritesScreen] Error loading favorites:', error);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  };

  const handleRemoveFavorite = async (item) => {
    try {
      const result = await removeFromFavorites(item.favoriteId);
      if (result.success) {
        setFavorites(prev => prev.filter(f => f.favoriteId !== item.favoriteId));
      }
    } catch (error) {
      console.error('[FavouritesScreen] Error removing favorite:', error);
    }
  };

  const handleItemPress = (item) => {
    if (item.contentType === 'movie') {
      navigation.navigate('MovieDetail', {
        movie: item,
      });
    } else if (item.contentType === 'series') {
      navigation.navigate('SeriesDetail', {
        series: item,
      });
    } else if (item.contentType === 'channel') {
      navigation.navigate('VideoPlayer', {
        streamUrl: item.streamUrl || item.stream_url,
        title: item.name || item.title,
        contentType: 'channel',
      });
    }
  };

  const renderCard = ({ item }) => {
    const poster = item.poster || item.logo || item.metadata?.poster;
    const title = item.name || item.title || item.metadata?.name || 'Untitled';
    
    return (
      <View style={styles.card}>
        <TouchableOpacity onPress={() => handleItemPress(item)}>
          <View style={styles.poster}>
            {poster ? (
              <Image source={{ uri: poster }} style={styles.posterImg} />
            ) : (
              <View style={[styles.posterImg, styles.posterPlaceholder]}>
                <Ionicons 
                  name={item.contentType === 'channel' ? 'tv' : 'film'} 
                  size={48} 
                  color={colors.text.muted} 
                />
              </View>
            )}
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={() => handleRemoveFavorite(item)}
            >
              <Ionicons name="heart" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.cardType}>
            {item.contentType === 'channel' ? 'Live TV' : item.contentType === 'movie' ? 'Movie' : 'Series'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.purple} />
        <Text style={styles.loadingText}>Loading favorites...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Favourites</Text>
        <View style={styles.headerRight} />
      </View>

      {favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={64} color={colors.text.muted} />
          <Text style={styles.emptyTitle}>No Favourites Yet</Text>
          <Text style={styles.emptySubtitle}>
            Add movies, series, or channels to your favourites to see them here
          </Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderCard}
          keyExtractor={(item) => item.favoriteId}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
      )}
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
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.slate800,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
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
    lineHeight: 20,
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    width: CARD_W,
  },
  poster: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.neutral.slate800,
    position: 'relative',
  },
  posterImg: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  posterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
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
  cardTitle: {
    marginTop: 8,
    color: colors.text.primary,
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 16,
  },
  cardType: {
    marginTop: 4,
    color: colors.text.muted,
    fontSize: 11,
  },
});

export default FavouritesScreen;
