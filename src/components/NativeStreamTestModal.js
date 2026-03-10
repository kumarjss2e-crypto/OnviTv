import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Share,
  Alert,
  NativeModules,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, fontSizes } from '../utils/responsive';

const NativeStreamTestModal = ({ visible, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [testing, setTesting] = useState(false);
  const [testUrl, setTestUrl] = useState('https://iptv-org.github.io/iptv/index.m3u');
  const [results, setResults] = useState(null);
  const scrollViewRef = useRef(null);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setLogs((prev) => [...prev, { message: logEntry, type }]);
    
    // Auto-scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleRunTest = async () => {
    if (!testUrl.trim()) {
      Alert.alert('Validation', 'Please enter an M3U URL');
      return;
    }

    setTesting(true);
    setLogs([]);
    setResults(null);
    addLog('🔍 Starting native iOS streaming parser test...', 'info');
    addLog(`Platform: ${Platform.OS}`, 'info');
    addLog(`URL: ${testUrl}`, 'info');

    try {
      // Step 1: Check if iOS
      if (Platform.OS !== 'ios') {
        addLog('❌ Native module only available on iOS', 'error');
        setTesting(false);
        return;
      }
      addLog('✓ Platform is iOS', 'success');

      // Step 2: Check native module availability
      addLog('Checking native module availability...', 'info');
      const M3UStreamParserModule = NativeModules.M3UStreamParser;
      
      if (!M3UStreamParserModule) {
        addLog('❌ Native module M3UStreamParser not found', 'error');
        addLog('Available modules: ' + Object.keys(NativeModules).slice(0, 10).join(', '), 'warn');
        setResults({
          success: false,
          error: 'Native module not found',
        });
        setTesting(false);
        return;
      }
      addLog('✓ Native module M3UStreamParser found', 'success');

      // Step 3: Check parseM3U method
      if (typeof M3UStreamParserModule.parseM3U !== 'function') {
        addLog('❌ parseM3U method not found', 'error');
        addLog('Available methods: ' + Object.keys(M3UStreamParserModule).join(', '), 'warn');
        setResults({
          success: false,
          error: 'parseM3U method not found',
        });
        setTesting(false);
        return;
      }
      addLog('✓ parseM3U method found', 'success');

      // Step 4: Validate URL
      addLog('Validating URL format...', 'info');
      try {
        new URL(testUrl);
        addLog('✓ URL format is valid', 'success');
      } catch (e) {
        addLog('❌ Invalid URL format: ' + e.message, 'error');
        setTesting(false);
        return;
      }

      // Step 5: Call native module
      addLog('Calling native parseM3U method...', 'info');
      const startTime = Date.now();
      
      const result = await M3UStreamParserModule.parseM3U(testUrl);
      
      const duration = Date.now() - startTime;
      addLog(`✓ Native call completed in ${duration}ms`, 'success');

      // Step 6: Display results
      addLog('Results:', 'info');
      addLog(`  Success: ${result.success}`, 'info');
      
      if (result.stats) {
        addLog(`  Total items: ${result.stats.total}`, 'info');
        addLog(`  Channels: ${result.stats.channels}`, 'info');
        addLog(`  Movies: ${result.stats.movies}`, 'info');
        addLog(`  Series: ${result.stats.series}`, 'info');
        addLog(`  Errors: ${result.stats.errors}`, 'info');
        addLog(`  Duration: ${result.stats.durationMs}ms`, 'info');
      }

      if (result.error) {
        addLog(`  Error: ${result.error}`, 'error');
      }

      setResults({
        success: true,
        ...result,
        totalTime: duration,
      });

      addLog('✅ Test completed successfully!', 'success');
    } catch (error) {
      addLog(`❌ Test failed: ${error.message}`, 'error');
      if (error.stack) {
        addLog(`Stack: ${error.stack.substring(0, 200)}...`, 'error');
      }
      setResults({
        success: false,
        error: error.message,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleCopyLogs = async () => {
    const logsText = logs.map((log) => log.message).join('\n');
    
    try {
      await Share.share({
        message: logsText,
        title: 'iOS Parser Logs',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to copy logs: ' + error.message);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setResults(null);
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'success':
        return colors.success.main || '#10b981';
      case 'error':
        return colors.error.main || '#ef4444';
      case 'progress':
        return colors.primary.purple;
      default:
        return colors.text.primary;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Ionicons name="flask-outline" size={24} color={colors.text.primary} />
            <Text style={styles.title}>iOS Native Stream Test</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* URL Input */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>M3U Test URL:</Text>
          <TextInput
            style={styles.urlInput}
            placeholder="Enter M3U playlist URL"
            placeholderTextColor={colors.text.muted}
            value={testUrl}
            onChangeText={setTestUrl}
            editable={!testing}
            multiline
            numberOfLines={2}
          />
          <TouchableOpacity
            style={[styles.testButton, testing && styles.testButtonDisabled]}
            onPress={handleRunTest}
            disabled={testing}
          >
            {testing ? (
              <>
                <ActivityIndicator size="small" color={colors.text.primary} />
                <Text style={styles.testButtonText}>Testing...</Text>
              </>
            ) : (
              <>
                <Ionicons name="play-circle" size={18} color={colors.text.primary} />
                <Text style={styles.testButtonText}>Run Test</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Logs Section */}
        <View style={styles.logsContainer}>
          <View style={styles.logsHeader}>
            <Text style={styles.logsTitle}>Live Logs ({logs.length})</Text>
            <View style={styles.logActions}>
              <TouchableOpacity
                style={styles.logActionButton}
                onPress={handleCopyLogs}
                disabled={logs.length === 0}
              >
                <Ionicons
                  name="copy"
                  size={18}
                  color={logs.length > 0 ? colors.primary.purple : colors.text.muted}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.logActionButton}
                onPress={handleShareLogs}
                disabled={logs.length === 0}
              >
                <Ionicons
                  name="share-social"
                  size={18}
                  color={logs.length > 0 ? colors.primary.purple : colors.text.muted}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.logActionButton}
                onPress={clearLogs}
                disabled={logs.length === 0}
              >
                <Ionicons
                  name="trash"
                  size={18}
                  color={logs.length > 0 ? colors.error.main : colors.text.muted}
                />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.logsList}
            showsVerticalScrollIndicator={false}
          >
            {logs.length === 0 ? (
              <Text style={styles.emptyLogsText}>Logs will appear here...</Text>
            ) : (
              logs.map((log, index) => (
                <Text
                  key={index}
                  style={[styles.logLine, { color: getLogColor(log.type) }]}
                >
                  {log.message}
                </Text>
              ))
            )}
          </ScrollView>
        </View>

        {/* Results Section */}
        {results && (
          <View style={[styles.resultsContainer, results.success ? styles.resultSuccess : styles.resultError]}>
            <Text style={styles.resultsTitle}>
              {results.success ? '✅ Test Passed' : '❌ Test Failed'}
            </Text>
            {results.success ? (
              <>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Items Parsed:</Text>
                  <Text style={styles.resultValue}>{results.itemCount}</Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Channels:</Text>
                  <Text style={styles.resultValue}>{results.stats.channels}</Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Movies:</Text>
                  <Text style={styles.resultValue}>{results.stats.movies}</Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Series:</Text>
                  <Text style={styles.resultValue}>{results.stats.series}</Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Total Time:</Text>
                  <Text style={styles.resultValue}>{(results.totalTime / 1000).toFixed(2)}s</Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Speed:</Text>
                  <Text style={styles.resultValue}>{results.speed}ms/item</Text>
                </View>
              </>
            ) : (
              <Text style={styles.resultError}>{results.error}</Text>
            )}
          </View>
        )}

        {/* Bottom Actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSecondary]}
            onPress={onClose}
          >
            <Text style={styles.actionButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.slate900,
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.slate800,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing.sm,
  },
  inputSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.slate800,
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  urlInput: {
    backgroundColor: colors.neutral.slate800,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.neutral.slate700,
    fontSize: fontSizes.sm,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary.purple,
    borderRadius: 8,
    paddingVertical: spacing.md,
  },
  testButtonDisabled: {
    opacity: 0.6,
  },
  testButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  logsContainer: {
    flex: 1,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.neutral.slate800,
    borderWidth: 1,
    borderColor: colors.neutral.slate700,
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.slate700,
  },
  logsTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  logActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  logActionButton: {
    padding: spacing.xs,
  },
  logsList: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: 'monospace',
  },
  logLine: {
    fontSize: fontSizes.xs,
    fontFamily: 'monospace',
    lineHeight: 18,
    marginVertical: 2,
  },
  emptyLogsText: {
    fontSize: fontSizes.sm,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  resultsContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  resultSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  resultError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  resultsTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.xs,
  },
  resultLabel: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
  },
  resultValue: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.primary.purple,
  },
  resultErrorText: {
    fontSize: fontSizes.sm,
    color: colors.error.main,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.slate800,
  },
  actionButton: {
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonSecondary: {
    backgroundColor: colors.neutral.slate800,
    borderWidth: 1,
    borderColor: colors.neutral.slate700,
  },
  actionButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
});

export default NativeStreamTestModal;
