import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { colors } from '../theme/colors';

export default function DebugScreen({ error, errorInfo }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🔴 App Initialization Error</Text>
        
        {error && (
          <View style={styles.section}>
            <Text style={styles.label}>Error:</Text>
            <Text style={styles.errorText}>{String(error)}</Text>
          </View>
        )}
        
        {errorInfo && (
          <View style={styles.section}>
            <Text style={styles.label}>Stack:</Text>
            <Text style={styles.stackText}>{errorInfo.componentStack}</Text>
          </View>
        )}
        
        <Text style={styles.hint}>
          Check console logs for more details.{'\n'}
          Try force-closing and reopening the app.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.slate900,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.error,
    marginBottom: 20,
  },
  section: {
    marginBottom: 15,
    backgroundColor: colors.neutral.slate800,
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  label: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '600',
    marginBottom: 5,
  },
  errorText: {
    fontSize: 13,
    color: colors.text.primary,
    fontFamily: 'monospace',
  },
  stackText: {
    fontSize: 11,
    color: colors.text.secondary,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  hint: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 30,
    lineHeight: 18,
  },
});
