import 'react-native-gesture-handler';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from './src/theme/colors';

/**
 * Minimal App for debugging black screen issue
 * This version removes all providers and contexts to identify the culprit
 */
export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>OnviTV Initialized</Text>
      <Text style={styles.subtitle}>Check console for errors</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.slate900,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary.purple,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
});
