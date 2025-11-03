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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { 
  getUserDownloads, 
  cancelDownload, 
  getStorageUsage,
  clearAllDownloads 
} from '../services/downloadService';

const { width } = Dimensions.get('window');
const CARD_W = (width - 16 * 2 - 12) / 2;
const CARD_H = CARD_W * 1.5;

const DownloadsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [downloads, setDownloads] = useState([]);
  const [activeDownloads, setActiveDownloads] = useState([]);
  const [completedDownloads, setCompletedDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [storageInfo, setStorageInfo] = useState({ totalMB: '0', fileCount: 0 });

  useEffect(() => {
    loadDownloads();
    loadStorageInfo();
    
    // Refresh every 5 seconds for active downloads
    const interval = setInterval(() => {
      if (activeDownloads.length > 0) {
        loadDownloads();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [user]);

  const loadDownloads = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const result = await getUserDownloads(user.uid);
      
      if (result.success) {
        const allDownloads = result.data || [];
        setDownloads(allDownloads);
        
        // Separate active and completed
        setActiveDownloads(allDownloads.filter(d => d.status === 'downloading' || d.status === 'paused'));
        setCompletedDownloads(allDownloads.filter(d => d.status === 'completed'));
      } else {
        setDownloads([]);
        setActiveDownloads([]);
        setCompletedDownloads([]);
      }
    } catch (error) {
      console.error('[DownloadsScreen] Error loading downloads:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStorageInfo = async () => {
    try {
      const result = await getStorageUsage();
      if (result.success) {
        setStorageInfo(result);
      }
    } catch (error) {
      console.error('[DownloadsScreen] Error loading storage:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDownloads();
    await loadStorageInfo();
    setRefreshing(false);
  };

  const handleCancelDownload = async (downloadId, title) => {
    Alert.alert(
      'Cancel Download',
      `Are you sure you want to cancel downloading "${title}"?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            const result = await cancelDownload(downloadId);
            if (result.success) {
              await loadDownloads();
              await loadStorageInfo();
            }
          },
        },
      ]
    );
  };

  const handleDeleteDownload = async (downloadId, title) => {
    Alert.alert(
      'Delete Download',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await cancelDownload(downloadId);
            if (result.success) {
              await loadDownloads();
              await loadStorageInfo();
            }
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Downloads',
      'Are you sure you want to delete all downloaded content?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            const result = await clearAllDownloads(user.uid);
            if (result.success) {
              await loadDownloads();
              await loadStorageInfo();
            }
          },
        },
      ]
    );
  };

  const handlePlayDownload = (download) => {
    navigation.navigate('VideoPlayer', {
      streamUrl: download.localUri,
      title: download.title,
      contentType: download.contentType,
      isOffline: true,
    });
  };

  const renderActiveDownload = ({ item }) => {
    return (
      <View style={styles.activeCard}>
        <View style={styles.activeCardLeft}>
          {item.poster ? (
            <Image source={{ uri: item.poster }} style={styles.activePoster} />
          ) : (
            <View style={[styles.activePoster, styles.activePosterPlaceholder]}>
              <Ionicons name="film" size={24} color={colors.text.muted} />
            </View>
          )}
          <View style={styles.activeInfo}>
            <Text style={styles.activeTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.activeStatus}>
              {item.status === 'downloading' ? 'Downloading...' : 'Paused'}
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${item.progress || 0}%` }]} />
            </View>
            <Text style={styles.progressText}>{item.progress || 0}%</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => handleCancelDownload(item.id, item.title)}
        >
          <Ionicons name="close-circle" size={28} color="#ef4444" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderCompletedDownload = ({ item }) => {
    return (
      <View style={styles.card}>
        <TouchableOpacity onPress={() => handlePlayDownload(item)}>
          <View style={styles.poster}>
            {item.poster ? (
              <Image source={{ uri: item.poster }} style={styles.posterImg} />
            ) : (
              <View style={[styles.posterImg, styles.posterPlaceholder]}>
                <Ionicons name="film" size={48} color={colors.text.muted} />
              </View>
            )}
            <View style={styles.playOverlay}>
              <Ionicons name="play-circle" size={48} color="#fff" />
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteDownload(item.id, item.title)}
            >
              <Ionicons name="trash" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.cardType}>
            {item.contentType === 'movie' ? 'Movie' : item.contentType === 'episode' ? 'Episode' : 'Video'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.purple} />
        <Text style={styles.loadingText}>Loading downloads...</Text>
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
        <Text style={styles.headerTitle}>Downloads</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Storage Usage */}
      <View style={styles.storageCard}>
        <View style={styles.storageHeader}>
          <Ionicons name="folder" size={24} color={colors.primary.purple} />
          <Text style={styles.storageTitle}>Storage Usage</Text>
        </View>
        <Text style={styles.storageSize}>{storageInfo.totalMB} MB</Text>
        <Text style={styles.storageFiles}>{storageInfo.fileCount} files downloaded</Text>
        {completedDownloads.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClearAll}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Active Downloads */}
      {activeDownloads.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Downloads ({activeDownloads.length})</Text>
          <FlatList
            data={activeDownloads}
            renderItem={renderActiveDownload}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Completed Downloads */}
      {completedDownloads.length === 0 && activeDownloads.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="download-outline" size={64} color={colors.text.muted} />
          <Text style={styles.emptyTitle}>No Downloads Yet</Text>
          <Text style={styles.emptySubtitle}>
            Download movies and episodes to watch offline
          </Text>
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Downloaded ({completedDownloads.length})</Text>
          <FlatList
            data={completedDownloads}
            renderItem={renderCompletedDownload}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContent}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        </View>
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
  storageCard: {
    margin: 16,
    padding: 16,
    backgroundColor: colors.neutral.slate800,
    borderRadius: 12,
  },
  storageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  storageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: 8,
  },
  storageSize: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary.purple,
    marginBottom: 4,
  },
  storageFiles: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  clearButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  clearButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  activeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    backgroundColor: colors.neutral.slate800,
    borderRadius: 12,
  },
  activeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activePoster: {
    width: 60,
    height: 90,
    borderRadius: 8,
    backgroundColor: colors.neutral.slate700,
  },
  activePosterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  activeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  activeStatus: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.neutral.slate700,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary.purple,
  },
  progressText: {
    fontSize: 11,
    color: colors.text.muted,
  },
  cancelButton: {
    padding: 8,
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
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  deleteButton: {
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

export default DownloadsScreen;
