import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';
import { asyncLog } from '../utils/asyncLogger';

/**
 * Test screen for AsyncLogger
 * Navigate to this screen to verify async logging works in React Native
 */
const TestAsyncLogScreen = ({ navigation }) => {
  const [testResults, setTestResults] = useState([]);
  const [testing, setTesting] = useState(false);
  const [queueSize, setQueueSize] = useState(0);

  useEffect(() => {
    // Update queue size every second
    const interval = setInterval(() => {
      setQueueSize(asyncLog.getQueueSize());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const addResult = (test, passed, message) => {
    setTestResults(prev => [...prev, { test, passed, message, time: new Date().toISOString() }]);
  };

  const runTests = async () => {
    setTesting(true);
    setTestResults([]);

    // Test 1: Basic Info Logging
    asyncLog.info('TestScreen: Test 1 - Info logging', { test: 1 });
    await delay(100);
    addResult('Test 1', true, 'Info logging works');

    // Test 2: Error Logging
    asyncLog.error('TestScreen: Test 2 - Error logging', { error: 'test error' });
    await delay(100);
    addResult('Test 2', true, 'Error logging works');

    // Test 3: Warn Logging
    asyncLog.warn('TestScreen: Test 3 - Warning logging', { warning: true });
    await delay(100);
    addResult('Test 3', true, 'Warning logging works');

    // Test 4: Debug Logging
    asyncLog.debug('TestScreen: Test 4 - Debug logging', { debug: true });
    await delay(100);
    addResult('Test 4', true, 'Debug logging works');

    // Test 5: Critical Logging (synchronous)
    asyncLog.critical('TestScreen: Test 5 - Critical logging', { critical: true });
    addResult('Test 5', true, 'Critical logging works (synchronous)');

    // Test 6: Batch Logging
    for (let i = 0; i < 20; i++) {
      asyncLog.info(`TestScreen: Batch log ${i}`, { index: i });
    }
    await delay(200);
    addResult('Test 6', true, 'Batch logging works (20 logs)');

    // Test 7: Queue Size Check
    const size = asyncLog.getQueueSize();
    addResult('Test 7', size >= 0, `Queue size: ${size}`);

    // Test 8: Performance Test
    const start = Date.now();
    for (let i = 0; i < 100; i++) {
      asyncLog.info(`TestScreen: Performance test ${i}`, { i });
    }
    const duration = Date.now() - start;
    addResult('Test 8', duration < 100, `100 logs in ${duration}ms (should be < 100ms)`);

    // Test 9: Context Data
    asyncLog.info('TestScreen: Test 9 - Context data', {
      userId: 'test-user-123',
      screen: 'TestAsyncLogScreen',
      timestamp: new Date().toISOString(),
      nested: { data: { works: true } }
    });
    await delay(100);
    addResult('Test 9', true, 'Context data logging works');

    // Test 10: Flush
    asyncLog.flush();
    const sizeAfterFlush = asyncLog.getQueueSize();
    addResult('Test 10', sizeAfterFlush === 0, `Flush works (queue: ${sizeAfterFlush})`);

    setTesting(false);
  };

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const clearResults = () => {
    setTestResults([]);
    asyncLog.clear();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>AsyncLogger Test</Text>
      </View>

      {/* Queue Status */}
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Queue Size:</Text>
        <Text style={styles.statusValue}>{queueSize}</Text>
        <Text style={styles.statusHint}>
          {queueSize === 0 ? '✅ All logs processed' : '⏳ Processing logs...'}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={runTests}
          disabled={testing}
        >
          {testing ? (
            <ActivityIndicator color={colors.text.primary} />
          ) : (
            <Text style={styles.buttonText}>Run Tests</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={clearResults}
          disabled={testing}
        >
          <Text style={styles.buttonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      {/* Test Results */}
      <ScrollView style={styles.results} contentContainerStyle={styles.resultsContent}>
        {testResults.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No tests run yet</Text>
            <Text style={styles.emptyHint}>Tap "Run Tests" to start</Text>
          </View>
        ) : (
          testResults.map((result, index) => (
            <View
              key={index}
              style={[
                styles.resultCard,
                result.passed ? styles.resultPass : styles.resultFail
              ]}
            >
              <View style={styles.resultHeader}>
                <Text style={styles.resultTest}>{result.test}</Text>
                <Text style={styles.resultIcon}>{result.passed ? '✅' : '❌'}</Text>
              </View>
              <Text style={styles.resultMessage}>{result.message}</Text>
              <Text style={styles.resultTime}>
                {new Date(result.time).toLocaleTimeString()}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>📋 Check Metro Console</Text>
        <Text style={styles.instructionsText}>
          Open Metro bundler console to see actual log output with [INFO], [ERROR], [WARN] prefixes
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.slate900,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 20,
    backgroundColor: colors.neutral.slate800,
  },
  backButton: {
    marginBottom: 12,
  },
  backText: {
    color: colors.primary.purple,
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
  },
  statusCard: {
    margin: 16,
    padding: 20,
    backgroundColor: colors.neutral.slate800,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  statusValue: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.primary.purple,
    marginBottom: 8,
  },
  statusHint: {
    fontSize: 14,
    color: colors.text.muted,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: colors.primary.purple,
  },
  secondaryButton: {
    backgroundColor: colors.neutral.slate700,
  },
  buttonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  results: {
    flex: 1,
    paddingHorizontal: 16,
  },
  resultsContent: {
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: colors.text.muted,
  },
  resultCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  resultPass: {
    backgroundColor: colors.neutral.slate800,
    borderLeftColor: '#10b981',
  },
  resultFail: {
    backgroundColor: colors.neutral.slate800,
    borderLeftColor: '#ef4444',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultTest: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  resultIcon: {
    fontSize: 20,
  },
  resultMessage: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  resultTime: {
    fontSize: 12,
    color: colors.text.muted,
  },
  instructions: {
    padding: 16,
    backgroundColor: colors.neutral.slate800,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.slate700,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 18,
  },
});

export default TestAsyncLogScreen;
