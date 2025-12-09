import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { updatePlaylist } from '../services/playlistService';
import CustomAlert from '../components/CustomAlert';
import { parseM3UPlaylist } from '../utils/m3uParser';
import { fetchXtreamPlaylist } from '../services/xtreamAPI';
import { useAuth } from '../context/AuthContext';

const EditPlaylistScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { playlist } = route.params;
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [m3uUrl, setM3uUrl] = useState('');
  const [xtreamServer, setXtreamServer] = useState('');
  const [xtreamUsername, setXtreamUsername] = useState('');
  const [xtreamPassword, setXtreamPassword] = useState('');

  useEffect(() => {
    // Pre-fill form with existing data
    if (playlist) {
      setName(playlist.name || '');
      
      if (playlist.type === 'm3u' && playlist.m3uConfig) {
        setM3uUrl(playlist.m3uConfig.url || '');
      } else if (playlist.type === 'xtream' && playlist.xtreamConfig) {
        setXtreamServer(playlist.xtreamConfig.serverUrl || '');
        setXtreamUsername(playlist.xtreamConfig.username || '');
        setXtreamPassword(playlist.xtreamConfig.password || '');
      }
    }
  }, [playlist]);

  const handleRefreshPlaylist = async () => {
    CustomAlert.alert(
      'Refresh Playlist',
      'This will re-fetch and update all channels and content from your playlist source. This may take a few moments.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Refresh',
          onPress: async () => {
            setRefreshing(true);
            
            try {
              if (playlist.type === 'm3u') {
                // Parse M3U playlist
                const result = await parseM3UPlaylist(
                  playlist.id,
                  user.uid,
                  playlist.m3uConfig.url
                );

                if (result.success) {
                  CustomAlert.alert(
                    'Success',
                    `Playlist refreshed!\n\nChannels: ${result.stats.totalChannels}\nMovies: ${result.stats.totalMovies}\nSeries: ${result.stats.totalSeries}`,
                    [
                      {
                        text: 'OK',
                        onPress: () => navigation.goBack(),
                      },
                    ]
                  );
                } else {
                  CustomAlert.alert('Error', result.error || 'Failed to refresh playlist');
                }
              } else {
                // Xtream - fetch from server
                const result = await fetchXtreamPlaylist(
                  playlist.id,
                  user.uid,
                  playlist.xtreamConfig
                );

                if (result.success) {
                  CustomAlert.alert(
                    'Success',
                    `Playlist refreshed!\n\nChannels: ${result.stats.totalChannels}\nMovies: ${result.stats.totalMovies}\nSeries: ${result.stats.totalSeries}`,
                    [
                      {
                        text: 'OK',
                        onPress: () => navigation.goBack(),
                      },
                    ]
                  );
                } else {
                  CustomAlert.alert('Error', result.error || 'Failed to refresh playlist');
                }
              }
            } catch (error) {
              console.error('Error refreshing playlist:', error);
              CustomAlert.alert('Error', 'Failed to refresh playlist');
            } finally {
              setRefreshing(false);
            }
          },
        },
      ]
    );
  };

  const handleUpdatePlaylist = async () => {
    // Validation
    if (!name.trim()) {
      CustomAlert.alert('Error', 'Please enter a playlist name');
      return;
    }

    if (playlist.type === 'm3u') {
      if (!m3uUrl.trim()) {
        CustomAlert.alert('Error', 'Please enter M3U URL');
        return;
      }
      if (!m3uUrl.startsWith('http://') && !m3uUrl.startsWith('https://')) {
        CustomAlert.alert('Error', 'URL must start with http:// or https://');
        return;
      }
    } else if (playlist.type === 'xtream') {
      if (!xtreamServer.trim() || !xtreamUsername.trim() || !xtreamPassword.trim()) {
        CustomAlert.alert('Error', 'Please fill in all Xtream Codes fields');
        return;
      }
    }

    setLoading(true);

    try {
      const updates = {
        name: name.trim(),
      };

      // Add type-specific updates
      if (playlist.type === 'm3u') {
        updates.m3uConfig = {
          ...playlist.m3uConfig,
          url: m3uUrl.trim(),
        };
      } else if (playlist.type === 'xtream') {
        let serverUrl = xtreamServer.trim();
        if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
          serverUrl = 'http://' + serverUrl;
        }
        if (serverUrl.endsWith('/')) {
          serverUrl = serverUrl.slice(0, -1);
        }

        updates.xtreamConfig = {
          ...playlist.xtreamConfig,
          serverUrl: serverUrl,
          username: xtreamUsername.trim(),
          password: xtreamPassword.trim(),
        };
      }

      const result = await updatePlaylist(playlist.id, updates);

      if (result.success) {
        CustomAlert.alert(
          'Success',
          'Playlist updated successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        CustomAlert.alert('Error', result.error || 'Failed to update playlist');
      }
    } catch (error) {
      console.error('Error updating playlist:', error);
      CustomAlert.alert('Error', 'Failed to update playlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Playlist</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Playlist Type Badge */}
        <View style={styles.section}>
          <View style={styles.typeBadge}>
            <Ionicons
              name={playlist.type === 'm3u' ? 'document-text' : 'globe'}
              size={20}
              color={playlist.type === 'm3u' ? colors.primary.purple : colors.secondary.cyan}
            />
            <Text style={styles.typeBadgeText}>
              {playlist.type === 'm3u' ? 'M3U Playlist' : 'Xtream Codes'}
            </Text>
          </View>
        </View>

        {/* Playlist Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Playlist Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Playlist Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., My IPTV"
              placeholderTextColor={colors.text.muted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          {/* M3U URL */}
          {playlist.type === 'm3u' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>M3U URL</Text>
              <TextInput
                style={styles.input}
                placeholder="http://example.com/playlist.m3u"
                placeholderTextColor={colors.text.muted}
                value={m3uUrl}
                onChangeText={setM3uUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>
          )}

          {/* Xtream Fields */}
          {playlist.type === 'xtream' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Server URL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="http://example.com:8080"
                  placeholderTextColor={colors.text.muted}
                  value={xtreamServer}
                  onChangeText={setXtreamServer}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your username"
                  placeholderTextColor={colors.text.muted}
                  value={xtreamUsername}
                  onChangeText={setXtreamUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your password"
                  placeholderTextColor={colors.text.muted}
                  value={xtreamPassword}
                  onChangeText={setXtreamPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                />
              </View>
            </>
          )}
        </View>

        {/* Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Playlist Statistics</Text>
          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Ionicons name="tv-outline" size={20} color={colors.primary.purple} />
                <View style={styles.statInfo}>
                  <Text style={styles.statValue}>{playlist.stats?.totalChannels || 0}</Text>
                  <Text style={styles.statLabel}>Channels</Text>
                </View>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="film-outline" size={20} color={colors.secondary.cyan} />
                <View style={styles.statInfo}>
                  <Text style={styles.statValue}>{playlist.stats?.totalMovies || 0}</Text>
                  <Text style={styles.statLabel}>Movies</Text>
                </View>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="play-circle-outline" size={20} color={colors.accent.pink} />
                <View style={styles.statInfo}>
                  <Text style={styles.statValue}>{playlist.stats?.totalSeries || 0}</Text>
                  <Text style={styles.statLabel}>Series</Text>
                </View>
              </View>
            </View>
            <Text style={styles.lastUpdated}>
              Last updated:{' '}
              {playlist.lastUpdated
                ? new Date(playlist.lastUpdated.seconds * 1000).toLocaleString()
                : 'Never'}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefreshPlaylist}
            disabled={refreshing || loading}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={colors.text.primary} />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={20} color={colors.text.primary} />
                <Text style={styles.refreshButtonText}>Refresh Content</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.updateButton}
            onPress={handleUpdatePlaylist}
            disabled={loading || refreshing}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.text.primary} />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color={colors.text.primary} />
                <Text style={styles.updateButtonText}>Update Playlist</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  typeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
  },
  statsCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statInfo: {
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 2,
  },
  lastUpdated: {
    fontSize: 12,
    color: colors.text.muted,
    textAlign: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.1)',
  },
  actionsSection: {
    padding: 16,
    gap: 12,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.secondary.cyan,
    gap: 8,
  },
  refreshButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.purple,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  updateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  bottomPadding: {
    height: 40,
  },
});

export default EditPlaylistScreen;
