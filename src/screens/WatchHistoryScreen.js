import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  deleteDoc,
  doc,
  writeBatch
} from 'firebase/firestore';
import { firestore } from '../config/firebase';

const { width } = Dimensions.get('window');

const WatchHistoryScreen = ({ navigation }) => {
  const { user } = useAuth();
  const safeAreaInsets = Platform.OS === 'web' ? { bottom: 0, top: 0, left: 0, right: 0 } : useSafeAreaInsets();
  const insets = safeAreaInsets;
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const historyRef = collection(firestore, 'watchHistory');
      const q = query(
        historyRef,
        where('userId', '==', user.uid),
        orderBy('lastWatchedAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const historyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setHistory(historyData);
    } catch (error) {
      console.error('[WatchHistoryScreen] Error loading history:', error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const handleDeleteItem = async (itemId, title) => {
    Alert.alert(
      'Remove from History',
      `Remove "${title}" from watch history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(firestore, 'watchHistory', itemId));
              setHistory(prev => prev.filter(item => item.id !== itemId));
            } catch (error) {
              console.error('Error deleting history item:', error);
            }
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear Watch History',
      'Are you sure you want to clear all watch history? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const batch = writeBatch(firestore);
              history.forEach(item => {
                const docRef = doc(firestore, 'watchHistory', item.id);
                batch.delete(docRef);
              });
              await batch.commit();
              setHistory([]);
            } catch (error) {
              console.error('Error clearing history:', error);
            }
          },
        },
      ]
    );
  };

  const handleItemPress = (item) => {
    const contentType = item.contentType || 'movie';
    
    if (contentType === 'channel') {
      navigation.navigate('VideoPlayer', {
        streamUrl: item.streamUrl,
        title: item.title,
        contentType: 'channel',
      });
    } else if (contentType === 'movie') {
      navigation.navigate('VideoPlayer', {
        streamUrl: item.streamUrl,
        title: item.title,
        contentType: 'movie',
        contentId: item.contentId,
        thumbnail: item.poster,
      });
    } else if (contentType === 'episode') {
      navigation.navigate('VideoPlayer', {
        streamUrl: item.streamUrl,
        title: item.title,
        contentType: 'episode',
        contentId: item.contentId,
        thumbnail: item.poster,
      });
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const renderHistoryItem = ({ item }) => {
    const progress = item.progress || 0;
    const duration = item.duration || 0;
    const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;
    
    return (
      <TouchableOpacity 
        style={styles.historyCard}
        onPress={() => handleItemPress(item)}
      >
        <View style={styles.cardLeft}>
          {item.poster ? (
            <Image source={{ uri: item.poster }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Ionicons 
                name={item.contentType === 'channel' ? 'tv' : 'film'} 
                size={32} 
                color={colors.text.muted} 
              />
            </View>
          )}
          
          {/* Progress bar overlay */}
          {progressPercent > 0 && (
            <View style={styles.progressOverlay}>
              <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title || 'Untitled'}
          </Text>
          
          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={colors.text.muted} />
              <Text style={styles.metaText}>
                {formatDuration(progress)} / {formatDuration(duration)}
              </Text>
            </View>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>{formatDate(item.lastWatchedAt)}</Text>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.typeChip}>
              <Text style={styles.typeText}>
                {item.contentType === 'channel' ? 'LIVE TV' : 
                 item.contentType === 'episode' ? 'EPISODE' : 'MOVIE'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteItem(item.id, item.title)}
        >
          <Ionicons name="close-circle" size={24} color={colors.text.muted} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.purple} />
        <Text style={styles.loadingText}>Loading history...</Text>
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
        <Text style={styles.headerTitle}>Watch History</Text>
        {history.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearAll}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
        {history.length === 0 && <View style={styles.headerRight} />}
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="time-outline" size={64} color={colors.text.muted} />
          <Text style={styles.emptyTitle}>No Watch History</Text>
          <Text style={styles.emptySubtitle}>
            Your recently watched content will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 20 + insets.bottom }]}
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
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearButtonText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 14,
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
  listContent: {
    padding: 16,
  },
  historyCard: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.slate800,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardLeft: {
    position: 'relative',
  },
  thumbnail: {
    width: 120,
    height: 90,
    backgroundColor: colors.neutral.slate700,
  },
  thumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.neutral.slate700,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary.purple,
  },
  cardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  metaText: {
    fontSize: 12,
    color: colors.text.muted,
    marginLeft: 4,
  },
  metaDot: {
    fontSize: 12,
    color: colors.text.muted,
    marginHorizontal: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.neutral.slate700,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  deleteButton: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default WatchHistoryScreen;



