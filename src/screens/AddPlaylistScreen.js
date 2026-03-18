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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useParseLoading } from '../context/ParseLoadingContext';
import { addPlaylist } from '../services/playlistService';
import { backgroundParsingService } from '../services/backgroundParsingService';
import { downloadM3UFileWithRetry } from '../services/m3uDownloadService';
import { db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import CustomAlert from '../components/CustomAlert';

const AddPlaylistScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { startParsing } = useParseLoading();
  const [selectedType, setSelectedType] = useState('m3u'); // 'm3u' or 'xtream'
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  
  // Processing state
  const [processing, setProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);

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

    setProcessing(true);
    setProcessingMessage('Saving playlist...');
    setDownloadProgress(0);

    try {
      let playlistData;

      if (selectedType === 'm3u') {
        // Normalize and validate M3U URL
        let normalizedUrl = m3uUrl.trim();
        
        // Fix common URL issues
        // Replace HTML entities if accidentally encoded
        normalizedUrl = normalizedUrl
          .replace(/&amp;/g, '&')
          .replace(/&#38;/g, '&');
        
        // Ensure URL is properly formatted
        if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
          normalizedUrl = 'http://' + normalizedUrl;
        }
        
        console.log(`[AddPlaylistScreen] M3U URL:`, normalizedUrl);
        
        playlistData = {
          name: m3uName.trim(),
          type: 'm3u',
          url: normalizedUrl,
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
        console.log(`[AddPlaylistScreen] Playlist saved. ID: ${result.playlistId}`);
        
        if (selectedType === 'm3u') {
          // M3U: Download file with progress tracking
          console.log('[AddPlaylistScreen] Starting M3U download...');
          setProcessingMessage('Downloading playlist file...');
          
          // Show initial progress to make modal visible
          setDownloadProgress(0.05);
          
          // Debounce progress updates for smooth animation on fast downloads
          let lastProgressUpdate = 0;
          const minProgressInterval = 50; // milliseconds between UI updates
          let progressUpdateTimeout = null;
          
          try {
            // Download M3U file with progress callback
            const m3uContent = await downloadM3UFileWithRetry(
              playlistData.url,
              (progress) => {
                const percent = Math.round(progress * 100);
                const now = Date.now();
                
                // Clamp progress to at least 5% so user sees bar starting
                const displayProgress = Math.max(progress, 0.05);
                
                // Update immediately if it's been long enough, or debounce
                if (now - lastProgressUpdate >= minProgressInterval) {
                  console.log(`[AddPlaylistScreen] Download progress: ${percent}%`);
                  setDownloadProgress(displayProgress);
                  setProcessingMessage(`Downloading playlist file... ${percent}%`);
                  lastProgressUpdate = now;
                } else if (!progressUpdateTimeout) {
                  // Schedule update after min interval
                  progressUpdateTimeout = setTimeout(() => {
                    console.log(`[AddPlaylistScreen] Download progress: ${percent}%`);
                    setDownloadProgress(displayProgress);
                    setProcessingMessage(`Downloading playlist file... ${percent}%`);
                    lastProgressUpdate = Date.now();
                    progressUpdateTimeout = null;
                  }, minProgressInterval);
                }
              },
              3 // max retries
            );

            // Clear any pending progress update
            if (progressUpdateTimeout) {
              clearTimeout(progressUpdateTimeout);
            }

            console.log(`[AddPlaylistScreen] Download complete. File size: ${m3uContent.length} chars`);
            
            // Download complete - now start background parsing
            setProcessingMessage('Parsing playlist items...');
            
            // Start background parsing with downloaded content
            setTimeout(async () => {
              try {
                // Fetch full playlist data from Firestore
                const playlistRef = doc(db, 'playlists', result.playlistId);
                const playlistSnap = await getDoc(playlistRef);
                
                if (playlistSnap.exists()) {
                  const fullPlaylistData = playlistSnap.data();
                  const normalizedData = {
                    ...fullPlaylistData,
                    m3uUrl: fullPlaylistData.m3uConfig?.url,
                  };
                  
                  // Start parsing from downloaded content
                  console.log(`[AddPlaylistScreen] Starting background M3U parsing...`);
                  startParsing(result.playlistId);
                  
                  await backgroundParsingService.startM3UParsingFromContent(
                    result.playlistId,
                    playlistData.url,
                    m3uContent
                  );
                }
              } catch (parseError) {
                console.error('[AddPlaylistScreen] Error starting parsing:', parseError);
              }
            }, 100);
            
            // Navigate to Home immediately - parsing continues in background
            setTimeout(() => {
              setProcessing(false);
              setLoading(false);
              // Clear form
              setM3uName('');
              setM3uUrl('');
              setDownloadProgress(0);
              // Navigate to main tabs
              navigation.navigate('Home');
            }, 500);

          } catch (downloadError) {
            console.error('[AddPlaylistScreen] M3U download failed:', downloadError);
            setProcessing(false);
            setLoading(false);
            CustomAlert.alert('Download Error', 'Failed to download M3U file. Please try again.');
          }
        } else {
          // Xtream: Fetch and parse instantly (~40 seconds)
          console.log('[AddPlaylistScreen] Starting Xtream parsing...');
          setProcessingMessage('Fetching Xtream playlist...');
          
          // Start parsing immediately
          setTimeout(async () => {
            try {
              const playlistRef = doc(db, 'playlists', result.playlistId);
              const playlistSnap = await getDoc(playlistRef);
              
              if (playlistSnap.exists()) {
                const fullPlaylistData = playlistSnap.data();
                const normalizedData = {
                  ...fullPlaylistData,
                  serverUrl: fullPlaylistData.xtreamConfig?.serverUrl,
                  username: fullPlaylistData.xtreamConfig?.username,
                  password: fullPlaylistData.xtreamConfig?.password,
                };
                
                console.log(`[AddPlaylistScreen] Starting background Xtream parsing...`);
                startParsing(result.playlistId);
                
                await backgroundParsingService.startXtreamParsing(result.playlistId);
              }
            } catch (parseError) {
              console.error('[AddPlaylistScreen] Error starting Xtream parsing:', parseError);
            }
          }, 100);
          
          // Xtream takes ~40 seconds, show progress message
          // Navigate after 45 seconds to ensure parsing has started
          setTimeout(() => {
            setProcessing(false);
            setLoading(false);
            // Clear form
            setXtreamName('');
            setXtreamServer('');
            setXtreamUsername('');
            setXtreamPassword('');
            setDownloadProgress(0);
            // Navigate to main tabs
            navigation.navigate('Home');
          }, 45000);
        }
      } else {
        setProcessing(false);
        setLoading(false);
        CustomAlert.alert('Error', result.error || 'Failed to add playlist');
      }
    } catch (error) {
      setProcessing(false);
      setLoading(false);
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
      {/* Processing Modal */}
      <Modal
        visible={processing}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={styles.processingOverlay}>
          <View style={styles.processingModal}>
            <View style={styles.processingContent}>
              <ActivityIndicator
                size="large"
                color={colors.primary.purple}
                style={styles.processingSpinner}
              />
              <Text style={styles.processingTitle}>
                Extracting and Saving Playlist
              </Text>
              <Text style={styles.processingMessage}>
                {processingMessage}
              </Text>
              
              {selectedType === 'm3u' && downloadProgress > 0 && downloadProgress < 1 && (
                <View style={styles.progressContainer}>
                {Platform.OS === 'web' || Platform.OS === 'ios' || Platform.OS === 'android' ? (
                  <>
                    <View style={[styles.progressBar, { position: 'relative' }]}>
                      <View
                        style={{
                          height: '100%',
                          width: `${downloadProgress * 100}%`,
                          backgroundColor: colors.primary.purple,
                          borderRadius: 4,
                        }}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {Math.round(downloadProgress * 100)}%
                    </Text>
                  </>
                ) : null}
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={processing}
        >
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
  processingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingModal: {
    backgroundColor: colors.neutral.slate800,
    borderRadius: 16,
    padding: 32,
    width: '80%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  processingContent: {
    alignItems: 'center',
  },
  processingSpinner: {
    marginBottom: 24,
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  processingMessage: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginTop: 16,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 8,
    backgroundColor: 'rgba(128, 90, 213, 0.2)',
    overflow: 'hidden',
  },
  progressText: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
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
