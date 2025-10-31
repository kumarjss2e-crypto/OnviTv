import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { getUserPlaylists, deletePlaylist, togglePlaylistActive } from '../services/playlistService';
import CustomAlert from '../components/CustomAlert';
import { firestore } from '../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const PlaylistManagementScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Set up real-time listener for playlists
    const playlistsQuery = query(
      collection(firestore, 'playlists'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(playlistsQuery, (snapshot) => {
      const playlistsData = [];
      snapshot.forEach((doc) => {
        playlistsData.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort by order
      playlistsData.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      setPlaylists(playlistsData);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to playlists:', error);
      setLoading(false);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [user]);

  const loadPlaylists = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const result = await getUserPlaylists(user.uid);
      if (result.success) {
        setPlaylists(result.data);
      }
    } catch (error) {
      console.error('Error loading playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPlaylists();
    setRefreshing(false);
  };

  const handleToggleActive = async (playlistId, currentStatus) => {
    try {
      const result = await togglePlaylistActive(playlistId, !currentStatus);
      if (result.success) {
        // Update local state
        setPlaylists(prev =>
          prev.map(p =>
            p.id === playlistId ? { ...p, isActive: !currentStatus } : p
          )
        );
      }
    } catch (error) {
      console.error('Error toggling playlist:', error);
      CustomAlert.alert('Error', 'Failed to update playlist status');
    }
  };

  const handleDeletePlaylist = (playlist) => {
    CustomAlert.alert(
      'Delete Playlist',
      `Are you sure you want to delete "${playlist.name}"? This will remove all associated channels and content.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deletePlaylist(playlist.id);
              if (result.success) {
                setPlaylists(prev => prev.filter(p => p.id !== playlist.id));
                CustomAlert.alert('Success', 'Playlist deleted successfully');
              } else {
                CustomAlert.alert('Error', result.error || 'Failed to delete playlist');
              }
            } catch (error) {
              console.error('Error deleting playlist:', error);
              CustomAlert.alert('Error', 'Failed to delete playlist');
            }
          },
        },
      ]
    );
  };

  const renderPlaylistCard = ({ item }) => {
    const totalContent =
      (item.stats?.totalChannels || 0) +
      (item.stats?.totalMovies || 0) +
      (item.stats?.totalSeries || 0);

    return (
      <View style={styles.playlistCard}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.typeIcon, { backgroundColor: item.type === 'm3u' ? colors.primary.purple : colors.secondary.cyan }]}>
              <Ionicons
                name={item.type === 'm3u' ? 'document-text' : 'globe'}
                size={20}
                color={colors.text.primary}
              />
            </View>
            <View style={styles.headerInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.playlistName} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.isParsing && (
                  <ActivityIndicator size="small" color={colors.primary.purple} style={styles.parsingIndicator} />
                )}
              </View>
              <Text style={styles.playlistType}>
                {item.isParsing 
                  ? `Parsing: ${item.parseProgress?.step || 'Processing'}... ${item.parseProgress?.progress || 0}%`
                  : item.type === 'm3u' ? 'M3U Playlist' : 'Xtream Codes'
                }
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.statusBadge, item.isActive ? styles.activeBadge : styles.inactiveBadge]}
            onPress={() => handleToggleActive(item.id, item.isActive)}
          >
            <Text style={[styles.statusText, item.isActive ? styles.activeText : styles.inactiveText]}>
              {item.isActive ? 'Active' : 'Inactive'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="tv-outline" size={16} color={colors.text.muted} />
            <Text style={styles.statText}>{item.stats?.totalChannels || 0} Channels</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="film-outline" size={16} color={colors.text.muted} />
            <Text style={styles.statText}>{item.stats?.totalMovies || 0} Movies</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="play-circle-outline" size={16} color={colors.text.muted} />
            <Text style={styles.statText}>{item.stats?.totalSeries || 0} Series</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.lastUpdated}>
            Updated {item.lastUpdated ? new Date(item.lastUpdated.seconds * 1000).toLocaleDateString() : 'Never'}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('EditPlaylist', { playlist: item })}
            >
              <Ionicons name="create-outline" size={20} color={colors.primary.purple} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeletePlaylist(item)}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="list-outline" size={64} color={colors.text.muted} />
      </View>
      <Text style={styles.emptyTitle}>No Playlists Yet</Text>
      <Text style={styles.emptyDescription}>
        Add your first IPTV playlist to start watching live TV, movies, and series
      </Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddPlaylist')}
      >
        <Ionicons name="add-circle" size={20} color={colors.text.primary} />
        <Text style={styles.addButtonText}>Add Playlist</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.purple} />
        <Text style={styles.loadingText}>Loading playlists...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Playlists</Text>
        <TouchableOpacity
          style={styles.addIconButton}
          onPress={() => navigation.navigate('AddPlaylist')}
        >
          <Ionicons name="add" size={28} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {playlists.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={playlists}
          renderItem={renderPlaylistCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary.purple}
            />
          }
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
  addIconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
  listContent: {
    padding: 16,
  },
  playlistCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  parsingIndicator: {
    marginLeft: 4,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
    flex: 1,
  },
  playlistType: {
    fontSize: 12,
    color: colors.text.muted,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  inactiveBadge: {
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeText: {
    color: '#22c55e',
  },
  inactiveText: {
    color: colors.text.muted,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.1)',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 80,
  },
  statText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.1)',
  },
  lastUpdated: {
    fontSize: 11,
    color: colors.text.muted,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.purple,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
});

export default PlaylistManagementScreen;
