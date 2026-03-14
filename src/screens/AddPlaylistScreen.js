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
  ProgressBarAndroid,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useParseLoading } from '../context/ParseLoadingContext';
import { addPlaylist } from '../services/playlistService';
import { backgroundParsingService } from '../services/backgroundParsingService';
import { downloadM3UFile } from '../services/m3uDownloadService';
import { db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import CustomAlert from '../components/CustomAlert';

const AddPlaylistScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { startParsing } = useParseLoading();
  const [selectedType, setSelectedType] = useState('m3u'); // 'm3u' or 'xtream'
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState('');

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
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadStatus('Saving playlist...');

    try {
      let playlistData;
      let normalizedUrl;

      if (selectedType === 'm3u') {
        // Normalize and validate M3U URL
        normalizedUrl = m3uUrl.trim()
          .replace(/&amp;/g, '&')
          .replace(/&#38;/g, '&');
        
        if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
          normalizedUrl = 'http://' + normalizedUrl;
        }
        
        console.log(`[AddPlaylistScreen] M3U URL:`, normalizedUrl);
        
        playlistData = {
          name: m3uName.trim(),
          type: 'm3u',
          url: normalizedUrl,
        };

        // Step 1: Save playlist to database
        const result = await addPlaylist(user.uid, playlistData);
        if (!result.success) {
          throw new Error('Failed to save playlist');
        }

        const playlistId = result.playlistId;
        console.log(`[AddPlaylistScreen] Playlist saved with ID:`, playlistId);

        // Step 2: Download M3U file with progress tracking
        setDownloadStatus('Downloading playlist file...');
        console.log('[AddPlaylistScreen] Starting M3U download...');

        const fileContent = await downloadM3UFile(
          normalizedUrl,
          (progress) => {
            const percent = Math.round(progress * 100);
            setDownloadProgress(percent);
            console.log(`[AddPlaylistScreen] Download progress: ${percent}%`);
          }
        );

        console.log('[AddPlaylistScreen] M3U file downloaded, size:', fileContent.length);
        setDownloadStatus('Parsing playlist file...');
        setDownloadProgress(100);

        // Step 3: Start background parsing
        // The parsing will happen invisibly in the background
        console.log('[AddPlaylistScreen] Starting background parsing...');
        startParsing(playlistId);

        // Step 4: Start the actual parsing job
        await backgroundParsingService.startM3UParsingFromContent(
          playlistId,
          normalizedUrl,
          fileContent
        );

        console.log('[AddPlaylistScreen] Background parsing job started');

        // Step 5: Navigate to Home (user sees content, parsing continues invisibly)
        setIsDownloading(false);
        navigation.navigate('Home');

      } else {
        // Xtream flow - same but faster (no download needed)
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

        // Xtream: save and fetch instantly (~40 seconds)
        setDownloadStatus('Fetching Xtream data...');
        const result = await addPlaylist(user.uid, playlistData);

        if (result.success) {
          const playlistId = result.playlistId;
          startParsing(playlistId);

          // Start Xtream parsing (will be fast, ~40 seconds)
          await backgroundParsingService.startXtreamParsing(playlistId);

          // Navigate after Xtream fetch completes
          setIsDownloading(false);
          navigation.navigate('Home');
        }
      }
    } catch (error) {
      console.error('[AddPlaylistScreen] Error:', error);
      setIsDownloading(false);
      setLoading(false);
      CustomAlert.alert('Error', error.message || 'Failed to add playlist. Please try again.');
    }
  };

  if (isDownloading) {
    return (
      <View style={[styles.container, styles.downloadingContainer]}>
        <View style={styles.downloadingContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.downloadingStatus}>{downloadStatus}</Text>
          
          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${downloadProgress}%` }]} />
          </View>
          <Text style={styles.progressText}>{downloadProgress}% Complete</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Tab Selection */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              selectedType === 'm3u' && styles.activeTab,
            ]}
            onPress={() => setSelectedType('m3u')}
          >
            <Text style={[
              styles.tabText,
              selectedType === 'm3u' && styles.activeTabText,
            ]}>
              M3U Playlist
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              selectedType === 'xtream' && styles.activeTab,
            ]}
            onPress={() => setSelectedType('xtream')}
          >
            <Text style={[
              styles.tabText,
              selectedType === 'xtream' && styles.activeTabText,
            ]}>
              Xtream Codes
            </Text>
          </TouchableOpacity>
        </View>

        {/* M3U Form */}
        {selectedType === 'm3u' && (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Playlist Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter playlist name"
                placeholderTextColor={colors.text.secondary}
                value={m3uName}
                onChangeText={setM3uName}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>M3U URL</Text>
              <TextInput
                style={styles.input}
                placeholder="https://example.com/playlist.m3u"
                placeholderTextColor={colors.text.secondary}
                value={m3uUrl}
                onChangeText={setM3uUrl}
                editable={!loading}
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.button, styles.testButton, testing && styles.buttonDisabled]}
              onPress={handleTestConnection}
              disabled={testing || loading}
            >
              {testing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="link" size={18} color="white" />
                  <Text style={styles.buttonText}> Test Connection</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleSavePlaylist}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={18} color="white" />
                  <Text style={styles.buttonText}> Add Playlist</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Xtream Form */}
        {selectedType === 'xtream' && (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Playlist Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter playlist name"
                placeholderTextColor={colors.text.secondary}
                value={xtreamName}
                onChangeText={setXtreamName}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Server URL</Text>
              <TextInput
                style={styles.input}
                placeholder="example.com or http://example.com:8000"
                placeholderTextColor={colors.text.secondary}
                value={xtreamServer}
                onChangeText={setXtreamServer}
                editable={!loading}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter username"
                placeholderTextColor={colors.text.secondary}
                value={xtreamUsername}
                onChangeText={setXtreamUsername}
                editable={!loading}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor={colors.text.secondary}
                value={xtreamPassword}
                onChangeText={setXtreamPassword}
                editable={!loading}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.button, styles.testButton, testing && styles.buttonDisabled]}
              onPress={handleTestConnection}
              disabled={testing || loading}
            >
              {testing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="link" size={18} color="white" />
                  <Text style={styles.buttonText}> Test Connection</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleSavePlaylist}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={18} color="white" />
                  <Text style={styles.buttonText}> Add Playlist</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  downloadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadingContent: {
    alignItems: 'center',
    padding: 40,
  },
  downloadingStatus: {
    color: colors.text.primary,
    fontSize: 16,
    marginTop: 20,
    fontWeight: '600',
  },
  progressContainer: {
    width: 250,
    height: 6,
    backgroundColor: colors.background.secondary,
    borderRadius: 3,
    marginTop: 20,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressText: {
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 30,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: 'white',
  },
  form: {
    marginBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background.secondary,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    color: colors.text.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  testButton: {
    backgroundColor: colors.secondary,
  },
  submitButton: {
    backgroundColor: colors.primary,
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddPlaylistScreen;
