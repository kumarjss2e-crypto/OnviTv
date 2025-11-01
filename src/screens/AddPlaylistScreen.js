import React, { useState } from 'react';
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
import { useAuth } from '../context/AuthContext';
import { addPlaylist } from '../services/playlistService';
import CustomAlert from '../components/CustomAlert';
import { parseM3UPlaylist } from '../utils/m3uParser';
import { fetchXtreamPlaylist } from '../services/xtreamAPI';

const AddPlaylistScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState('m3u'); // 'm3u' or 'xtream'
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  // M3U fields
  const [m3uName, setM3uName] = useState('');
  const [m3uUrl, setM3uUrl] = useState('');

  // Xtream fields
  const [xtreamName, setXtreamName] = useState('');
  const [xtreamServer, setXtreamServer] = useState('');
  const [xtreamUsername, setXtreamUsername] = useState('');
  const [xtreamPassword, setXtreamPassword] = useState('');

  const handleTestConnection = async () => {
    setTesting(true);

    try {
      if (selectedType === 'm3u') {
        // Test M3U URL
        if (!m3uUrl) {
          CustomAlert.alert('Error', 'Please enter M3U URL');
          return;
        }

        // Simple URL validation
        if (!m3uUrl.startsWith('http://') && !m3uUrl.startsWith('https://')) {
          CustomAlert.alert('Error', 'URL must start with http:// or https://');
          return;
        }

        // Try to fetch the M3U file
        const response = await fetch(m3uUrl, { method: 'HEAD' });
        if (response.ok) {
          CustomAlert.alert('Success', 'M3U URL is accessible!');
        } else {
          CustomAlert.alert('Error', 'Unable to access M3U URL. Please check the URL.');
        }
      } else {
        // Test Xtream connection
        if (!xtreamServer || !xtreamUsername || !xtreamPassword) {
          CustomAlert.alert('Error', 'Please fill in all Xtream Codes fields');
          return;
        }

        // Clean server URL
        let serverUrl = xtreamServer.trim();
        if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
          serverUrl = 'http://' + serverUrl;
        }
        if (serverUrl.endsWith('/')) {
          serverUrl = serverUrl.slice(0, -1);
        }

        // Test Xtream API
        const testUrl = `${serverUrl}/player_api.php?username=${xtreamUsername}&password=${xtreamPassword}`;
        const response = await fetch(testUrl);
        const data = await response.json();

        if (data.user_info && data.user_info.auth === 1) {
          CustomAlert.alert('Success', `Connected! Server: ${data.server_info.server_name || 'Unknown'}`);
        } else {
          CustomAlert.alert('Error', 'Invalid credentials or server not responding');
        }
      }
    } catch (error) {
      console.error('Test connection error:', error);
      CustomAlert.alert('Error', 'Failed to connect. Please check your details and try again.');
    } finally {
      setTesting(false);
    }
  };

  const handleSavePlaylist = async () => {
    if (!user) {
      CustomAlert.alert('Error', 'You must be logged in to add playlists');
      return;
    }

    // Validation
    if (selectedType === 'm3u') {
      if (!m3uName.trim()) {
        CustomAlert.alert('Error', 'Please enter a playlist name');
        return;
      }
      if (!m3uUrl.trim()) {
        CustomAlert.alert('Error', 'Please enter M3U URL');
        return;
      }
      if (!m3uUrl.startsWith('http://') && !m3uUrl.startsWith('https://')) {
        CustomAlert.alert('Error', 'URL must start with http:// or https://');
        return;
      }
    } else {
      if (!xtreamName.trim()) {
        CustomAlert.alert('Error', 'Please enter a playlist name');
        return;
      }
      if (!xtreamServer.trim() || !xtreamUsername.trim() || !xtreamPassword.trim()) {
        CustomAlert.alert('Error', 'Please fill in all Xtream Codes fields');
        return;
      }
    }

    setLoading(true);

    try {
      let playlistData;

      if (selectedType === 'm3u') {
        playlistData = {
          name: m3uName.trim(),
          type: 'm3u',
          url: m3uUrl.trim(),
        };
      } else {
        let serverUrl = xtreamServer.trim();
        if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
          serverUrl = 'http://' + serverUrl;
        }
        if (serverUrl.endsWith('/')) {
          serverUrl = serverUrl.slice(0, -1);
        }

        playlistData = {
          name: xtreamName.trim(),
          type: 'xtream',
          serverUrl: serverUrl,
          username: xtreamUsername.trim(),
          password: xtreamPassword.trim(),
        };
      }

      const result = await addPlaylist(user.uid, playlistData);

      if (result.success) {
        // If M3U playlist, parse it immediately
        if (selectedType === 'm3u') {
          CustomAlert.alert(
            'Success',
            'Playlist added! Parsing content now... This may take a few moments.',
            [
              {
                text: 'OK',
                onPress: () => {
                  navigation.replace('PlaylistManagement');
                  // Parse in background
                  parseM3UPlaylist(result.playlistId, user.uid, playlistData.url)
                    .then(parseResult => {
                      if (parseResult.success) {
                        console.log('M3U parsed successfully:', parseResult.stats);
                      } else {
                        console.error('M3U parsing failed:', parseResult.error);
                      }
                    });
                },
              },
            ]
          );
        } else {
          // Xtream - parse immediately
          CustomAlert.alert(
            'Success',
            'Playlist added! Fetching content from Xtream server... This may take a few moments.',
            [
              {
                text: 'OK',
                onPress: () => {
                  navigation.goBack();
                  // Fetch Xtream content in background
                  fetchXtreamPlaylist(result.playlistId, user.uid, {
                    serverUrl: playlistData.serverUrl,
                    username: playlistData.username,
                    password: playlistData.password,
                  })
                    .then(parseResult => {
                      if (parseResult.success) {
                        console.log('Xtream fetched successfully:', parseResult.stats);
                      } else {
                        console.error('Xtream fetch failed:', parseResult.error);
                      }
                    });
                },
              },
            ]
          );
        }
      } else {
        CustomAlert.alert('Error', result.error || 'Failed to add playlist');
      }
    } catch (error) {
      console.error('Error saving playlist:', error);
      CustomAlert.alert('Error', 'Failed to save playlist. Please try again.');
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
        <Text style={styles.headerTitle}>Add Playlist</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Type Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Playlist Type</Text>
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[styles.typeButton, selectedType === 'm3u' && styles.typeButtonActive]}
              onPress={() => setSelectedType('m3u')}
            >
              <Ionicons
                name="document-text"
                size={24}
                color={selectedType === 'm3u' ? colors.text.primary : colors.text.muted}
              />
              <Text
                style={[
                  styles.typeButtonText,
                  selectedType === 'm3u' && styles.typeButtonTextActive,
                ]}
              >
                M3U URL
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeButton, selectedType === 'xtream' && styles.typeButtonActive]}
              onPress={() => setSelectedType('xtream')}
            >
              <Ionicons
                name="globe"
                size={24}
                color={selectedType === 'xtream' ? colors.text.primary : colors.text.muted}
              />
              <Text
                style={[
                  styles.typeButtonText,
                  selectedType === 'xtream' && styles.typeButtonTextActive,
                ]}
              >
                Xtream Codes
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* M3U Form */}
        {selectedType === 'm3u' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>M3U Playlist Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Playlist Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., My IPTV"
                placeholderTextColor={colors.text.muted}
                value={m3uName}
                onChangeText={setM3uName}
                autoCapitalize="words"
              />
            </View>

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
              <Text style={styles.hint}>Enter the full URL to your M3U playlist file</Text>
            </View>
          </View>
        )}

        {/* Xtream Form */}
        {selectedType === 'xtream' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Xtream Codes Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Playlist Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., My Xtream"
                placeholderTextColor={colors.text.muted}
                value={xtreamName}
                onChangeText={setXtreamName}
                autoCapitalize="words"
              />
            </View>

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
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTestConnection}
            disabled={testing || loading}
          >
            {testing ? (
              <ActivityIndicator size="small" color={colors.text.primary} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.text.primary} />
                <Text style={styles.testButtonText}>Test Connection</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSavePlaylist}
            disabled={loading || testing}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.text.primary} />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color={colors.text.primary} />
                <Text style={styles.saveButtonText}>Save Playlist</Text>
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
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeButtonActive: {
    borderColor: colors.primary.purple,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  typeButtonText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.muted,
  },
  typeButtonTextActive: {
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
  hint: {
    marginTop: 6,
    fontSize: 12,
    color: colors.text.muted,
  },
  actionsSection: {
    padding: 16,
    gap: 12,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary.purple,
    gap: 8,
  },
  testButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.purple,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  bottomPadding: {
    height: 40,
  },
});

export default AddPlaylistScreen;
